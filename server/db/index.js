import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, desc, eq } from 'drizzle-orm';
import {
  chatMessages,
  dailyReviews,
  itineraryItems,
  memberships,
  searches,
  userProfiles,
  watchedRoutes,
  watchHits,
} from './schema.js';
import { DEFAULT_HOME_AIRPORTS, DEFAULT_MEMBERSHIPS, USER_ID } from '../config.js';

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
let pool = null;
let db = null;

if (hasDatabaseUrl) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  db = drizzle(pool);
}

const memory = {
  userProfiles: [],
  memberships: [],
  watchedRoutes: [],
  watchHits: [],
  searches: [],
  chatMessages: [],
  dailyReviews: [],
  itineraryItems: [],
  ids: {
    memberships: 1,
    watchedRoutes: 1,
    watchHits: 1,
    searches: 1,
    chatMessages: 1,
    dailyReviews: 1,
    itineraryItems: 1,
  },
};

function now() {
  return new Date();
}

function asNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  return Number(value);
}

function normalizeWatch(row) {
  if (!row) return row;
  return {
    ...row,
    maxPrice: asNumber(row.maxPrice ?? row.max_price),
    active: row.active !== false,
  };
}

function normalizeHit(row) {
  if (!row) return row;
  return {
    ...row,
    premiumFare: asNumber(row.premiumFare ?? row.premium_fare),
    coachReimbursed: asNumber(row.coachReimbursed ?? row.coach_reimbursed),
    outOfPocket: asNumber(row.outOfPocket ?? row.out_of_pocket),
  };
}

