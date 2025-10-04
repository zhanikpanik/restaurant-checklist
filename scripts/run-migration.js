import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

async function runMigration() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('railway') || process.env.DATABASE_URL?.includes('render')
            ? { rejectUnauthorized: false }
            : false
    });

    try {
        console.log('🔌 Connecting to database...');
        const client = await pool.connect();
        console.log('✅ Connected to database');

        // Read the migration SQL files
        const migration1SQL = readFileSync(
            join(__dirname, 'add-poster-token-columns.sql'),
            'utf-8'
        );

        const migration2SQL = readFileSync(
            join(__dirname, 'add-restaurant-id-to-tables.sql'),
            'utf-8'
        );

        console.log('📄 Running migrations...\n');

        console.log('1️⃣ Adding poster_token columns...');
        await client.query(migration1SQL);
        console.log('✅ Poster token columns migration complete\n');

        console.log('2️⃣ Adding restaurant_id to tables...');
        const result = await client.query(migration2SQL);

        console.log('\n✅ Migration completed successfully!');
        console.log('\n📊 Results:');
        if (result && Array.isArray(result)) {
            result.forEach((r, i) => {
                if (r.rows && r.rows.length > 0) {
                    console.log(`\nQuery ${i + 1}:`);
                    console.table(r.rows);
                }
            });
        }

        client.release();
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    } finally {
        await pool.end();
        console.log('\n🔌 Database connection closed');
    }
}

runMigration();
