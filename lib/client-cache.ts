"use client";

// A persistent cache for client-side fetch requests using sessionStorage.
// This survives page reloads (F5) but clears when the tab is closed, 
// ensuring data stays fresh across sessions while making in-session navigation instant.
class CacheManager {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private defaultTTL = 60 * 60 * 1000; // 1 hour
  private PREFIX = "rc_cache_";

  constructor() {
    // Load from sessionStorage on initialization (client-side only)
    if (typeof window !== "undefined") {
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith(this.PREFIX)) {
            const raw = sessionStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              
              // Clean up expired cache items
              if (Date.now() - parsed.timestamp > this.defaultTTL) {
                sessionStorage.removeItem(key);
              } else {
                const originalKey = key.replace(this.PREFIX, "");
                this.cache.set(originalKey, parsed);
              }
            }
          }
        }
      } catch (e) {
        console.warn("Failed to load cache from sessionStorage", e);
      }
    }
  }

  get(key: string) {
    const item = this.cache.get(key);
    return item ? item.data : null;
  }

  set(key: string, data: any) {
    const payload = { data, timestamp: Date.now() };
    this.cache.set(key, payload);
    
    // Persist to sessionStorage
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(this.PREFIX + key, JSON.stringify(payload));
      } catch (e) {
        console.warn("Failed to save to sessionStorage (quota exceeded?)", e);
      }
    }
  }

  has(key: string) {
    return this.cache.has(key);
  }

  clear() {
    this.cache.clear();
    if (typeof window !== "undefined") {
      try {
        const keysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith(this.PREFIX)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => sessionStorage.removeItem(k));
      } catch (e) {}
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
    const data = await res.json();
    
    // Only cache successful responses
    if (data && (data.success || Array.isArray(data))) {
      clientCache.set(url, data);
    }
    
    return data;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    
    // If the network request fails (e.g. offline), try to gracefully fall back to cache
    if (clientCache.has(url)) {
      console.log(`Falling back to cached data for ${url}`);
      return clientCache.get(url);
    }
    
    throw error;
  }
}
