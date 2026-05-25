import 'dotenv/config';

export const APP_NAME = 'business-travel-os';
export const USER_ID = 1;
export const DEFAULT_HOME_AIRPORTS = ['BDL', 'PVD', 'HVN', 'JFK', 'LGA', 'EWR', 'BOS'];
export const DEFAULT_MEMBERSHIPS = [
  { program: 'Emirates Skywards', accountNumber: '', tier: '', notes: 'Premium long-haul preference when route fit is strong.' },
  { program: 'Virgin Atlantic Flying Club', accountNumber: '', tier: '', notes: 'Watch Upper Class and partner redemption relevance.' },
  { program: 'Delta SkyMiles', accountNumber: '', tier: '', notes: 'Useful domestic and transatlantic fallback.' },
  { program: 'United MileagePlus', accountNumber: '', tier: '', notes: 'Useful Star Alliance fallback.' },
  { program: 'American AAdvantage', accountNumber: '', tier: '', notes: 'Useful oneworld fallback.' },
  { program: 'JetBlue TrueBlue', accountNumber: '', tier: '', notes: 'Useful Northeast domestic and transatlantic Mint checks.' },
  { program: 'British Airways Executive Club', accountNumber: '', tier: '', notes: 'Useful oneworld and London-route awareness.' },
  { program: 'Air France-KLM Flying Blue', accountNumber: '', tier: '', notes: 'Useful SkyTeam Europe routing.' },
  { program: 'Qatar Privilege Club', accountNumber: '', tier: '', notes: 'Premium long-haul and oneworld routing.' },
];

export function envFlag(name) {
  return Boolean(process.env[name] && String(process.env[name]).trim().length > 0);
}

export function getAllowedOrigins() {
  return new Set([
    'http://localhost:5173',
    'http://localhost:3000',
    'https://business-travel-os.replit.app',
    ...(process.env.ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()).filter(Boolean),
  ]);
}

export function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.REPL_ID);
}

export function getAuthConfig() {
  const password = process.env.APP_PASSWORD || process.env.ADMIN_PASSWORD || '';
  const localFallback = isProductionRuntime() ? '' : 'local-dev-only';
  const effectivePassword = password || localFallback;
  const providedSecret = process.env.JWT_SECRET || process.env.APP_SESSION_SECRET || '';
  return {
    username: process.env.APP_USERNAME || process.env.ADMIN_USERNAME || 'josh',
    password: effectivePassword,
    configured: Boolean((password && providedSecret) || !isProductionRuntime()),
    localFallback: !password && !isProductionRuntime(),
    cookieName: 'bto_session',
    sessionTtlMs: 12 * 60 * 60 * 1000,
    secret: providedSecret || localFallback,
  };
}

export function getAnthropicModel() {
  return process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514';
}

export function getExtractionModel() {
  return process.env.ANTHROPIC_EXTRACTION_MODEL || 'claude-3-5-haiku-20241022';
}

export function redact(value) {
  if (!value) return 'not set';
  return 'set';
}
