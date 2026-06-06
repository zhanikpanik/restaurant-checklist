import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function createDefaultRestaurant() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check if "default" restaurant exists
    const checkResult = await client.query(
      `SELECT id, name FROM restaurants WHERE id = $1`,
      ['default']
    );

    if (checkResult.rows.length > 0) {
      console.log('✅ "default" restaurant already exists');
      console.log('   Name:', checkResult.rows[0].name);
      return;
    }

    // Get poster_token from "asdasd" restaurant if it exists
    const asdasdRestaurant = await client.query(
      `SELECT poster_token, poster_account_name FROM restaurants WHERE id = $1`,
      ['asdasd']
    );

    const posterToken = asdasdRestaurant.rows[0]?.poster_token || process.env.POSTER_ACCESS_TOKEN || process.env.POSTER_TOKEN;
    const posterAccountName = asdasdRestaurant.rows[0]?.poster_account_name;

    // Create "default" restaurant
    await client.query(`
      INSERT INTO restaurants (
        id, name, logo, primary_color, currency,
        poster_token, poster_account_name, poster_base_url,
        kitchen_storage_id, bar_storage_id,
        timezone, language, whatsapp_enabled, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
    `, [
      'default',                          // id
      'Default Restaurant',               // name
      '🍽️',                               // logo
      '#3B82F6',                          // primary_color
      '₽',                                // currency
      posterToken,                        // poster_token
      posterAccountName,                  // poster_account_name
      'https://joinposter.com/api',      // poster_base_url
      1,                                  // kitchen_storage_id
      2,                                  // bar_storage_id
      'Europe/Moscow',                    // timezone
      'ru',                               // language
      true,                               // whatsapp_enabled
      true                                // is_active
    ]);

    console.log('✅ Created "default" restaurant');
    console.log('   ID: default');
    console.log('   Name: Default Restaurant');
    console.log('   Poster Token:', posterToken ? 'YES' : 'NO');

  } catch (error) {
    console.error('❌ Failed to create restaurant:', error);
    throw error;
  } finally {
    await client.end();
  }
}

createDefaultRestaurant();