async function createTables() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      title TEXT,
      location TEXT,
      home_airports JSONB NOT NULL,
      default_cabin TEXT NOT NULL DEFAULT 'business',
      notify_channels JSONB NOT NULL,
      reimbursement_policy TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS memberships (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      program TEXT NOT NULL,
      account_number TEXT NOT NULL DEFAULT '',
      tier TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS watched_routes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      origin_set JSONB NOT NULL,
      destination_set JSONB NOT NULL,
      depart_window_start TEXT NOT NULL,
      depart_window_end TEXT NOT NULL,
      return_window_start TEXT,
      return_window_end TEXT,
      cabin TEXT NOT NULL DEFAULT 'business',
      passengers INTEGER NOT NULL DEFAULT 1,
      max_price NUMERIC(10,2) NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      notes TEXT NOT NULL DEFAULT '',
      last_checked_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS watch_hits (
      id SERIAL PRIMARY KEY,
      watch_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      airline TEXT NOT NULL,
      route TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      depart_date TEXT NOT NULL,
      return_date TEXT,
      cabin TEXT NOT NULL,
      premium_fare NUMERIC(10,2) NOT NULL,
      coach_reimbursed NUMERIC(10,2),
      out_of_pocket NUMERIC(10,2),
      currency TEXT NOT NULL DEFAULT 'USD',
      source_url TEXT NOT NULL,
      membership_fit TEXT NOT NULL DEFAULT '',
      confidence TEXT NOT NULL DEFAULT 'research',
      notes TEXT NOT NULL DEFAULT '',
      raw_result JSONB NOT NULL,
      notified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS searches (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      query TEXT NOT NULL,
      request JSONB NOT NULL,
      results JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tool_calls JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_reviews (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      review_date TEXT NOT NULL,
      summary TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS itinerary_items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT '',
      start_date TEXT NOT NULL,
      end_date TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      source_hit_id INTEGER,
      notes TEXT NOT NULL DEFAULT '',
      payload JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
}

async function seedMemory() {
  if (!memory.userProfiles.some((profile) => profile.id === USER_ID)) {
    memory.userProfiles.push({
      id: USER_ID,
      name: 'Josh Larivee',
      title: 'AWS life sciences director',
      location: 'Madison, CT',
      homeAirports: DEFAULT_HOME_AIRPORTS,
      defaultCabin: 'business',
      notifyChannels: { email: false, sms: false, console: true },
      reimbursementPolicy: 'Coach class is reimbursed. Show coach reimbursed, premium fare, and your out-of-pocket for premium cabin options.',
      createdAt: now(),
      updatedAt: now(),
    });
  }
  if (!memory.memberships.some((membership) => membership.userId === USER_ID)) {
    for (const membership of DEFAULT_MEMBERSHIPS) {
      memory.memberships.push({
        id: memory.ids.memberships++,
        userId: USER_ID,
        ...membership,
        createdAt: now(),
        updatedAt: now(),
      });
    }
  }
}

async function seedDatabase() {
  if (!db) {
    await seedMemory();
    return;
  }

  const existingProfiles = await db.select().from(userProfiles).where(eq(userProfiles.id, USER_ID));
  if (existingProfiles.length === 0) {
    await db.insert(userProfiles).values({
      id: USER_ID,
      name: 'Josh Larivee',
      title: 'AWS life sciences director',
      location: 'Madison, CT',
      homeAirports: DEFAULT_HOME_AIRPORTS,
      defaultCabin: 'business',
      notifyChannels: { email: false, sms: false, console: true },
      reimbursementPolicy: 'Coach class is reimbursed. Show coach reimbursed, premium fare, and your out-of-pocket for premium cabin options.',
    });
  }

  const existingMemberships = await db.select().from(memberships).where(eq(memberships.userId, USER_ID));
  if (existingMemberships.length === 0) {
    await db.insert(memberships).values(DEFAULT_MEMBERSHIPS.map((membership) => ({
      userId: USER_ID,
      ...membership,
    })));
  }
}

export async function initDatabase() {
  await createTables();
  await seedDatabase();
}

export function databaseStatus() {
  return {
    configured: hasDatabaseUrl,
    mode: hasDatabaseUrl ? 'postgres' : 'memory',
  };
}

export async function getProfile(userId = USER_ID) {
  if (!db) return memory.userProfiles.find((profile) => profile.id === userId);
  const rows = await db.select().from(userProfiles).where(eq(userProfiles.id, userId));
  return rows[0] || null;
}

export async function updateProfile(userId, data) {
  const patch = {
    name: data.name,
    title: data.title,
    location: data.location,
    homeAirports: data.homeAirports,
    defaultCabin: data.defaultCabin,
    notifyChannels: data.notifyChannels,
    reimbursementPolicy: data.reimbursementPolicy,
    updatedAt: now(),
  };
  Object.keys(patch).forEach((key) => patch[key] === undefined && delete patch[key]);

  if (!db) {
    const index = memory.userProfiles.findIndex((profile) => profile.id === userId);
    memory.userProfiles[index] = { ...memory.userProfiles[index], ...patch };
    return memory.userProfiles[index];
  }
  const rows = await db.update(userProfiles).set(patch).where(eq(userProfiles.id, userId)).returning();
  return rows[0];
}

export async function listMemberships(userId = USER_ID) {
  if (!db) return memory.memberships.filter((membership) => membership.userId === userId);
  return db.select().from(memberships).where(eq(memberships.userId, userId)).orderBy(memberships.program);
}

export async function createMembership(userId, data) {
  const row = {
    userId,
    program: data.program,
    accountNumber: data.accountNumber || '',
    tier: data.tier || '',
    notes: data.notes || '',
  };
  if (!db) {
    const record = { id: memory.ids.memberships++, ...row, createdAt: now(), updatedAt: now() };
    memory.memberships.push(record);
    return record;
  }
  const rows = await db.insert(memberships).values(row).returning();
  return rows[0];
}

export async function updateMembership(userId, id, data) {
  const patch = {
    program: data.program,
    accountNumber: data.accountNumber,
    tier: data.tier,
    notes: data.notes,
    updatedAt: now(),
  };
  Object.keys(patch).forEach((key) => patch[key] === undefined && delete patch[key]);
  if (!db) {
    const index = memory.memberships.findIndex((membership) => membership.id === Number(id) && membership.userId === userId);
    if (index < 0) return null;
    memory.memberships[index] = { ...memory.memberships[index], ...patch };
    return memory.memberships[index];
  }
  const rows = await db.update(memberships)
    .set(patch)
    .where(and(eq(memberships.id, Number(id)), eq(memberships.userId, userId)))
    .returning();
  return rows[0] || null;
}

export async function deleteMembership(userId, id) {
  if (!db) {
    const before = memory.memberships.length;
    memory.memberships = memory.memberships.filter((membership) => !(membership.id === Number(id) && membership.userId === userId));
    return before !== memory.memberships.length;
  }
  const rows = await db.delete(memberships)
    .where(and(eq(memberships.id, Number(id)), eq(memberships.userId, userId)))
    .returning();
  return rows.length > 0;
}

export async function listWatches(userId = USER_ID) {
  if (!db) return memory.watchedRoutes.filter((watch) => watch.userId === userId).map(normalizeWatch);
  const rows = await db.select().from(watchedRoutes).where(eq(watchedRoutes.userId, userId)).orderBy(desc(watchedRoutes.createdAt));
  return rows.map(normalizeWatch);
}

export async function listActiveWatches() {
  if (!db) return memory.watchedRoutes.filter((watch) => watch.active).map(normalizeWatch);
  const rows = await db.select().from(watchedRoutes).where(eq(watchedRoutes.active, true));
  return rows.map(normalizeWatch);
}

export async function getWatch(userId, id) {
  if (!db) return normalizeWatch(memory.watchedRoutes.find((watch) => watch.userId === userId && watch.id === Number(id)));
  const rows = await db.select().from(watchedRoutes).where(and(eq(watchedRoutes.userId, userId), eq(watchedRoutes.id, Number(id))));
  return normalizeWatch(rows[0] || null);
}

export async function createWatch(userId, data) {
  const row = {
    userId,
    name: data.name || `${(data.destinationSet || []).join(', ')} watch`,
    originSet: data.originSet || DEFAULT_HOME_AIRPORTS,
    destinationSet: data.destinationSet || [],
    departWindowStart: data.departWindowStart,
    departWindowEnd: data.departWindowEnd,
    returnWindowStart: data.returnWindowStart || null,
    returnWindowEnd: data.returnWindowEnd || null,
    cabin: data.cabin || 'business',
    passengers: Number(data.passengers || 1),
    maxPrice: String(data.maxPrice || 0),
    active: data.active !== false,
    notes: data.notes || '',
  };
  if (!db) {
    const record = normalizeWatch({
      id: memory.ids.watchedRoutes++,
      ...row,
      maxPrice: Number(row.maxPrice),
      createdAt: now(),
      updatedAt: now(),
      lastCheckedAt: null,
    });
    memory.watchedRoutes.push(record);
    return record;
  }
  const rows = await db.insert(watchedRoutes).values(row).returning();
  return normalizeWatch(rows[0]);
}

export async function updateWatch(userId, id, data) {
  const patch = {
    name: data.name,
    originSet: data.originSet,
    destinationSet: data.destinationSet,
    departWindowStart: data.departWindowStart,
    departWindowEnd: data.departWindowEnd,
    returnWindowStart: data.returnWindowStart,
    returnWindowEnd: data.returnWindowEnd,
    cabin: data.cabin,
    passengers: data.passengers === undefined ? undefined : Number(data.passengers),
    maxPrice: data.maxPrice === undefined ? undefined : String(data.maxPrice),
    active: data.active,
    notes: data.notes,
    lastCheckedAt: data.lastCheckedAt,
    updatedAt: now(),
  };
  Object.keys(patch).forEach((key) => patch[key] === undefined && delete patch[key]);
  if (!db) {
    const index = memory.watchedRoutes.findIndex((watch) => watch.userId === userId && watch.id === Number(id));
    if (index < 0) return null;
    memory.watchedRoutes[index] = normalizeWatch({ ...memory.watchedRoutes[index], ...patch, maxPrice: patch.maxPrice ? Number(patch.maxPrice) : memory.watchedRoutes[index].maxPrice });
    return memory.watchedRoutes[index];
  }
  const rows = await db.update(watchedRoutes)
    .set(patch)
    .where(and(eq(watchedRoutes.userId, userId), eq(watchedRoutes.id, Number(id))))
    .returning();
  return normalizeWatch(rows[0] || null);
}

export async function deleteWatch(userId, id) {
  if (!db) {
    const before = memory.watchedRoutes.length;
    memory.watchedRoutes = memory.watchedRoutes.filter((watch) => !(watch.userId === userId && watch.id === Number(id)));
    memory.watchHits = memory.watchHits.filter((hit) => hit.watchId !== Number(id));
    return before !== memory.watchedRoutes.length;
  }
  await db.delete(watchHits).where(eq(watchHits.watchId, Number(id)));
  const rows = await db.delete(watchedRoutes)
    .where(and(eq(watchedRoutes.userId, userId), eq(watchedRoutes.id, Number(id))))
    .returning();
  return rows.length > 0;
}

export async function createWatchHit(userId, watchId, result) {
  const row = {
    watchId: Number(watchId),
    userId,
    airline: result.airline,
    route: result.route,
    origin: result.origin,
    destination: result.destination,
    departDate: result.departDate,
    returnDate: result.returnDate || null,
    cabin: result.cabin,
    premiumFare: String(result.premiumFare || result.price || 0),
    coachReimbursed: result.coachReimbursed === null || result.coachReimbursed === undefined ? null : String(result.coachReimbursed),
    outOfPocket: result.outOfPocket === null || result.outOfPocket === undefined ? null : String(result.outOfPocket),
    currency: result.currency || 'USD',
    sourceUrl: result.sourceUrl,
    membershipFit: result.membershipFit || '',
    confidence: result.confidence || 'research',
    notes: result.notes || '',
    rawResult: result,
  };
  if (!db) {
    const record = normalizeHit({
      id: memory.ids.watchHits++,
      ...row,
      premiumFare: Number(row.premiumFare),
      coachReimbursed: row.coachReimbursed ? Number(row.coachReimbursed) : null,
      outOfPocket: row.outOfPocket ? Number(row.outOfPocket) : null,
      notified: false,
      createdAt: now(),
    });
    memory.watchHits.push(record);
    return record;
  }
  const rows = await db.insert(watchHits).values(row).returning();
  return normalizeHit(rows[0]);
}

export async function listWatchHits(userId = USER_ID, watchId = null) {
  if (!db) {
    return memory.watchHits
      .filter((hit) => hit.userId === userId && (!watchId || hit.watchId === Number(watchId)))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(normalizeHit);
  }
  const where = watchId
    ? and(eq(watchHits.userId, userId), eq(watchHits.watchId, Number(watchId)))
    : eq(watchHits.userId, userId);
  const rows = await db.select().from(watchHits).where(where).orderBy(desc(watchHits.createdAt));
  return rows.map(normalizeHit);
}

export async function createSearch(userId, request, results) {
  const row = {
    userId,
    query: `${request.originOptions?.join(',') || ''}-${request.destinationOptions?.join(',') || ''}`,
    request,
    results,
  };
  if (!db) {
    const record = { id: memory.ids.searches++, ...row, createdAt: now() };
    memory.searches.push(record);
    return record;
  }
  const rows = await db.insert(searches).values(row).returning();
  return rows[0];
}

export async function listSearches(userId = USER_ID) {
  if (!db) return memory.searches.filter((search) => search.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return db.select().from(searches).where(eq(searches.userId, userId)).orderBy(desc(searches.createdAt));
}

export async function createChatMessage(userId, role, content, toolCalls = []) {
  const row = { userId, role, content, toolCalls };
  if (!db) {
    const record = { id: memory.ids.chatMessages++, ...row, createdAt: now() };
    memory.chatMessages.push(record);
    return record;
  }
  const rows = await db.insert(chatMessages).values(row).returning();
  return rows[0];
}

export async function listChatMessages(userId = USER_ID) {
  if (!db) return memory.chatMessages.filter((message) => message.userId === userId).sort((a, b) => a.id - b.id);
  return db.select().from(chatMessages).where(eq(chatMessages.userId, userId)).orderBy(chatMessages.createdAt);
}

export async function createDailyReview(userId, payload) {
  const reviewDate = new Date().toISOString().slice(0, 10);
  const row = { userId, reviewDate, summary: payload.summary, payload };
  if (!db) {
    const record = { id: memory.ids.dailyReviews++, ...row, createdAt: now() };
    memory.dailyReviews.push(record);
    return record;
  }
  const rows = await db.insert(dailyReviews).values(row).returning();
  return rows[0];
}

export async function listDailyReviews(userId = USER_ID) {
  if (!db) return memory.dailyReviews.filter((review) => review.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return db.select().from(dailyReviews).where(eq(dailyReviews.userId, userId)).orderBy(desc(dailyReviews.createdAt));
}

export async function createItineraryItem(userId, data) {
  const row = {
    userId,
    title: data.title,
    city: data.city || '',
    startDate: data.startDate,
    endDate: data.endDate || null,
    status: data.status || 'draft',
    sourceHitId: data.sourceHitId || null,
    notes: data.notes || '',
    payload: data.payload || {},
  };
  if (!db) {
    const record = { id: memory.ids.itineraryItems++, ...row, createdAt: now(), updatedAt: now() };
    memory.itineraryItems.push(record);
    return record;
  }
  const rows = await db.insert(itineraryItems).values(row).returning();
  return rows[0];
}

export async function listItineraryItems(userId = USER_ID) {
  if (!db) return memory.itineraryItems.filter((item) => item.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return db.select().from(itineraryItems).where(eq(itineraryItems.userId, userId)).orderBy(desc(itineraryItems.createdAt));
}
