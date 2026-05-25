import cron from 'node-cron';
import { USER_ID } from '../config.js';
import {
  createWatchHit,
  getProfile,
  listActiveWatches,
  listMemberships,
  listWatchHits,
  updateWatch,
} from '../db/index.js';
import { searchFlights } from './fareSearch.js';
import { notifyWatchHit } from './notifications.js';

let cronTask = null;
let lastRun = null;
let lastRunSummary = null;

function qualifies(result, watch) {
  return Number(result.premiumFare || 0) > 0 && Number(result.premiumFare) <= Number(watch.maxPrice);
}

function duplicateHit(existingHits, result) {
  const resultKey = [
    result.airline,
    result.route,
    result.departDate,
    result.returnDate || '',
    result.premiumFare,
    result.sourceUrl,
  ].join('|').toLowerCase();
  return existingHits.some((hit) => [
    hit.airline,
    hit.route,
    hit.departDate,
    hit.returnDate || '',
    hit.premiumFare,
    hit.sourceUrl,
  ].join('|').toLowerCase() === resultKey);
}

export async function checkWatch(watch) {
  const memberships = await listMemberships(watch.userId || USER_ID);
  const search = await searchFlights({
    originOptions: watch.originSet,
    destinationOptions: watch.destinationSet,
    departDate: watch.departWindowStart,
    returnDate: watch.returnWindowStart,
    cabin: watch.cabin,
    passengers: watch.passengers,
  }, {
    userId: watch.userId || USER_ID,
    memberships,
    persist: true,
  });

  const existingHits = await listWatchHits(watch.userId || USER_ID, watch.id);
  const qualifying = search.results.filter((result) => qualifies(result, watch) && !duplicateHit(existingHits, result));
  const profile = await getProfile(watch.userId || USER_ID);
  const created = [];

  for (const result of qualifying) {
    const hit = await createWatchHit(watch.userId || USER_ID, watch.id, result);
    created.push(hit);
    await notifyWatchHit({ hit, watch, profile });
  }

  await updateWatch(watch.userId || USER_ID, watch.id, { lastCheckedAt: new Date() });
  return {
    watchId: watch.id,
    checked: search.results.length,
    created: created.length,
    hits: created,
    provider: search.provider,
  };
}

export async function checkAllWatches() {
  const watches = await listActiveWatches();
  const settled = await Promise.allSettled(watches.map((watch) => checkWatch(watch)));
  lastRun = new Date();
  lastRunSummary = {
    checkedAt: lastRun.toISOString(),
    watches: watches.length,
    created: settled.reduce((sum, item) => sum + (item.status === 'fulfilled' ? item.value.created : 0), 0),
    failures: settled.filter((item) => item.status === 'rejected').length,
    results: settled.map((item) => item.status === 'fulfilled' ? item.value : { error: item.reason?.message || 'Watch check failed' }),
  };
  return lastRunSummary;
}

export function startWatchCron() {
  if (cronTask) return cronTask;
  cronTask = cron.schedule('0 */4 * * *', () => {
    checkAllWatches().catch((error) => {
      console.error('[WATCH_CRON] failed', error.message);
    });
  });
  console.log('[WATCH_CRON] scheduled every 4 hours');
  return cronTask;
}

export function cronStatus() {
  return {
    scheduled: Boolean(cronTask),
    lastRun: lastRun ? lastRun.toISOString() : null,
    lastRunSummary,
  };
}
