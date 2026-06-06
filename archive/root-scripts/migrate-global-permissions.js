const { Client } = require('pg');
require('dotenv').config();

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS can_send_orders BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS can_receive_supplies BOOLEAN DEFAULT false;
    `);
    console.log('Added global permission columns to users table');

    // Optionally migrate existing data from user_sections if needed,
    // but default false is fine, admins will just re-toggle.
    // Let's migrate them to be safe: if user has any section with can_send_orders = true, set global to true.
    await client.query(`
      UPDATE users u
      SET can_send_orders = true
      WHERE EXISTS (
        SELECT 1 FROM user_sections us 
        WHERE us.user_id = u.id AND us.can_send_orders = true
      );
    `);
    await client.query(`
      UPDATE users u
      SET can_receive_supplies = true
      WHERE EXISTS (
        SELECT 1 FROM user_sections us 
        WHERE us.user_id = u.id AND us.can_receive_supplies = true
      );
    `);
    console.log('Migrated permissions from user_sections to users');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();