import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import express from 'express';
import { z } from 'zod';
import { APP_NAME, envFlag, getAllowedOrigins, redact, USER_ID } from './config.js';
import { authStatus, login, logout, requireAuth } from './auth.js';
import {
  createItineraryItem,
  createMembership,
  createWatch,
  databaseStatus,
  deleteMembership,
  deleteWatch,
  getProfile,
  getWatch,
  initDatabase,
  listItineraryItems,
  listMemberships,
  listSearches,
  listWatchHits,
  listWatches,
  updateMembership,
  updateProfile,
  updateWatch,
} from './db/index.js';
import { runChat } from './services/chatAgent.js';
import { buildDailyReview, getDailyReviews } from './services/dailyReview.js';
import { searchFlights } from './services/fareSearch.js';
import { checkAllWatches, checkWatch, cronStatus, startWatchCron } from './services/watchRunner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT || 3000);
const allowedOrigins = getAllowedOrigins();

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
});
app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.has(origin)) return cb(null, true);
    return cb(new Error('Origin not allowed'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function sendSse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

const FlightSearchSchema = z.object({
  originOptions: z.array(z.string()).optional(),
  destinationOptions: z.array(z.string()).min(1),
  departDate: z.string().optional().nullable(),
  returnDate: z.string().optional().nullable(),
  cabin: z.string().optional(),
  passengers: z.coerce.number().int().positive().optional(),
});

const WatchSchema = z.object({
  name: z.string().optional(),
  originSet: z.array(z.string()).optional(),
  destinationSet: z.array(z.string()).min(1),
  departWindowStart: z.string(),
  departWindowEnd: z.string(),
  returnWindowStart: z.string().optional().nullable(),
  returnWindowEnd: z.string().optional().nullable(),
  cabin: z.string().optional(),
  passengers: z.coerce.number().int().positive().optional(),
  maxPrice: z.coerce.number().positive(),
  active: z.boolean().optional(),
  notes: z.string().optional(),
});

app.get('/api/health', asyncHandler(async (req, res) => {
  res.json({
    ok: true,
    app: APP_NAME,
    database: databaseStatus(),
    services: {
      anthropic: redact(process.env.ANTHROPIC_API_KEY),
      tavily: redact(process.env.TAVILY_API_KEY),
      firecrawl: redact(process.env.FIRECRAWL_API_KEY),
      gmail: envFlag('GMAIL_USER') && envFlag('GMAIL_APP_PASSWORD') ? 'set' : 'not set',
      resend: redact(process.env.RESEND_API_KEY),
      twilio: envFlag('TWILIO_ACCOUNT_SID') && envFlag('TWILIO_AUTH_TOKEN') ? 'set' : 'not set',
      slack: redact(process.env.SLACK_WEBHOOK_URL),
    },
    cron: cronStatus(),
    auth: authStatus(req),
    checkedAt: new Date().toISOString(),
  });
}));

app.get('/api/auth/status', asyncHandler(async (req, res) => {
  res.json(authStatus(req));
}));

app.post('/api/auth/login', login);
app.post('/api/auth/logout', logout);

app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
app.use('/api', requireAuth);

app.get('/api/profile', asyncHandler(async (req, res) => {
  const [profile, memberships, watches, hits, searches, dailyReviews, itinerary] = await Promise.all([
    getProfile(USER_ID),
    listMemberships(USER_ID),
    listWatches(USER_ID),
    listWatchHits(USER_ID),
    listSearches(USER_ID),
    getDailyReviews(USER_ID),
    listItineraryItems(USER_ID),
  ]);
  res.json({ profile, memberships, watches, hits, searches, dailyReviews, itinerary });
}));

app.put('/api/profile', asyncHandler(async (req, res) => {
  const updated = await updateProfile(USER_ID, req.body);
  res.json(updated);
}));

app.get('/api/memberships', asyncHandler(async (req, res) => {
  res.json(await listMemberships(USER_ID));
}));

app.post('/api/memberships', asyncHandler(async (req, res) => {
  const schema = z.object({
    program: z.string().min(1),
    accountNumber: z.string().optional(),
    tier: z.string().optional(),
    notes: z.string().optional(),
  });
  res.status(201).json(await createMembership(USER_ID, schema.parse(req.body)));
}));

app.put('/api/memberships/:id', asyncHandler(async (req, res) => {
  const updated = await updateMembership(USER_ID, req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Membership not found' });
  res.json(updated);
}));

app.delete('/api/memberships/:id', asyncHandler(async (req, res) => {
  const deleted = await deleteMembership(USER_ID, req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Membership not found' });
  res.json({ ok: true });
}));

app.post('/api/search/flights', asyncHandler(async (req, res) => {
  const payload = FlightSearchSchema.parse(req.body);
  const result = await searchFlights(payload, { userId: USER_ID });
  res.json(result);
}));

app.get('/api/searches', asyncHandler(async (req, res) => {
  res.json(await listSearches(USER_ID));
}));

app.get('/api/watches', asyncHandler(async (req, res) => {
  const watches = await listWatches(USER_ID);
  const hits = await listWatchHits(USER_ID);
  res.json({ watches, hits });
}));

app.post('/api/watches', asyncHandler(async (req, res) => {
  const payload = WatchSchema.parse(req.body);
  res.status(201).json(await createWatch(USER_ID, { ...payload, cabin: payload.cabin || 'business' }));
}));

app.put('/api/watches/:id', asyncHandler(async (req, res) => {
  const updated = await updateWatch(USER_ID, req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Watch not found' });
  res.json(updated);
}));

app.delete('/api/watches/:id', asyncHandler(async (req, res) => {
  const deleted = await deleteWatch(USER_ID, req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Watch not found' });
  res.json({ ok: true });
}));

app.post('/api/watches/:id/check-now', asyncHandler(async (req, res) => {
  const watch = await getWatch(USER_ID, req.params.id);
  if (!watch) return res.status(404).json({ error: 'Watch not found' });
  res.json(await checkWatch(watch));
}));

app.post('/api/watches/check-all', asyncHandler(async (req, res) => {
  res.json(await checkAllWatches());
}));

app.get('/api/hits', asyncHandler(async (req, res) => {
  res.json(await listWatchHits(USER_ID));
}));

app.get('/api/daily-reviews', asyncHandler(async (req, res) => {
  res.json(await getDailyReviews(USER_ID));
}));

app.post('/api/daily-reviews', asyncHandler(async (req, res) => {
  res.status(201).json(await buildDailyReview(USER_ID));
}));

app.get('/api/itinerary', asyncHandler(async (req, res) => {
  res.json(await listItineraryItems(USER_ID));
}));

app.post('/api/itinerary', asyncHandler(async (req, res) => {
  const schema = z.object({
    title: z.string().min(1),
    city: z.string().optional(),
    startDate: z.string(),
    endDate: z.string().optional(),
    status: z.string().optional(),
    sourceHitId: z.number().optional(),
    notes: z.string().optional(),
    payload: z.record(z.any()).optional(),
  });
  res.status(201).json(await createItineraryItem(USER_ID, schema.parse(req.body)));
}));

app.post('/api/chat', asyncHandler(async (req, res) => {
  const schema = z.object({ message: z.string().min(1) });
  const { message } = schema.parse(req.body);
  res.json(await runChat({ userId: USER_ID, message }));
}));

app.post('/api/chat/stream', asyncHandler(async (req, res) => {
  const schema = z.object({ message: z.string().min(1) });
  const { message } = schema.parse(req.body);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  sendSse(res, 'start', { ok: true });
  try {
    const result = await runChat({ userId: USER_ID, message });
    sendSse(res, 'message', result);
    sendSse(res, 'end', { ok: true });
  } catch (error) {
    sendSse(res, 'error', { error: error.message });
  } finally {
    res.end();
  }
}));

const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist, {
  etag: true,
  maxAge: '1h',
}));

app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Client build not found. Run npm run build.');
  });
});

app.use((err, req, res, next) => {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: 'Invalid request', details: err.issues });
  }
  if (err.message === 'Origin not allowed') {
    return res.status(403).json({ error: err.message });
  }
  console.error('[API_ERROR]', err.message);
  res.status(500).json({ error: err.message || 'Request failed' });
});

await initDatabase();
startWatchCron();

app.listen(port, '0.0.0.0', () => {
  console.log(`[${APP_NAME}] listening on ${port}`);
});
