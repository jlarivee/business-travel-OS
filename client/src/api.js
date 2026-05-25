async function request(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers || {}),
    },
    body: options.body instanceof FormData ? options.body : options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    const err = new Error(error.error || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export const api = {
  health: () => request('/api/health'),
  authStatus: () => request('/api/auth/status'),
  login: (username, password) => request('/api/auth/login', { method: 'POST', body: { username, password } }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  getProfile: () => request('/api/profile'),
  updateProfile: (data) => request('/api/profile', { method: 'PUT', body: data }),
  searchFlights: (data) => request('/api/search/flights', { method: 'POST', body: data }),
  getWatches: () => request('/api/watches'),
  createWatch: (data) => request('/api/watches', { method: 'POST', body: data }),
  updateWatch: (id, data) => request(`/api/watches/${id}`, { method: 'PUT', body: data }),
  deleteWatch: (id) => request(`/api/watches/${id}`, { method: 'DELETE' }),
  checkWatch: (id) => request(`/api/watches/${id}/check-now`, { method: 'POST' }),
  checkAllWatches: () => request('/api/watches/check-all', { method: 'POST' }),
  createDailyReview: () => request('/api/daily-reviews', { method: 'POST' }),
  getDailyReviews: () => request('/api/daily-reviews'),
  createMembership: (data) => request('/api/memberships', { method: 'POST', body: data }),
  updateMembership: (id, data) => request(`/api/memberships/${id}`, { method: 'PUT', body: data }),
  deleteMembership: (id) => request(`/api/memberships/${id}`, { method: 'DELETE' }),
  createItinerary: (data) => request('/api/itinerary', { method: 'POST', body: data }),
  sendChat: (message) => request('/api/chat', { method: 'POST', body: { message } }),
};
