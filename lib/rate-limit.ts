import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";

/**
 * Rate Limiting Middleware
 *
 * Prevents API abuse by limiting requests per restaurant/IP
 * Uses Redis for distributed rate limiting
 */

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

// Default rate limit configs by endpoint type
export const RATE_LIMITS = {
  default: { windowMs: 60000, maxRequests: 100 },  // 100 req/min
  auth: { windowMs: 900000, maxRequests: 5 },      // 5 req/15min for auth
  write: { windowMs: 60000, maxRequests: 50 },     // 50 req/min for POST/PUT/DELETE
  read: { windowMs: 60000, maxRequests: 200 },     // 200 req/min for GET
  export: { windowMs: 300000, maxRequests: 10 },   // 10 req/5min for exports
};

class RateLimiter {
  private redis: Redis | null = null;
  private memoryStore: Map<string, { count: number; resetAt: number }> = new Map();
  private useRedis: boolean = false;

  constructor() {
    // Try to connect to Redis
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_PRIVATE_URL;

    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 3,
          enableOfflineQueue: false,
        });

        this.redis.on('connect', () => {
          console.log('✅ Rate limiter connected to Redis');
          this.useRedis = true;
        });

        this.redis.on('error', (err) => {
          console.warn('⚠️ Redis error, falling back to memory:', err.message);
          this.useRedis = false;
        });
      } catch (error) {
        console.warn('⚠️ Redis not available, using memory-based rate limiting');
        this.useRedis = false;
      }
    } else {
      console.log('📝 Using memory-based rate limiting (single-instance only)');
    }
  }

  /**
   * Get a unique key for rate limiting
   */
  private getKey(identifier: string, endpoint: string): string {
    return `ratelimit:${identifier}:${endpoint}`;
  }

  /**
   * Check if request should be rate limited
   */
  async checkLimit(
    identifier: string,
    endpoint: string,
    config: RateLimitConfig
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = this.getKey(identifier, endpoint);
    const now = Date.now();

    if (this.useRedis && this.redis) {
      return await this.checkLimitRedis(key, config, now);
    } else {
      return this.checkLimitMemory(key, config, now);
    }
  }

  /**
   * Redis-based rate limiting (recommended for production)
   */
  private async checkLimitRedis(
    key: string,
    config: RateLimitConfig,
    now: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    try {
      const ttlMs = config.windowMs;
      const multi = this.redis!.multi();

      // Increment counter
      multi.incr(key);
      multi.pexpire(key, ttlMs);
      multi.ttl(key);

      const results = await multi.exec();

      if (!results) {
        throw new Error('Redis multi exec failed');
      }

      const count = results[0][1] as number;
      const ttlSeconds = results[2][1] as number;
      const resetAt = now + (ttlSeconds * 1000);
      const remaining = Math.max(0, config.maxRequests - count);

      return {
        allowed: count <= config.maxRequests,
        remaining,
        resetAt,
      };
    } catch (error) {
      console.error('Rate limit Redis error:', error);
      // Fallback to allowing request if Redis fails
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: now + config.windowMs,
      };
    }
  }

  /**
   * Memory-based rate limiting (fallback, single-instance only)
   */
  private checkLimitMemory(
    key: string,
    config: RateLimitConfig,
    now: number
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const entry = this.memoryStore.get(key);

    // Clean expired entries
    if (entry && entry.resetAt < now) {
      this.memoryStore.delete(key);
    }

    if (!entry || entry.resetAt < now) {
      // New window
      const resetAt = now + config.windowMs;
      this.memoryStore.set(key, { count: 1, resetAt });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetAt,
      };
    }

    // Increment existing window
    entry.count++;
    const remaining = Math.max(0, config.maxRequests - entry.count);

    return {
      allowed: entry.count <= config.maxRequests,
      remaining,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Clean up old entries from memory store (call periodically)
   */
  cleanupMemoryStore() {
    const now = Date.now();
    for (const [key, entry] of this.memoryStore.entries()) {
      if (entry.resetAt < now) {
        this.memoryStore.delete(key);
      }
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// Cleanup memory store every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    rateLimiter.cleanupMemoryStore();
  }, 300000);
}

/**
 * Rate limit middleware for Next.js API routes
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig = RATE_LIMITS.default
): Promise<NextResponse | null> {
  // Get identifier (restaurantId or IP)
  const restaurantId = request.cookies.get("restaurant_id")?.value;
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const identifier = restaurantId || ip;

  // Get endpoint path
  const url = new URL(request.url);
  const endpoint = url.pathname;

  // Check rate limit
  const { allowed, remaining, resetAt } = await rateLimiter.checkLimit(
    identifier,
    endpoint,
    config
  );

  // Add rate limit headers
  const headers = {
    "X-RateLimit-Limit": config.maxRequests.toString(),
    "X-RateLimit-Remaining": remaining.toString(),
    "X-RateLimit-Reset": new Date(resetAt).toISOString(),
  };

  if (!allowed) {
    const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);

    return NextResponse.json(
      {
        success: false,
        error: "Rate limit exceeded",
        message: `Too many requests. Please try again in ${retryAfter} seconds.`,
      },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": retryAfter.toString(),
        },
      }
    );
  }

  return null; // null means allowed to proceed
}

/**
 * HOC to wrap API handlers with rate limiting
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config?: RateLimitConfig
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const rateLimitResponse = await rateLimit(request, config);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    return handler(request);
  };
}

/**
 * Helper to get rate limit config based on HTTP method
 */
export function getRateLimitByMethod(method: string): RateLimitConfig {
  switch (method) {
    case 'GET':
      return RATE_LIMITS.read;
    case 'POST':
    case 'PUT':
    case 'PATCH':
    case 'DELETE':
      return RATE_LIMITS.write;
    default:
      return RATE_LIMITS.default;
  }
}
