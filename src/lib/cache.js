/**
 * Simple in-memory cache with TTL support
 * Can be easily replaced with Redis later
 * 
 * Usage:
 *   await cache.set('key', data, 300); // Cache for 5 minutes
 *   const data = await cache.get('key');
 *   await cache.del('key');
 */

class MemoryCache {
    constructor() {
        this.cache = new Map();
        this.timers = new Map();
        
        // Clear expired entries every 5 minutes
        setInterval(() => this.cleanup(), 300000);
        
        console.log('📦 Memory cache initialized');
    }
    
    /**
     * Set a value in cache with optional TTL
     * @param {string} key - cache key
     * @param {any} value - value to cache
     * @param {number} ttl - time to live in seconds (default: 300 = 5 minutes)
     */
    async set(key, value, ttl = 300) {
        try {
            // Clear existing timer if any
            if (this.timers.has(key)) {
                clearTimeout(this.timers.get(key));
            }
            
            // Store value with expiry timestamp
            this.cache.set(key, {
                value,
                expiresAt: Date.now() + (ttl * 1000)
            });
            
            // Set expiry timer
            const timer = setTimeout(() => {
                this.cache.delete(key);
                this.timers.delete(key);
                console.log(`🗑️ Cache expired: ${key}`);
            }, ttl * 1000);
            
            this.timers.set(key, timer);
            
            console.log(`✅ Cached: ${key} (TTL: ${ttl}s)`);
            return true;
        } catch (error) {
            console.error('❌ Cache set error:', error);
            return false;
        }
    }
    
    /**
     * Get a value from cache
     * @param {string} key - cache key
     * @returns {any|null} - cached value or null if not found/expired
     */
    async get(key) {
        try {
            const item = this.cache.get(key);
            
            if (!item) {
                console.log(`❌ Cache miss: ${key}`);
                return null;
            }
            
            // Check if expired
            if (Date.now() > item.expiresAt) {
                this.cache.delete(key);
                if (this.timers.has(key)) {
                    clearTimeout(this.timers.get(key));
                    this.timers.delete(key);
                }
                console.log(`⏰ Cache expired: ${key}`);
                return null;
            }
            
            console.log(`✅ Cache hit: ${key}`);
            return item.value;
        } catch (error) {
            console.error('❌ Cache get error:', error);
            return null;
        }
    }
    
    /**
     * Delete a value from cache
     * @param {string} key - cache key
     */
    async del(key) {
        try {
            if (this.timers.has(key)) {
                clearTimeout(this.timers.get(key));
                this.timers.delete(key);
            }
            this.cache.delete(key);
            console.log(`🗑️ Cache deleted: ${key}`);
            return true;
        } catch (error) {
            console.error('❌ Cache delete error:', error);
            return false;
        }
    }
    
    /**
     * Delete all keys matching a pattern
     * @param {string} pattern - pattern to match (simple prefix match)
     */
    async delPattern(pattern) {
        try {
            let count = 0;
            for (const key of this.cache.keys()) {
                if (key.startsWith(pattern)) {
                    await this.del(key);
                    count++;
                }
            }
            console.log(`🗑️ Deleted ${count} keys matching: ${pattern}`);
            return count;
        } catch (error) {
            console.error('❌ Cache delete pattern error:', error);
            return 0;
        }
    }
    
    /**
     * Clear all cache entries
     */
    async clear() {
        try {
            // Clear all timers
            for (const timer of this.timers.values()) {
                clearTimeout(timer);
            }
            
            this.cache.clear();
            this.timers.clear();
            console.log('🗑️ Cache cleared');
            return true;
        } catch (error) {
            console.error('❌ Cache clear error:', error);
            return false;
        }
    }
    
    /**
     * Get cache statistics
     */
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
    
    /**
     * Cleanup expired entries
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiresAt) {
                this.cache.delete(key);
                if (this.timers.has(key)) {
                    clearTimeout(this.timers.get(key));
                    this.timers.delete(key);
                }
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`🧹 Cleaned up ${cleaned} expired cache entries`);
        }
    }
}

// Create singleton instance
const cache = new MemoryCache();

export default cache;

/**
 * Cache helper for wrapping database queries
 * @param {string} key - cache key
 * @param {Function} fetchFn - async function that fetches data
 * @param {number} ttl - time to live in seconds
 * @returns {Promise<any>} - cached or fresh data
 */
export async function cached(key, fetchFn, ttl = 300) {
    // Try to get from cache first
    const cachedData = await cache.get(key);
    if (cachedData !== null) {
        return cachedData;
    }
    
    // Fetch fresh data
    const freshData = await fetchFn();
    
    // Cache it
    await cache.set(key, freshData, ttl);
    
    return freshData;
}

/**
 * Cache invalidation helper for common patterns
 */
export const cacheKeys = {
    // Products
    barProducts: (tenantId) => `products:bar:${tenantId}`,
    kitchenProducts: (tenantId) => `products:kitchen:${tenantId}`,
    allProducts: (tenantId) => `products:all:${tenantId}`,
    
    // Orders
    orders: (tenantId) => `orders:${tenantId}`,
    ordersByDept: (tenantId, dept) => `orders:${tenantId}:${dept}`,
    ordersByCategory: (tenantId) => `orders:category:${tenantId}`,
    
    // Suppliers
    suppliers: (tenantId) => `suppliers:${tenantId}`,
    
    // Categories
    categories: (tenantId) => `categories:${tenantId}`,
    categorySuppliers: (tenantId) => `category-suppliers:${tenantId}`,
    
    // Departments
    departments: (tenantId) => `departments:${tenantId}`,
    
    // Custom products
    customProducts: (tenantId) => `custom-products:${tenantId}`,
};

/**
 * Invalidate cache when data changes
 */
export async function invalidateCache(pattern) {
    console.log(`🔄 Invalidating cache pattern: ${pattern}`);
    await cache.delPattern(pattern);
}

