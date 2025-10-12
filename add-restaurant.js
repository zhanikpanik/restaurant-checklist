import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function addRestaurant() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Prompt for restaurant details
    const restaurantId = 'restaurant2'; // Change this to your restaurant ID
    const restaurantName = 'Second Restaurant'; // Change this
    const posterToken = 'YOUR_POSTER_TOKEN_HERE'; // Get from Poster dashboard
    const posterAccountName = null; // Optional: Poster account name

    console.log('\n📝 Adding new restaurant:');
    console.log('   ID:', restaurantId);
    console.log('   Name:', restaurantName);

    // Insert new restaurant
    await client.query(`
      INSERT INTO restaurants (
        id, name, logo, primary_color, currency,
        poster_token, poster_account_name, poster_base_url,
        kitchen_storage_id, bar_storage_id,
        timezone, language, whatsapp_enabled, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      restaurantId,
      restaurantName,
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

    console.log('✅ Restaurant created successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Access this restaurant by setting a cookie:');
    console.log('   document.cookie = "tenant=restaurant2; path=/; max-age=31536000";');
    console.log('\n2. Or use query parameter:');
    console.log('   http://localhost:3000/?tenant=restaurant2');
    console.log('\n3. Or deploy with subdomain:');
    console.log('   https://restaurant2.yourdomain.com');

  } catch (error) {
    console.error('❌ Failed to add restaurant:', error.message);

    if (error.code === '23505') {
      console.log('\n⚠️  Restaurant with this ID already exists!');
      console.log('   Choose a different restaurant ID.');
    }
  } finally {
    await client.end();
  }
}

addRestaurant();
