/**
 * Lightweight in-memory cache for server-side API routes.
 *
 * Caches frequently-read, rarely-changed data (sections, suppliers, categories)
 * to reduce database round-trips. Uses per-tenant keys with configurable TTL.
 *
 * For multi-instance deployments, replace with Redis for cache consistency.
 * For single-instance Railway deployments, this provides sub-ms cached reads.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const store = new Map<string, CacheEntry<any>>();

// Cleanup expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    // Default TTL check — entries older than 10 min without explicit TTL
    if (now - entry.timestamp > 10 * 60 * 1000) {
      store.delete(key);
    }
  }
}

/**
 * Get cached data or fetch + cache it.
 *
 * @param key - Unique cache key (e.g., `sections:${restaurantId}`)
 * @param ttlMs - Time-to-live in milliseconds (default 2 minutes)
 * @param fetchFn - Async function to fetch fresh data if cache is stale
 */
export async function getCached<T>(
  key: string,
  ttlMs: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (entry && now - entry.timestamp < ttlMs) {
    return entry.data as T;
  }

  const data = await fetchFn();
  store.set(key, { data, timestamp: now });
  return data;
}

/**
 * Invalidate cached data for a specific key or key prefix.
 *
 * @param keyOrPrefix - Exact key or prefix (e.g., `sections:${id}` or just `sections`)
 */
export function invalidateCache(keyOrPrefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(keyOrPrefix)) {
      store.delete(key);
    }
  }
}

/**
 * Get cache stats for monitoring
 */
export function getCacheStats() {
  return {
    size: store.size,
    keys: Array.from(store.keys()),
  };
}
