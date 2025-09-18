// Multi-tenant restaurant system
// Extracts restaurant ID from subdomain or URL path

/**
 * Extract restaurant ID from request
 * Supports both subdomain and path-based tenancy
 */
export function getTenantId(request) {
    const url = new URL(request.url);
    const hostname = url.hostname;
    
    // Method 1: Subdomain-based (preferred)
    // restaurant1.yourdomain.com -> restaurant1
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        const parts = hostname.split('.');
        if (parts.length >= 3) {
            const subdomain = parts[0];
            // Skip 'www' subdomain
            if (subdomain !== 'www' && subdomain !== 'api') {
                return subdomain;
            }
        }
    }
    
    // Method 2: Path-based fallback
    // yourdomain.com/restaurant1/ -> restaurant1
    const pathSegments = url.pathname.split('/').filter(segment => segment.length > 0);
    if (pathSegments.length > 0) {
        const firstSegment = pathSegments[0];
        // Check if it looks like a restaurant ID (not a page name)
        if (!['api', 'login', 'settings', 'cart', 'delivery', 'confirmation'].includes(firstSegment)) {
            return firstSegment;
        }
    }
    
    // Method 3: Default tenant for development/single restaurant
    return 'default';
}

/**
 * Get tenant configuration
 */
export function getTenantConfig(tenantId) {
    const tenantConfigs = {
        'default': {
            name: 'Default Restaurant',
            logo: '🍽️',
            primaryColor: '#3B82F6',
            currency: '₽'
        },
        'restaurant1': {
            name: 'Restaurant One',
            logo: '🍕',
            primaryColor: '#EF4444',
            currency: '₽'
        },
        'restaurant2': {
            name: 'Restaurant Two', 
            logo: '🍣',
            primaryColor: '#10B981',
            currency: '₽'
        },
        'pizzaplace': {
            name: 'Pizza Place',
            logo: '🍕',
            primaryColor: '#F59E0B',
            currency: '₽'
        },
        'sushibar': {
            name: 'Sushi Bar',
            logo: '🍣',
            primaryColor: '#8B5CF6',
            currency: '₽'
        }
    };
    
    return tenantConfigs[tenantId] || tenantConfigs['default'];
}

/**
 * Create tenant-aware localStorage key
 */
export function getTenantStorageKey(tenantId, key) {
    return `${tenantId}_${key}`;
}

/**
 * Validate tenant access (optional security check)
 */
export function validateTenantAccess(tenantId) {
    // Add any tenant validation logic here
    // For example, check if tenant is active, has valid subscription, etc.
    return true;
}

/**
 * Get database filter for tenant
 */
export function getTenantFilter(tenantId) {
    return {
        restaurant_id: tenantId
    };
}
