import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const userProfiles = pgTable('user_profile', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  title: text('title'),
  location: text('location'),
  homeAirports: jsonb('home_airports').notNull(),
  defaultCabin: text('default_cabin').notNull().default('business'),
  notifyChannels: jsonb('notify_channels').notNull(),
  reimbursementPolicy: text('reimbursement_policy').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const memberships = pgTable('memberships', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  program: text('program').notNull(),
  accountNumber: text('account_number').notNull().default(''),
  tier: text('tier').notNull().default(''),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const watchedRoutes = pgTable('watched_routes', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  name: text('name').notNull(),
  originSet: jsonb('origin_set').notNull(),
  destinationSet: jsonb('destination_set').notNull(),
  departWindowStart: text('depart_window_start').notNull(),
  departWindowEnd: text('depart_window_end').notNull(),
  returnWindowStart: text('return_window_start'),
  returnWindowEnd: text('return_window_end'),
  cabin: text('cabin').notNull().default('business'),
  passengers: integer('passengers').notNull().default(1),
  maxPrice: numeric('max_price', { precision: 10, scale: 2 }).notNull(),
  active: boolean('active').notNull().default(true),
  notes: text('notes').notNull().default(''),
  lastCheckedAt: timestamp('last_checked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const watchHits = pgTable('watch_hits', {
  id: serial('id').primaryKey(),
  watchId: integer('watch_id').notNull(),
  userId: integer('user_id').notNull(),
  airline: text('airline').notNull(),
  route: text('route').notNull(),
  origin: text('origin').notNull(),
  destination: text('destination').notNull(),
  departDate: text('depart_date').notNull(),
  returnDate: text('return_date'),
  cabin: text('cabin').notNull(),
  premiumFare: numeric('premium_fare', { precision: 10, scale: 2 }).notNull(),
  coachReimbursed: numeric('coach_reimbursed', { precision: 10, scale: 2 }),
  outOfPocket: numeric('out_of_pocket', { precision: 10, scale: 2 }),
  currency: text('currency').notNull().default('USD'),
  sourceUrl: text('source_url').notNull(),
  membershipFit: text('membership_fit').notNull().default(''),
  confidence: text('confidence').notNull().default('research'),
  notes: text('notes').notNull().default(''),
  rawResult: jsonb('raw_result').notNull(),
  notified: boolean('notified').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const searches = pgTable('searches', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  query: text('query').notNull(),
  request: jsonb('request').notNull(),
  results: jsonb('results').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const chatMessages = pgTable('chat_messages', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  toolCalls: jsonb('tool_calls').notNull().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const dailyReviews = pgTable('daily_reviews', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  reviewDate: text('review_date').notNull(),
  summary: text('summary').notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const itineraryItems = pgTable('itinerary_items', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  title: text('title').notNull(),
  city: text('city').notNull().default(''),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  status: text('status').notNull().default('draft'),
  sourceHitId: integer('source_hit_id'),
  notes: text('notes').notNull().default(''),
  payload: jsonb('payload').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
