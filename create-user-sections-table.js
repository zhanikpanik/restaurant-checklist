const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL || "postgresql://postgres:mDnveVoNDWBsLgykdqCrKmBJAfJGKoMf@shortline.proxy.rlwy.net:37099/railway";

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function createTable() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('Creating user_sections table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sections (
        user_id INTEGER NOT NULL,
        section_id INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT pk_user_sections PRIMARY KEY (user_id, section_id)
      );
    `);
    console.log('✅ Table user_sections created (or already exists).');

    // Add foreign keys if they don't exist
    // We wrap in try/catch because adding constraints that exist might fail depending on PG version/syntax used
    try {
      console.log('Adding foreign keys...');
      await client.query(`
        ALTER TABLE user_sections 
        ADD CONSTRAINT fk_user_sections_user 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
      `);
      console.log('✅ FK user_id added.');
    } catch (e) {
      console.log('ℹ️ FK user_id might already exist or users table missing:', e.message);
    }

    try {
      await client.query(`
        ALTER TABLE user_sections 
        ADD CONSTRAINT fk_user_sections_section 
        FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE;
      `);
      console.log('✅ FK section_id added.');
    } catch (e) {
      console.log('ℹ️ FK section_id might already exist or sections table missing:', e.message);
    }
    
    // Enable RLS?
    // Based on other tables, RLS might be used. 
    // But since this is a linking table for users, maybe not strictly needed if queries filter by user_id anyway.
    // However, if we want multi-tenant safety, we might need to join with sections to check restaurant_id, 
    // or just rely on the application logic.
    // For now, I'll just create the table.

    client.release();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

createTable();
