/**
 * Lightweight Edge Runtime compatible rate limiter.
 * Uses in-memory Map (per-instance, no Redis dependency).
 *
 * For production multi-instance deployment, replace with Upstash Redis
 * or Vercel's built-in rate limiting.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup every 2 minutes
const CLEANUP_INTERVAL = 2 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}

/**
 * Check rate limit. Returns null if allowed, or a 429 Response if exceeded.
 *
 * @param identifier - IP address or restaurant ID
 * @param maxRequests - max requests per window
 * @param windowMs - time window in milliseconds
 */
export function checkEdgeRateLimit(
  identifier: string,
  maxRequests = 100,
  windowMs = 60_000,
): { allowed: true; remaining: number } | { allowed: false; retryAfter: number } {
  cleanup();
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || entry.resetAt < now) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);

  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true, remaining };
}

/** Configs by path prefix */
const PATH_LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/api/auth": { max: 20, windowMs: 900_000 },  // auth: 20 req/15min
  "/api/orders": { max: 120, windowMs: 60_000 }, // orders: 120 req/min
  "/api/poster": { max: 60, windowMs: 60_000 },  // poster: 60 req/min
};

export function getRateLimitConfig(pathname: string) {
  for (const [prefix, config] of Object.entries(PATH_LIMITS)) {
    if (pathname.startsWith(prefix)) return config;
  }
  return { max: 300, windowMs: 60_000 }; // default: 300 req/min (was 100)
}
