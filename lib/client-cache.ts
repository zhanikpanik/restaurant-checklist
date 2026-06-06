"use client";

// A persistent cache for client-side fetch requests using sessionStorage.
// This survives page reloads (F5) but clears when the tab is closed,
// ensuring data stays fresh across sessions while making in-session navigation instant.
//
// Uses LRU eviction to prevent unbounded growth and sessionStorage quota overflow.
const MAX_ENTRIES = 60; // sessionStorage quota is ~5MB, safe upper bound

class CacheManager {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private accessOrder: string[] = []; // LRU tracking: most recent at end
  private defaultTTL = 60 * 60 * 1000; // 1 hour
  private PREFIX = "rc_cache_";

  constructor() {
    if (typeof window === "undefined") return;
    try {
      const expiredKeys: string[] = [];
      const entries: Array<{ key: string; parsed: { data: any; timestamp: number } }> = [];

      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(this.PREFIX)) {
          const raw = sessionStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Date.now() - parsed.timestamp > this.defaultTTL) {
              expiredKeys.push(key);
            } else {
              entries.push({ key, parsed });
            }
          }
        }
      }

      // Evict expired
      expiredKeys.forEach((k) => sessionStorage.removeItem(k));

      // Load valid entries (sorted by timestamp, oldest first for LRU ordering)
      entries.sort((a, b) => a.parsed.timestamp - b.parsed.timestamp);
      for (const { key, parsed } of entries) {
        const originalKey = key.replace(this.PREFIX, "");
        this.cache.set(originalKey, parsed);
        this.accessOrder.push(originalKey);
      }

      // If more than max, evict oldest
      while (this.accessOrder.length > MAX_ENTRIES) {
        this.evictLRU();
      }
    } catch (e) {
      console.warn("Failed to load cache from sessionStorage", e);
    }
  }

  /** Bump key to most-recently-used position */
  private touch(key: string) {
    const idx = this.accessOrder.indexOf(key);
    if (idx > -1) this.accessOrder.splice(idx, 1);
    this.accessOrder.push(key);
  }

  /** Remove least-recently-used entry from both Map and sessionStorage */
  private evictLRU() {
    const oldest = this.accessOrder.shift();
    if (oldest) {
      this.cache.delete(oldest);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem(this.PREFIX + oldest);
        } catch { /* ignore */ }
      }
    }
  }

  get(key: string) {
    const item = this.cache.get(key);
    if (item) {
      // Check TTL
      if (Date.now() - item.timestamp > this.defaultTTL) {
        this.cache.delete(key);
        this.accessOrder = this.accessOrder.filter((k) => k !== key);
        return null;
      }
      this.touch(key);
      return item.data;
    }
    return null;
  }

  set(key: string, data: any) {
    const payload = { data, timestamp: Date.now() };

    // Enforce LRU cap before adding
    if (!this.cache.has(key) && this.cache.size >= MAX_ENTRIES) {
      this.evictLRU();
    }

    this.cache.set(key, payload);
    this.touch(key);

    // Persist to sessionStorage (evict if quota exceeded)
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(this.PREFIX + key, JSON.stringify(payload));
      } catch {
        // Quota exceeded — evict oldest entry to make room, then retry once
        this.evictLRU();
        try {
          sessionStorage.setItem(this.PREFIX + key, JSON.stringify(payload));
        } catch {
          console.warn("sessionStorage quota exceeded, cache persistence disabled for this entry");
        }
      }
    }
  }

  has(key: string) {
    return this.cache.has(key);
  }

  clear() {
    this.cache.clear();
    this.accessOrder = [];
    if (typeof window !== "undefined") {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith(this.PREFIX)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => sessionStorage.removeItem(k));
      } catch { /* ignore */ }
    }
  }
}

export const clientCache = new CacheManager();

/**
 * Stale-While-Revalidate fetching logic.
 * This function will always perform a network request to get the freshest data,
 * and then update the cache. Components should initialize their React state 
 * using `clientCache.get()` to render instantly, then call this function in 
 * a useEffect to seamlessly update the UI if the data changed.
 */
export async function fetchWithCache(url: string) {
  try {
    const res = await fetch(url);

    // Handle rate-limit and other non-OK responses gracefully
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.warn(`fetchWithCache: ${url} returned ${res.status} — falling back to cache`);

      if (clientCache.has(url)) {
        return clientCache.get(url);
      }

      throw new Error(`Request failed with status ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();

    // Only cache successful responses
    if (data && (data.success || Array.isArray(data))) {
      clientCache.set(url, data);
    }

    return data;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);

    // If the network request fails (e.g. offline, rate-limited), try cache
    if (clientCache.has(url)) {
      console.log(`Falling back to cached data for ${url}`);
      return clientCache.get(url);
    }

    throw error;
  }
}
