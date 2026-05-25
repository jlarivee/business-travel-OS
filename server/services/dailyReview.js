import { USER_ID } from '../config.js';
import {
  createDailyReview,
  listDailyReviews,
  listSearches,
  listWatchHits,
  listWatches,
} from '../db/index.js';

function money(value) {
  if (value === null || value === undefined) return 'unknown';
  return `$${Number(value).toLocaleString()}`;
}

export async function buildDailyReview(userId = USER_ID) {
  const [watches, hits, searches] = await Promise.all([
    listWatches(userId),
    listWatchHits(userId),
    listSearches(userId),
  ]);

  const activeWatches = watches.filter((watch) => watch.active);
  const recentHits = hits.slice(0, 5);
  const bestHit = [...hits].sort((a, b) => (a.outOfPocket ?? a.premiumFare) - (b.outOfPocket ?? b.premiumFare))[0];
  const staleWatches = activeWatches.filter((watch) => !watch.lastCheckedAt);

  const recommendations = [];
  if (bestHit) {
    recommendations.push(`Best current lead: ${bestHit.airline} ${bestHit.route}, premium ${money(bestHit.premiumFare)}, coach reimbursed ${money(bestHit.coachReimbursed)}, your out-of-pocket ${money(bestHit.outOfPocket)}.`);
  }
  if (staleWatches.length) {
    recommendations.push(`${staleWatches.length} active watch${staleWatches.length === 1 ? '' : 'es'} need a first check.`);
  }
  if (!activeWatches.length) {
    recommendations.push('Create at least one active watch for your next likely business route.');
  }
  if (!recommendations.length) {
    recommendations.push('No urgent fare decisions. Keep watches running.');
  }

  const payload = {
    summary: `${activeWatches.length} active watches, ${recentHits.length} recent fare leads, ${searches.length} saved searches.`,
    activeWatchCount: activeWatches.length,
    recentHits,
    staleWatches,
    recommendations,
  };

  return createDailyReview(userId, payload);
}

export async function getDailyReviews(userId = USER_ID) {
  return listDailyReviews(userId);
}
