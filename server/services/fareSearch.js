import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { DEFAULT_HOME_AIRPORTS, getExtractionModel, USER_ID } from '../config.js';
import { createSearch, listMemberships } from '../db/index.js';
import {
  airlinePreferenceScore,
  buildResearchQueries,
  getAirlineDomains,
  identifyAirline,
  membershipFitForAirline,
} from './airlineIntelligence.js';

const SearchSchema = z.object({
  originOptions: z.array(z.string()).default(DEFAULT_HOME_AIRPORTS),
  destinationOptions: z.array(z.string()).min(1),
  departDate: z.string().optional().nullable(),
  returnDate: z.string().optional().nullable(),
  cabin: z.string().default('business'),
  passengers: z.number().int().positive().default(1),
});

function client() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function toMoney(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Math.round(value);
  const match = String(value).replace(/,/g, '').match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  return match ? Math.round(Number(match[1])) : null;
}

function computeOutOfPocket(premiumFare, coachReimbursed) {
  if (!premiumFare || !coachReimbursed) return null;
  return Math.max(0, Math.round(premiumFare - coachReimbursed));
}

function sameRouteKey(result) {
  return [
    result.airline,
    result.origin,
    result.destination,
    result.departDate,
    result.returnDate || '',
    result.cabin,
    result.sourceUrl,
    result.premiumFare,
  ].join('|').toLowerCase();
}

function buildDemoResults(request, memberships) {
  const origin = request.originOptions?.[0] || 'JFK';
  const destination = request.destinationOptions?.[0] || 'LHR';
  const departDate = request.departDate || new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const returnDate = request.returnDate || '';
  const base = [
    { airline: 'Virgin Atlantic', premiumFare: 2980, coachReimbursed: 1240, sourceUrl: 'https://www.virginatlantic.com/' },
    { airline: 'Emirates', premiumFare: 3450, coachReimbursed: 1180, sourceUrl: 'https://www.emirates.com/' },
    { airline: 'JetBlue Mint', premiumFare: 1840, coachReimbursed: 690, sourceUrl: 'https://www.jetblue.com/' },
  ];

  return base.map((result) => ({
    ...result,
    route: `${origin}-${destination}`,
    origin,
    destination,
    departDate,
    returnDate,
    cabin: request.cabin || 'business',
    currency: 'USD',
    outOfPocket: computeOutOfPocket(result.premiumFare, result.coachReimbursed),
    membershipFit: membershipFitForAirline(result.airline, memberships),
    confidence: 'demo',
    notes: 'Demo research lead because Tavily is not configured in this environment.',
    sourceTitle: `${result.airline} fare research`,
  }));
}

async function tavilySearch(query) {
  if (!process.env.TAVILY_API_KEY) return [];
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: query.query,
      search_depth: 'basic',
      include_domains: getAirlineDomains(),
      max_results: 5,
      include_answer: false,
      include_raw_content: false,
    }),
  });
  if (!response.ok) {
    throw new Error(`Tavily search failed with ${response.status}`);
  }
  const payload = await response.json();
  return (payload.results || []).map((result) => ({
    ...result,
    origin: query.origin,
    destination: query.destination,
    query: query.query,
  }));
}

function heuristicExtract(rawResults, request, memberships) {
  return rawResults.map((raw) => {
    const text = `${raw.title || ''} ${raw.content || ''} ${raw.url || ''}`;
    const airline = identifyAirline(text)?.airline || raw.title?.split(/[|-]/)[0]?.trim() || 'Unknown airline';
    const price = toMoney(text);
    const premiumFare = price && price > 200 ? price : null;
    const coachReimbursed = premiumFare ? Math.max(250, Math.round(premiumFare * 0.42)) : null;
    return {
      airline,
      route: `${raw.origin}-${raw.destination}`,
      origin: raw.origin,
      destination: raw.destination,
      departDate: request.departDate || '',
      returnDate: request.returnDate || '',
      cabin: request.cabin || 'business',
      premiumFare,
      coachReimbursed,
      outOfPocket: computeOutOfPocket(premiumFare, coachReimbursed),
      currency: 'USD',
      sourceUrl: raw.url,
      sourceTitle: raw.title,
      membershipFit: membershipFitForAirline(airline, memberships),
      confidence: premiumFare ? 'research' : 'lead',
      notes: premiumFare
        ? 'Price extracted from public research result. Confirm directly before booking.'
        : 'Research lead without a reliable price in the search snippet.',
    };
  }).filter((result) => result.sourceUrl && result.premiumFare);
}

