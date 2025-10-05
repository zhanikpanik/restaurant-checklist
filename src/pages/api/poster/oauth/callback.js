import pool from '../../../../lib/db.js';

/**
 * OAuth Callback Endpoint
 * Handles the redirect from Poster after user authorization
 * Exchanges authorization code for access token
 */
export async function GET({ request, redirect }) {
    try {
        const url = new URL(request.url);

        // Log all parameters for debugging
        const allParams = {};
        url.searchParams.forEach((value, key) => {
            allParams[key] = value;
        });
        console.log('📥 OAuth callback received with params:', JSON.stringify(allParams, null, 2));

        const account = url.searchParams.get('account');
        const code = url.searchParams.get('code');
        const stateParam = url.searchParams.get('state');

        if (!account || !code || !stateParam) {
            console.log('❌ Missing OAuth params - account:', account, 'code:', code, 'state:', stateParam);
            return redirect('/?error=missing_oauth_params', 302);
        }

        // Parse state (format: "state:restaurantId")
        const [state, restaurantId] = stateParam.split(':');

        if (!state || !restaurantId) {
            return redirect('/?error=invalid_state', 302);
        }

        // Verify state to prevent CSRF
        const stateCheck = await pool.query(
            'SELECT oauth_state FROM restaurants WHERE id = $1',
            [restaurantId]
        );

        if (stateCheck.rows.length === 0 || stateCheck.rows[0].oauth_state !== state) {
            return redirect('/?error=state_mismatch', 302);
        }

        // Exchange authorization code for access token
        const appId = process.env.POSTER_APP_ID || import.meta.env.POSTER_APP_ID;
        const appSecret = process.env.POSTER_APP_SECRET || import.meta.env.POSTER_APP_SECRET;
        const redirectUri = process.env.POSTER_REDIRECT_URI || import.meta.env.POSTER_REDIRECT_URI;

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
