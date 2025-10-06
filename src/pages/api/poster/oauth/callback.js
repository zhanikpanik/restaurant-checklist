import pool from '../../../../lib/db.js';
import { env } from '../../../../lib/env.js';

/**
 * OAuth Callback Endpoint
 * Handles the redirect from Poster after user authorization
 * Exchanges authorization code for access token
 */
export async function GET({ request, redirect }) {
    try {
        const url = new URL(request.url);

        // Log full URL for debugging
        console.log('📥 OAuth callback URL:', request.url);

        // Log all parameters for debugging
        const allParams = {};
        url.searchParams.forEach((value, key) => {
            allParams[key] = value;
        });
        console.log('📥 OAuth callback params:', JSON.stringify(allParams, null, 2));

        const account = url.searchParams.get('account');
        const code = url.searchParams.get('code');

        console.log('📊 Parsed params - account:', account, 'code:', code ? 'YES' : 'NO');

        if (!account || !code) {
            console.log('❌ Missing OAuth params - account:', account, 'code:', code ? code.substring(0, 10) + '...' : 'null');
            return redirect('/?error=missing_oauth_params&account=' + (account || 'none') + '&code=' + (code ? 'yes' : 'no'), 302);
        }

        // Poster doesn't return state, so we need to find the restaurant that initiated OAuth
        // by looking for the most recent restaurant with an oauth_state set
        const restaurantCheck = await pool.query(
            'SELECT id, oauth_state FROM restaurants WHERE oauth_state IS NOT NULL ORDER BY updated_at DESC LIMIT 1'
        );

        if (restaurantCheck.rows.length === 0) {
            console.log('❌ No restaurant found with pending OAuth state');
            return redirect('/?error=no_pending_oauth', 302);
        }

        const restaurantId = restaurantCheck.rows[0].id;
        console.log('✅ Found restaurant with pending OAuth:', restaurantId);

        // Exchange authorization code for access token
        const appId = env.POSTER_APP_ID;
        const appSecret = env.POSTER_APP_SECRET;
        const redirectUri = env.POSTER_REDIRECT_URI;

        if (!appId || !appSecret || !redirectUri) {
            return redirect('/?error=oauth_config_missing', 302);
        }

        const tokenUrl = new URL('https://joinposter.com/api/v2/auth/access_token');
        const tokenParams = new URLSearchParams({
            application_id: appId,
            application_secret: appSecret,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code: code
        });

        console.log('🔄 Exchanging OAuth code for access token...');
        const tokenResponse = await fetch(tokenUrl.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: tokenParams.toString()
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            console.error('❌ OAuth token exchange failed:', tokenData);
            return redirect('/?error=token_exchange_failed', 302);
        }

        console.log('✅ OAuth token received for account:', account);

        // Store access token and account in database
        await pool.query(
            `UPDATE restaurants
             SET poster_token = $1,
                 poster_account_name = $2,
                 oauth_state = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [tokenData.access_token, account, restaurantId]
        );

        // Clear restaurant cache
        const { clearRestaurantCache } = await import('../../../../lib/tenant-manager.js');
        clearRestaurantCache(restaurantId);

        console.log(`✅ Restaurant ${restaurantId} connected to Poster account ${account}`);

        // Redirect to restaurant selection or dashboard
        return redirect(`/?restaurant=${restaurantId}&oauth=success`, 302);

    } catch (error) {
        console.error('❌ OAuth callback error:', error);
        return redirect('/?error=oauth_callback_failed', 302);
    }
}