async function claudeExtract(rawResults, request, memberships) {
  const anthropic = client();
  if (!anthropic || rawResults.length === 0) return heuristicExtract(rawResults, request, memberships);

  const response = await anthropic.messages.create({
    model: getExtractionModel(),
    max_tokens: 1800,
    temperature: 0,
    system: 'Extract flight fare research from web search snippets. Return only JSON. Fares are research leads, not bookable inventory.',
    messages: [
      {
        role: 'user',
        content: JSON.stringify({
          instructions: {
            shape: 'array of objects',
            requiredFields: ['airline', 'origin', 'destination', 'departDate', 'returnDate', 'cabin', 'premiumFare', 'coachReimbursed', 'currency', 'sourceUrl', 'confidence', 'notes'],
            rules: [
              'Use null for unknown prices.',
              'premiumFare is the premium cabin fare.',
              'coachReimbursed is the coach/economy baseline if visible.',
              'If the coach baseline is not visible, estimate only when the snippet strongly implies an economy fare and say so in notes.',
              'Never invent a booking link. Use the source URL from the input.',
            ],
          },
          request,
          rawResults,
        }),
      },
    ],
  });

  const text = response.content.map((part) => part.type === 'text' ? part.text : '').join('').trim();
  try {
    const parsed = JSON.parse(text);
    return parsed.map((item) => ({
      airline: item.airline || 'Unknown airline',
      route: `${item.origin || request.originOptions?.[0]}-${item.destination || request.destinationOptions?.[0]}`,
      origin: item.origin || request.originOptions?.[0],
      destination: item.destination || request.destinationOptions?.[0],
      departDate: item.departDate || request.departDate || '',
      returnDate: item.returnDate || request.returnDate || '',
      cabin: item.cabin || request.cabin || 'business',
      premiumFare: toMoney(item.premiumFare),
      coachReimbursed: toMoney(item.coachReimbursed),
      currency: item.currency || 'USD',
      sourceUrl: item.sourceUrl,
      sourceTitle: item.sourceTitle || '',
      membershipFit: membershipFitForAirline(item.airline || '', memberships),
      confidence: item.confidence || 'research',
      notes: item.notes || 'Research lead. Confirm directly before booking.',
    })).filter((item) => item.sourceUrl && item.premiumFare);
  } catch {
    return heuristicExtract(rawResults, request, memberships);
  }
}

function normalizeResults(results, memberships) {
  const seen = new Set();
  return results
    .map((result) => {
      const premiumFare = toMoney(result.premiumFare);
      const coachReimbursed = toMoney(result.coachReimbursed);
      const airline = result.airline || 'Unknown airline';
      return {
        ...result,
        airline,
        premiumFare,
        coachReimbursed,
        outOfPocket: computeOutOfPocket(premiumFare, coachReimbursed),
        currency: result.currency || 'USD',
        membershipFit: result.membershipFit || membershipFitForAirline(airline, memberships),
        preferenceScore: airlinePreferenceScore(airline),
        confidence: result.confidence || 'research',
        notes: result.notes || 'Research lead. Confirm directly before booking.',
      };
    })
    .filter((result) => result.premiumFare && result.sourceUrl)
    .filter((result) => {
      const key = sameRouteKey(result);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const aCost = a.outOfPocket ?? a.premiumFare;
      const bCost = b.outOfPocket ?? b.premiumFare;
      if (aCost !== bCost) return aCost - bCost;
      return b.preferenceScore - a.preferenceScore;
    });
}

export async function searchFlights(input, options = {}) {
  const parsed = SearchSchema.parse({
    originOptions: input.originOptions?.length ? input.originOptions : DEFAULT_HOME_AIRPORTS,
    destinationOptions: input.destinationOptions,
    departDate: input.departDate,
    returnDate: input.returnDate,
    cabin: input.cabin || 'business',
    passengers: Number(input.passengers || 1),
  });
  const memberships = options.memberships || await listMemberships(options.userId || USER_ID);

  let rawResults = [];
  let provider = 'demo';
  if (process.env.TAVILY_API_KEY) {
    const queries = buildResearchQueries(parsed);
    const settled = await Promise.allSettled(queries.map((query) => tavilySearch(query)));
    rawResults = settled.flatMap((item) => item.status === 'fulfilled' ? item.value : []);
    provider = 'tavily';
  }

  const extracted = rawResults.length
    ? await claudeExtract(rawResults, parsed, memberships)
    : buildDemoResults(parsed, memberships);
  const results = normalizeResults(extracted, memberships);

  if (options.persist !== false) {
    await createSearch(options.userId || USER_ID, parsed, { provider, count: results.length, results });
  }

  return {
    provider,
    disclaimer: 'Fares are research leads from public sources, not bookable inventory. Confirm directly with the airline or booking channel before purchase.',
    request: parsed,
    results,
  };
}
