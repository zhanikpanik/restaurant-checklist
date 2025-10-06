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
        console.log('📥 Request headers:', Object.fromEntries(request.headers.entries()));

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
        // Poster uses: GET /api/v2/auth/access_token with simpler params
        const appId = env.POSTER_APP_ID;
        const appSecret = env.POSTER_APP_SECRET;

        if (!appId || !appSecret) {
            console.log('❌ Missing OAuth config - appId:', appId ? 'SET' : 'MISSING', 'appSecret:', appSecret ? 'SET' : 'MISSING');
            return redirect('/?error=oauth_config_missing', 302);
        }

        // Poster uses account-specific subdomain for token exchange
        const tokenUrl = `https://${account}.joinposter.com/api/auth/access_token`;

        const tokenParams = {
            client_id: appId,
            client_secret: appSecret,
            grant_type: 'authorization_code',
            redirect_uri: env.POSTER_REDIRECT_URI,
            code: code
        };

        const tokenBody = new URLSearchParams(tokenParams);

        console.log('🔄 Exchanging OAuth code for access token...');
        console.log('Token URL:', tokenUrl);
        console.log('Token params:', tokenBody.toString().replace(appSecret, '***'));

        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: tokenBody.toString()
        });
        const tokenData = await tokenResponse.json();

        console.log('Token response status:', tokenResponse.status);
        console.log('Token response:', tokenData.access_token ? { access_token: 'RECEIVED', ...tokenData } : tokenData);

        if (!tokenData.access_token) {
            console.error('❌ OAuth token exchange failed:', tokenData);
            return redirect('/?error=token_exchange_failed&details=' + encodeURIComponent(JSON.stringify(tokenData)), 302);
        }

        console.log('✅ OAuth token received for account:', account);

        // Use new_access_token if available (format: account_number:token), otherwise use access_token
        const tokenToStore = tokenData.new_access_token || tokenData.access_token;
        console.log('💾 Storing token:', tokenToStore ? tokenToStore.substring(0, 15) + '...' : 'MISSING');

        // Store access token and account in database
        await pool.query(
            `UPDATE restaurants
             SET poster_token = $1,
                 poster_account_name = $2,
                 oauth_state = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3`,
            [tokenToStore, account, restaurantId]
        );

        // Always sync departments from Poster storages on OAuth
        console.log(`📦 [${restaurantId}] Syncing departments from Poster storages...`);

        try {
            // Fetch all storages from Poster
            const storagesUrl = `https://${account}.joinposter.com/api/storage.getStorages?token=${tokenToStore}`;
            console.log(`📡 [${restaurantId}] Fetching storages from: https://${account}.joinposter.com/api/storage.getStorages`);

            const storagesResponse = await fetch(storagesUrl);
            const storagesData = await storagesResponse.json();

            console.log(`📥 [${restaurantId}] Storage API response:`, JSON.stringify(storagesData).substring(0, 200));

            if (storagesData.error) {
                console.error(`❌ [${restaurantId}] Error fetching storages from Poster:`, storagesData.error);
            } else {
                const storages = storagesData.response || [];
                console.log(`✅ [${restaurantId}] Found ${storages.length} storages in Poster:`, storages.map(s => s.storage_name));

                // Helper function to assign emoji based on storage name
                const getEmojiForStorage = (storageName) => {
                    const name = storageName.toLowerCase();
                    if (name.includes('кухн') || name.includes('kitchen')) return '🍳';
                    if (name.includes('бар') || name.includes('bar')) return '🍷';
                    if (name.includes('склад') || name.includes('storage') || name.includes('warehouse')) return '📦';
                    if (name.includes('офис') || name.includes('office')) return '🏢';
                    if (name.includes('горничн') || name.includes('housekeeping')) return '🧹';
                    if (name.includes('ресепшн') || name.includes('reception')) return '🔔';
                    return '📍';
                };

                // Deactivate all existing Poster-synced departments (ones with poster_storage_id)
                const deactivated = await pool.query(
                    `UPDATE departments
                     SET is_active = false
                     WHERE restaurant_id = $1 AND poster_storage_id IS NOT NULL
                     RETURNING name`,
                    [restaurantId]
                );
                console.log(`🔄 [${restaurantId}] Deactivated ${deactivated.rows.length} old departments:`, deactivated.rows.map(r => r.name));

                // Create/reactivate departments from current Poster storages
                let created = 0;
                let updated = 0;

                for (const storage of storages) {
                    const emoji = getEmojiForStorage(storage.storage_name);
                    console.log(`🔍 [${restaurantId}] Processing storage: ${storage.storage_name} (ID: ${storage.storage_id})`);

                    // Try to reactivate existing department first
                    const reactivated = await pool.query(
                        `UPDATE departments
                         SET is_active = true, name = $1, emoji = $2, updated_at = CURRENT_TIMESTAMP
                         WHERE restaurant_id = $3 AND poster_storage_id = $4
                         RETURNING id`,
                        [storage.storage_name, emoji, restaurantId, storage.storage_id]
                    );

                    if (reactivated.rows.length === 0) {
                        // Create new department if it doesn't exist
                        const inserted = await pool.query(
                            `INSERT INTO departments (name, emoji, poster_storage_id, is_active, restaurant_id)
                             VALUES ($1, $2, $3, true, $4)
                             RETURNING id`,
                            [storage.storage_name, emoji, storage.storage_id, restaurantId]
                        );
                        console.log(`✅ [${restaurantId}] Created department: ${storage.storage_name} (storage_id: ${storage.storage_id}, dept_id: ${inserted.rows[0].id})`);
                        created++;
                    } else {
                        console.log(`✅ [${restaurantId}] Updated department: ${storage.storage_name} (storage_id: ${storage.storage_id}, dept_id: ${reactivated.rows[0].id})`);
                        updated++;
                    }
                }

                console.log(`✅ [${restaurantId}] Department sync complete: ${created} created, ${updated} updated, ${storages.length} total`);
            }
        } catch (error) {
            console.error('❌ Error syncing departments from Poster:', error);
        }

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
