import crypto from 'crypto';
import pool from '../../../../lib/db.js';
import { env } from '../../../../lib/env.js';

/**
 * OAuth Authorization Endpoint
 * Redirects user to Poster's OAuth authorization page
 */
export async function GET({ request, redirect }) {
    try {
        const url = new URL(request.url);
        const restaurantId = url.searchParams.get('restaurant_id');

        if (!restaurantId) {
            return new Response(JSON.stringify({
                success: false,
                error: 'restaurant_id parameter is required'
            }), { status: 400 });
        }

        // Generate a random state for CSRF protection
        const state = crypto.randomBytes(32).toString('hex');

        // Store state in database for verification later
        await pool.query(
            'UPDATE restaurants SET oauth_state = $1 WHERE id = $2',
            [state, restaurantId]
        );

        // Get OAuth credentials from environment
        const appId = env.POSTER_APP_ID;
        const redirectUri = env.POSTER_REDIRECT_URI;

        console.log('🔑 OAuth authorize - restaurant:', restaurantId, 'appId:', appId);
        console.log('🔗 Redirect URI:', redirectUri);

        if (!appId || !redirectUri) {
            return new Response(JSON.stringify({
                success: false,
                error: 'OAuth credentials not configured'
            }), { status: 500 });
        }

        // Build Poster OAuth URL
        const posterAuthUrl = new URL('https://joinposter.com/api/auth');
        posterAuthUrl.searchParams.set('application_id', appId);
        posterAuthUrl.searchParams.set('response_type', 'code');
        posterAuthUrl.searchParams.set('redirect_uri', redirectUri);
        posterAuthUrl.searchParams.set('state', `${state}:${restaurantId}`);

        console.log('🚀 Redirecting to Poster OAuth:', posterAuthUrl.toString());

        // Redirect to Poster OAuth
        return redirect(posterAuthUrl.toString(), 302);

    } catch (error) {
        console.error('OAuth authorization error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to initiate OAuth flow'
        }), { status: 500 });
    }
}
