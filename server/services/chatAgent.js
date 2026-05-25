import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { getAnthropicModel, USER_ID } from '../config.js';
import {
  createChatMessage,
  createWatch,
  listChatMessages,
  listMemberships,
  listWatches,
} from '../db/index.js';
import { searchFlights } from './fareSearch.js';
import { checkWatch } from './watchRunner.js';

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

const toolSchemas = [
  {
    name: 'search_flights',
    description: 'Research premium cabin airfare and coach reimbursement baseline. Returns research leads, not bookable inventory.',
    input_schema: {
      type: 'object',
      properties: {
        originOptions: { type: 'array', items: { type: 'string' } },
        destinationOptions: { type: 'array', items: { type: 'string' } },
        departDate: { type: 'string' },
        returnDate: { type: 'string' },
        cabin: { type: 'string' },
        passengers: { type: 'number' },
      },
      required: ['destinationOptions'],
    },
  },
  {
    name: 'create_watch',
    description: 'Create a fare watch with max premium cabin price threshold.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        originSet: { type: 'array', items: { type: 'string' } },
        destinationSet: { type: 'array', items: { type: 'string' } },
        departWindowStart: { type: 'string' },
        departWindowEnd: { type: 'string' },
        returnWindowStart: { type: 'string' },
        returnWindowEnd: { type: 'string' },
        cabin: { type: 'string' },
        passengers: { type: 'number' },
        maxPrice: { type: 'number' },
        notes: { type: 'string' },
      },
      required: ['destinationSet', 'departWindowStart', 'departWindowEnd', 'maxPrice'],
    },
  },
  {
    name: 'get_watched_routes',
    description: 'List saved fare watches and status.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_memberships',
    description: 'List travel loyalty memberships and notes.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'check_watch_now',
    description: 'Run a saved watch immediately.',
    input_schema: {
      type: 'object',
      properties: { watchId: { type: 'number' } },
      required: ['watchId'],
    },
  },
];

const createWatchSchema = z.object({
  name: z.string().optional(),
  originSet: z.array(z.string()).optional(),
  destinationSet: z.array(z.string()).min(1),
  departWindowStart: z.string(),
  departWindowEnd: z.string(),
  returnWindowStart: z.string().optional(),
  returnWindowEnd: z.string().optional(),
  cabin: z.string().default('business'),
  passengers: z.number().default(1),
  maxPrice: z.number(),
  notes: z.string().optional(),
});

async function runTool(userId, name, input) {
  if (name === 'search_flights') {
    return searchFlights({ ...input, cabin: input.cabin || 'business', passengers: Number(input.passengers || 1) }, { userId });
  }
  if (name === 'create_watch') {
    const parsed = createWatchSchema.parse({ ...input, cabin: input.cabin || 'business' });
    return createWatch(userId, parsed);
  }
  if (name === 'get_watched_routes') {
    return listWatches(userId);
  }
  if (name === 'get_memberships') {
    return listMemberships(userId);
  }
  if (name === 'check_watch_now') {
    const watches = await listWatches(userId);
    const watch = watches.find((item) => item.id === Number(input.watchId));
    if (!watch) throw new Error('Watch not found');
    return checkWatch(watch);
  }
  throw new Error(`Unknown tool ${name}`);
}

function fallbackResponse(message) {
  const lower = message.toLowerCase();
  if (lower.includes('membership')) {
    return 'I can review your memberships from the Profile page. Add tiers and notes there so fare results can rank Emirates, Virgin Atlantic, partner airlines, and domestic fallback options correctly.';
  }
  if (lower.includes('watch')) {
    return 'Create a watch with destination, date window, cabin, and max premium fare. I will show coach reimbursed, premium fare, and your out-of-pocket on every hit.';
  }
  return 'I can research premium cabin fares, create watches, list memberships, and check watches. Fares are research leads, not bookable inventory.';
}

function contentText(content) {
  return content.map((part) => part.type === 'text' ? part.text : '').join('').trim();
}

export async function runChat({ userId = USER_ID, message }) {
  await createChatMessage(userId, 'user', message);

  if (!anthropic) {
    const text = fallbackResponse(message);
    await createChatMessage(userId, 'assistant', text, []);
    return { message: text, toolCalls: [], provider: 'fallback' };
  }

  const history = await listChatMessages(userId);
  const messages = history.slice(-12).map((item) => ({
    role: item.role === 'assistant' ? 'assistant' : 'user',
    content: item.content,
  }));

  const system = [
    'You are the Business Travel OS agent for Josh Larivee, AWS life sciences director, based in Madison CT.',
    'Default to premium cabin and the home airports BDL, PVD, HVN, JFK, LGA, EWR, BOS.',
    'Reference memberships when relevant, especially Emirates Skywards and Virgin Atlantic Flying Club.',
    'Never confuse price difference with Delta Air Lines. Use the labels coach reimbursed, premium fare, and your out-of-pocket.',
    'Direct, short, no fluff. No em dashes.',
    'Do not offer hotels, rail, booking, award pricing, calendar integration, auth, or features the app does not have.',
    'Always state that fares are research leads, not bookable inventory when presenting search results.',
  ].join('\n');

  let response = await anthropic.messages.create({
    model: getAnthropicModel(),
    max_tokens: 1600,
    temperature: 0.2,
    system,
    tools: toolSchemas,
    messages,
  });

  const toolCalls = [];
  const conversation = [...messages, { role: 'assistant', content: response.content }];

  while (response.stop_reason === 'tool_use') {
    const toolResults = [];
    for (const part of response.content) {
      if (part.type !== 'tool_use') continue;
      try {
        const result = await runTool(userId, part.name, part.input || {});
        toolCalls.push({ name: part.name, input: part.input, result });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: part.id,
          content: JSON.stringify(result),
        });
      } catch (error) {
        toolCalls.push({ name: part.name, input: part.input, error: error.message });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: part.id,
          is_error: true,
          content: error.message,
        });
      }
    }

    conversation.push({ role: 'user', content: toolResults });
    response = await anthropic.messages.create({
      model: getAnthropicModel(),
      max_tokens: 1600,
      temperature: 0.2,
      system,
      tools: toolSchemas,
      messages: conversation,
    });
    conversation.push({ role: 'assistant', content: response.content });
  }

  const text = contentText(response.content) || 'Done.';
  await createChatMessage(userId, 'assistant', text, toolCalls);
  return { message: text, toolCalls, provider: 'anthropic' };
}

export { toolSchemas };
