import pg from 'pg';

// Create a new pool instance. The pool will read the DATABASE_URL environment variable
// to connect to your PostgreSQL database.
const pool = new pg.Pool({
    connectionString: import.meta.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for some cloud database providers
    }
});

import { setupDatabaseSchema } from './db-schema.js';

// Initialize the database schema on application startup.
// This will create or update tables as needed.
async function initializeDb() {
    try {
        console.log('Initializing database connection and schema...');
        await setupDatabaseSchema();
        console.log('Database initialization complete.');
    } catch (error) {
        console.error('🔴🔴🔴 CRITICAL: Failed to initialize the database. The app may not function correctly. 🔴🔴🔴');
        console.error(error);
    }
}

// We'll export the initialization function to be called from an entry point,
// but also call it here to ensure it runs when the module is loaded.
initializeDb();

// Export the pool for querying the database from other parts of the application
export default pool;
