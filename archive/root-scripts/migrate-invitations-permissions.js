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
      ALTER TABLE invitations 
      ADD COLUMN IF NOT EXISTS can_send_orders BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS can_receive_supplies BOOLEAN DEFAULT false;
    `);
    console.log('Added global permission columns to invitations table');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();