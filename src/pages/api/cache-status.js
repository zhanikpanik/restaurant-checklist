import { getCacheStats, isUsingRedis } from '../../lib/cache.js';

export const prerender = false;

/**
 * GET /api/cache-status
 * Returns cache type and statistics
 */
export async function GET() {
  try {
    const stats = await getCacheStats();
    const usingRedis = isUsingRedis();

    return new Response(JSON.stringify({
      success: true,
      cache: {
        type: usingRedis ? 'redis' : 'memory',
        usingRedis: usingRedis,
        stats: stats,
        recommendation: usingRedis
          ? '✅ Redis is active - optimal for production'
          : '⚠️ Using in-memory cache - add Redis for production'
      }
    }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
