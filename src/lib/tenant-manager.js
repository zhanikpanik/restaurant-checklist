import pool from "./db.js";

/**
 * Multi-Tenant Restaurant Management
 * Handles tenant identification, configuration, and Poster API integration
 */

// Cache for restaurant configurations to avoid repeated DB queries
const restaurantCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get tenant ID from various sources
 * Priority: URL subdomain > query param > header > cookie > default
 */
export function getTenantId(request) {
  try {
    const url = new URL(request.url);

    // 1. Check query parameter first (?tenant=restaurant_a) - highest priority
    const tenantParam = url.searchParams.get("tenant");
    if (tenantParam) {
      return tenantParam;
    }

    // 2. Check cookie (set by restaurant selection)
    const cookies = request.headers.get("cookie");
    if (cookies) {
      const tenantCookie = cookies
        .split(";")
        .find((c) => c.trim().startsWith("tenant="));
      if (tenantCookie) {
        return tenantCookie.split("=")[1].trim();
      }
    }

    // 3. Check custom header
    const tenantHeader = request.headers.get("X-Tenant-ID");
    if (tenantHeader) {
      return tenantHeader;
    }

    // 4. Check subdomain (e.g., restaurant-a.yourdomain.com) - lowest priority
    const hostname = url.hostname;
    const parts = hostname.split(".");

    // Skip subdomain detection for deployment platforms (Railway, Vercel, Netlify, etc.)
    const deploymentPlatforms = [
      "railway.app",
      "vercel.app",
      "netlify.app",
      "herokuapp.com",
      "onrender.com",
    ];
    const isDeploymentPlatform = deploymentPlatforms.some((platform) =>
      hostname.includes(platform),
    );

    if (parts.length > 2 && !isDeploymentPlatform) {
      const subdomain = parts[0];
      if (subdomain !== "www" && subdomain !== "api") {
        return subdomain.replace("-", "_"); // Convert to valid tenant ID
      }
    }

    // 5. Default fallback
    return "default";
  } catch (error) {
    console.error("Error determining tenant ID:", error);
    return "default";
  }
}

/**
 * Get restaurant configuration including Poster tokens
 */
export async function getRestaurantConfig(tenantId) {
  // Check cache first
  const cacheKey = tenantId;
  const cached = restaurantCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  if (!pool) {
    console.warn("Database pool not available, using fallback config");
    return getFallbackConfig(tenantId);
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT * FROM restaurants WHERE id = $1 AND is_active = true",
      [tenantId],
    );

    if (result.rows.length === 0) {
      console.warn(`Restaurant ${tenantId} not found, using default`);
      return getRestaurantConfig("default");
    }

    const config = result.rows[0];

    // Cache the result
    restaurantCache.set(cacheKey, {
      data: config,
      timestamp: Date.now(),
    });

    return config;
  } catch (error) {
    console.error("Error fetching restaurant config:", error);
    return getFallbackConfig(tenantId);
  } finally {
    client.release();
  }
}

/**
 * Get Poster API configuration (token and baseUrl with account subdomain)
 */
export async function getPosterConfig(tenantId) {
  const config = await getRestaurantConfig(tenantId);

  if (!config) {
    throw new Error(
      `Restaurant configuration not found for tenant: ${tenantId}`,
    );
  }

  const token = config.poster_token || config.poster_access_token;
  const accountName = config.poster_account_name || config.account_number;

  if (!token) {
    throw new Error(`Poster token not configured for tenant: ${tenantId}`);
  }

  if (!accountName) {
    throw new Error(
      `Poster account name not configured for tenant: ${tenantId}`,
    );
  }

  // Return account-specific base URL
  return {
    token,
    baseUrl: `https://${accountName}.joinposter.com/api`,
    accountName,
  };
}

/**
 * Fallback configuration when database is not available
 */
