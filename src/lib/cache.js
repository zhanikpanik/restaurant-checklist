/**
 * Centralized Cache Module
 * Supports Redis (production) with fallback to in-memory cache (development)
 */

import Redis from "ioredis";

// Redis client instance
let redisClient = null;

// Fallback in-memory cache
const memoryCache = new Map();
const MEMORY_CACHE_MAX_SIZE = 100; // Prevent memory leaks

// Cache configuration
const DEFAULT_TTL = 5 * 60; // 5 minutes in seconds

/**
 * Initialize Redis connection
 * Falls back to in-memory cache if Redis is not available
 */
function initRedis() {
  if (redisClient !== null) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    console.log(
      "ℹ️  No REDIS_URL found, using in-memory cache (not recommended for production)",
    );
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = "READONLY";
        if (err.message.includes(targetError)) {
          return true; // Reconnect on READONLY errors
        }
        return false;
      },
    });

    redisClient.on("connect", () => {
      console.log("✅ Redis connected successfully");
    });

    redisClient.on("error", (err) => {
      console.error("❌ Redis error:", err.message);
    });

    redisClient.on("close", () => {
      console.log("⚠️  Redis connection closed");
    });

    return redisClient;
  } catch (error) {
    console.error("❌ Failed to initialize Redis:", error.message);
    console.log("⚠️  Falling back to in-memory cache");
    return null;
  }
}

/**
 * Get a value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any|null>} Cached value or null
 */
export async function getCache(key) {
  const redis = initRedis();

  try {
    if (redis && redis.status === "ready") {
      const value = await redis.get(key);
      if (value) {
        try {
          return JSON.parse(value);
        } catch {
          return value; // Return as-is if not JSON
        }
      }
      return null;
    }
  } catch (error) {
    console.warn(`⚠️  Redis GET error for key "${key}":`, error.message);
  }

  // Fallback to memory cache
  const cached = memoryCache.get(key);
  if (cached && Date.now() < cached.expiry) {
    return cached.value;
  }

  // Expired or not found
  if (cached) {
    memoryCache.delete(key);
  }
  return null;
}

/**
 * Set a value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache (will be JSON stringified)
 * @param {number} ttl - Time to live in seconds (default: 5 minutes)
 * @returns {Promise<boolean>} Success status
 */
export async function setCache(key, value, ttl = DEFAULT_TTL) {
  const redis = initRedis();

  try {
    if (redis && redis.status === "ready") {
      const serialized =
        typeof value === "string" ? value : JSON.stringify(value);
      await redis.setex(key, ttl, serialized);
      return true;
    }
  } catch (error) {
    console.warn(`⚠️  Redis SET error for key "${key}":`, error.message);
  }

  // Fallback to memory cache
  // Prevent memory leaks by limiting cache size
  if (memoryCache.size >= MEMORY_CACHE_MAX_SIZE) {
    const firstKey = memoryCache.keys().next().value;
    memoryCache.delete(firstKey);
  }

  memoryCache.set(key, {
    value,
    expiry: Date.now() + ttl * 1000,
  });

  return true;
}

/**
 * Delete a value from cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} Success status
 */
export async function deleteCache(key) {
  const redis = initRedis();

  try {
    if (redis && redis.status === "ready") {
      await redis.del(key);
      return true;
    }
  } catch (error) {
    console.warn(`⚠️  Redis DEL error for key "${key}":`, error.message);
  }

  // Fallback to memory cache
  memoryCache.delete(key);
  return true;
}

/**
 * Delete multiple keys matching a pattern
 * @param {string} pattern - Key pattern (e.g., "restaurant:*")
 * @returns {Promise<number>} Number of keys deleted
 */
export async function deleteCachePattern(pattern) {
  const redis = initRedis();

  try {
    if (redis && redis.status === "ready") {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        return keys.length;
      }
      return 0;
    }
  } catch (error) {
    console.warn(
      `⚠️  Redis DEL pattern error for "${pattern}":`,
      error.message,
    );
  }

  // Fallback to memory cache
  let count = 0;
  const regex = new RegExp("^" + pattern.replace("*", ".*") + "$");
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
      count++;
    }
  }
  return count;
}

/**
 * Check if cache is using Redis
 * @returns {boolean} True if using Redis
 */
export function isUsingRedis() {
  const redis = initRedis();
  return redis !== null && redis.status === "ready";
}

/**
 * Get cache statistics
 * @returns {Promise<object>} Cache stats
 */
export async function getCacheStats() {
  const redis = initRedis();

  if (redis && redis.status === "ready") {
    try {
      const info = await redis.info("stats");
      const dbSize = await redis.dbsize();

      return {
        type: "redis",
        connected: true,
        keyCount: dbSize,
        info: info,
      };
    } catch (error) {
      return {
        type: "redis",
        connected: false,
        error: error.message,
      };
    }
  }

  // Memory cache stats
  let activeKeys = 0;
  const now = Date.now();
  for (const [key, cached] of memoryCache.entries()) {
    if (now < cached.expiry) {
      activeKeys++;
    }
  }

  return {
    type: "memory",
    connected: true,
    keyCount: activeKeys,
    totalKeys: memoryCache.size,
    maxSize: MEMORY_CACHE_MAX_SIZE,
  };
}

/**
 * Clear all cache (use with caution!)
 * @returns {Promise<boolean>} Success status
 */
export async function clearAllCache() {
  const redis = initRedis();

  try {
    if (redis && redis.status === "ready") {
      await redis.flushdb();
      console.log("✅ Redis cache cleared");
      return true;
    }
  } catch (error) {
    console.error("❌ Redis FLUSHDB error:", error.message);
  }

  // Clear memory cache
  memoryCache.clear();
  console.log("✅ Memory cache cleared");
  return true;
}

/**
 * Close Redis connection (for graceful shutdown)
 */
export async function closeCache() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log("👋 Redis connection closed");
  }
}
