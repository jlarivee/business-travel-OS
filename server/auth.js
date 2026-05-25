import crypto from 'crypto';
import { getAuthConfig, isProductionRuntime } from './config.js';

const attempts = new Map();

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((part) => {
    const index = part.indexOf('=');
    if (index < 0) return null;
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(Boolean));
}

function sign(payload) {
  const config = getAuthConfig();
  const body = base64url(JSON.stringify(payload));
  const signature = crypto.createHmac('sha256', config.secret).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verify(token) {
  const config = getAuthConfig();
  try {
    if (!token || !config.configured) return null;
    const [body, signature] = token.split('.');
    if (!body || !signature) return null;
    const expected = crypto.createHmac('sha256', config.secret).update(body).digest('base64url');
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(signature);
    if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function sessionCookieHeader(token) {
  const config = getAuthConfig();
  return [
    `${config.cookieName}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    isProductionRuntime() ? 'Secure' : '',
    `Max-Age=${Math.floor(config.sessionTtlMs / 1000)}`,
  ].filter(Boolean).join('; ');
}

function clearCookieHeader() {
  const config = getAuthConfig();
  return [
    `${config.cookieName}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    isProductionRuntime() ? 'Secure' : '',
    'Max-Age=0',
  ].filter(Boolean).join('; ');
}

function safeEqual(actual, expected) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) {
    crypto.timingSafeEqual(expectedBuffer, expectedBuffer);
    return false;
  }
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function checkRateLimit(req) {
  const key = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const current = attempts.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > current.resetAt) {
    current.count = 0;
    current.resetAt = now + windowMs;
  }
  current.count += 1;
  attempts.set(key, current);
  return current.count <= 8;
}

export function authStatus(req) {
  const config = getAuthConfig();
  const cookies = parseCookies(req.headers.cookie || '');
  const payload = verify(cookies[config.cookieName]);
  return {
    configured: config.configured,
    authenticated: Boolean(payload),
    username: payload?.sub || null,
    localFallback: config.localFallback,
  };
}

export function requireAuth(req, res, next) {
  const status = authStatus(req);
  if (!status.configured) {
    return res.status(503).json({ error: 'App security is not configured. Set APP_USERNAME, APP_PASSWORD, and JWT_SECRET in Replit Secrets.' });
  }
  if (!status.authenticated) {
    return res.status(401).json({ error: 'Login required' });
  }
  req.auth = status;
  next();
}

export function login(req, res) {
  const config = getAuthConfig();
  if (!config.configured) {
    return res.status(503).json({ error: 'App security is not configured. Set APP_USERNAME, APP_PASSWORD, and JWT_SECRET in Replit Secrets.' });
  }
  if (!checkRateLimit(req)) {
    return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
  }
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  const userOk = username.toLowerCase() === config.username.toLowerCase();
  const passOk = safeEqual(password, config.password);
  if (!userOk || !passOk) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  const token = sign({
    sub: config.username,
    iat: Date.now(),
    exp: Date.now() + config.sessionTtlMs,
  });
  res.setHeader('Set-Cookie', sessionCookieHeader(token));
  return res.json({ authenticated: true, username: config.username, localFallback: config.localFallback });
}

export function logout(req, res) {
  res.setHeader('Set-Cookie', clearCookieHeader());
  res.json({ ok: true });
}
