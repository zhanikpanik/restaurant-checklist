import { getDbClient, safeRelease } from '../../../lib/db-helper.js';

export const prerender = false;

export async function POST({ cookies }) {
  const tenantId = cookies.get('tenant')?.value || 'default';

  const { client, error: dbError } = await getDbClient();
  if (dbError) return dbError;

  try {
    // Get restaurant and token
    const restaurantRes = await client.query(
      'SELECT id, name, poster_account_name FROM restaurants WHERE id = $1',
      [tenantId]
    );

    if (restaurantRes.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'Restaurant not found' }), { status: 404 });
    }

    const restaurant = restaurantRes.rows[0];

    const tokenRes = await client.query(
      'SELECT access_token FROM poster_tokens WHERE restaurant_id = $1 AND is_active = true',
      [tenantId]
    );

    if (tokenRes.rows.length === 0) {
      return new Response(JSON.stringify({ error: 'No Poster token found' }), { status: 401 });
    }

    const accessToken = tokenRes.rows[0].access_token;

    // Fetch storages from Poster
    const posterUrl = `https://${restaurant.poster_account_name}.joinposter.com/api/storage.getStorages?token=${accessToken}`;
    const posterRes = await fetch(posterUrl);
    const posterData = await posterRes.json();

    if (posterData.error) {
      return new Response(JSON.stringify({ error: `Poster API error: ${posterData.error}` }), { status: 400 });
    }

    const storages = posterData.response || [];
    const synced = [];

    for (const storage of storages) {
      // Get emoji for storage name
      const emojiMap = {
        'кухня': '🍳', 'kitchen': '🍳',
        'бар': '🍷', 'bar': '🍷',
        'склад': '📦', 'storage': '📦'
      };

      let emoji = '📦';
      const nameLower = storage.storage_name.toLowerCase();
      for (const [key, value] of Object.entries(emojiMap)) {
        if (nameLower.includes(key)) {
          emoji = value;
          break;
        }
      }

      // Upsert department
      const result = await client.query(`
        INSERT INTO departments (name, emoji, poster_storage_id, restaurant_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (restaurant_id, poster_storage_id)
        DO UPDATE SET name = $1, emoji = $2, is_active = true
        RETURNING id, name
      `, [storage.storage_name, emoji, parseInt(storage.storage_id), tenantId]);

      synced.push(result.rows[0]);
    }

    return new Response(JSON.stringify({
      success: true,
      restaurant: restaurant.name,
      synced_count: synced.length,
      departments: synced
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error syncing departments:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  } finally {
    safeRelease(client);
  }
}
