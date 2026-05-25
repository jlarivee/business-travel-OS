const base = process.env.SMOKE_BASE_URL || 'http://localhost:3000';

async function request(path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${path} failed ${res.status}: ${body}`);
  }
  return res.json();
}

const health = await request('/api/health');
if (!health.ok) throw new Error('health failed');

const profile = await request('/api/profile');
if (!profile.profile?.homeAirports?.includes('JFK')) throw new Error('profile seed missing JFK');

const search = await request('/api/search/flights', {
  method: 'POST',
  body: JSON.stringify({
    originOptions: ['JFK', 'EWR'],
    destinationOptions: ['LHR'],
    departDate: '2026-09-15',
    returnDate: '2026-09-19',
    cabin: 'business',
    passengers: 1,
  }),
});
if (!Array.isArray(search.results)) throw new Error('search did not return results');

const watch = await request('/api/watches', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Smoke LHR premium watch',
    originSet: ['JFK', 'EWR'],
    destinationSet: ['LHR'],
    departWindowStart: '2026-09-15',
    departWindowEnd: '2026-09-16',
    returnWindowStart: '2026-09-19',
    returnWindowEnd: '2026-09-20',
    cabin: 'business',
    passengers: 1,
    maxPrice: 4000,
  }),
});

const check = await request(`/api/watches/${watch.id}/check-now`, { method: 'POST' });
if (!Number.isFinite(check.created)) throw new Error('watch check missing count');

console.log(JSON.stringify({
  ok: true,
  health: health.database.mode,
  searchResults: search.results.length,
  watchId: watch.id,
  hitsCreated: check.created,
}, null, 2));