function getFallbackConfig(tenantId) {
  // Try both process.env and import.meta.env for compatibility
  const envToken =
    typeof import.meta !== "undefined" && import.meta.env
      ? import.meta.env.POSTER_ACCESS_TOKEN || import.meta.env.POSTER_TOKEN
      : process.env.POSTER_ACCESS_TOKEN || process.env.POSTER_TOKEN;

  return {
    id: tenantId,
    name: "Restaurant",
    logo: "🍽️",
    primary_color: "#3B82F6",
    currency: "₽",
    poster_token: envToken || "305185:07928627ec76d09e589e1381710e55da",
    poster_base_url: "https://joinposter.com/api",
    kitchen_storage_id: 1,
    bar_storage_id: 2,
    timezone: "Europe/Moscow",
    language: "ru",
    whatsapp_enabled: true,
    is_active: true,
  };
}

/**
 * Make authenticated Poster API request
 */
export async function posterApiRequest(endpoint, tenantId, params = {}) {
  const posterConfig = await getPosterConfig(tenantId);

  const url = new URL(endpoint, posterConfig.baseUrl);
  url.searchParams.set("token", posterConfig.token);

  // Add additional parameters
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value.toString());
    }
  });

  console.log(`🔗 Poster API request for ${tenantId}: ${endpoint}`);

  const response = await fetch(url.toString());
  const data = await response.json();

  if (data.error) {
    throw new Error(`Poster API error: ${data.error.message || data.error}`);
  }

  return data.response;
}

/**
 * Get all active restaurants (for admin/selection purposes)
 */
export async function getAllRestaurants() {
  if (!pool) {
    return [getFallbackConfig("default")];
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT * FROM restaurants WHERE is_active = true ORDER BY name",
    );
    return result.rows;
  } catch (error) {
    console.error("Error fetching restaurants:", error);
    return [getFallbackConfig("default")];
  } finally {
    client.release();
  }
}

/**
 * Create a new restaurant tenant
 */
export async function createRestaurant(restaurantData) {
  if (!pool) {
    throw new Error("Database not available");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Insert restaurant
    const result = await client.query(
      `
            INSERT INTO restaurants (
                id, name, logo, primary_color, currency,
                poster_token, poster_base_url, kitchen_storage_id, bar_storage_id,
                timezone, language, whatsapp_enabled
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `,
      [
        restaurantData.id,
        restaurantData.name,
        restaurantData.logo || "🍽️",
        restaurantData.primary_color || "#3B82F6",
        restaurantData.currency || "₽",
        restaurantData.poster_token,
        restaurantData.poster_base_url || "https://joinposter.com/api",
        restaurantData.kitchen_storage_id || 1,
        restaurantData.bar_storage_id || 2,
        restaurantData.timezone || "Europe/Moscow",
        restaurantData.language || "ru",
        restaurantData.whatsapp_enabled !== false,
      ],
    );

    // Create default departments for new restaurant
    await client.query(
      `
            INSERT INTO departments (restaurant_id, name, emoji, poster_storage_id) VALUES
                ($1, 'Кухня', '🍳', $2),
                ($1, 'Бар', '🍷', $3),
                ($1, 'Горничная', '🧹', NULL)
        `,
      [
        restaurantData.id,
        restaurantData.kitchen_storage_id || 1,
        restaurantData.bar_storage_id || 2,
      ],
    );

    await client.query("COMMIT");

    // Clear cache
    restaurantCache.delete(restaurantData.id);

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Middleware to inject tenant context into request
 */
export function withTenant(handler) {
  return async (context) => {
    const tenantId = getTenantId(context.request);
    const restaurantConfig = await getRestaurantConfig(tenantId);

    // Add tenant info to context
    context.locals = context.locals || {};
    context.locals.tenantId = tenantId;
    context.locals.restaurant = restaurantConfig;

    return handler(context);
  };
}

/**
 * Clear restaurant cache (useful for admin operations)
 */
export function clearRestaurantCache(tenantId = null) {
  if (tenantId) {
    restaurantCache.delete(tenantId);
  } else {
    restaurantCache.clear();
  }
}
