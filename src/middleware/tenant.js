import { getTenantId, validateTenantAccess } from '../lib/tenant.js';

/**
 * Astro middleware for multi-tenant support
 */
export async function onRequest(context, next) {
    const { request } = context;
    
    // Extract tenant ID from request
    const tenantId = getTenantId(request);
    
    // Validate tenant access
    if (!validateTenantAccess(tenantId)) {
        return new Response('Tenant not found or inactive', { status: 404 });
    }
    
    // Add tenant info to context
    context.locals.tenantId = tenantId;
    context.locals.tenant = {
        id: tenantId,
        // Additional tenant info can be loaded here if needed
    };
    
    // Continue to the next middleware/route
    const response = await next();
    
    // Add tenant header to response (optional, for debugging)
    response.headers.set('X-Tenant-ID', tenantId);
    
    return response;
}
