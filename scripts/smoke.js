const base = process.env.SMOKE_BASE_URL || 'http://localhost:3000';
let cookie = '';

async function request(path, options = {}) {
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(options.headers || {}),
    },
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    cookie = setCookie.split(';')[0];
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${path} failed ${res.status}: ${body}`);
  }
  return res.json();
}

const health = await request('/api/health');
if (!health.ok) throw new Error('health failed');

const lockedProfile = await fetch(`${base}/api/profile`);
if (lockedProfile.status !== 401 && lockedProfile.status !== 503) {
  throw new Error(`profile should be locked before login, got ${lockedProfile.status}`);
}

const auth = await request('/api/auth/status');
if (!auth.authenticated) {
  await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: process.env.APP_USERNAME || 'josh',
      password: process.env.APP_PASSWORD || 'local-dev-only',
    }),
  });
}

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
