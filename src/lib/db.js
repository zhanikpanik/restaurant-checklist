import pg from 'pg';

// Create a new pool instance. The pool will read the DATABASE_URL environment variable
// to connect to your PostgreSQL database.
const pool = new pg.Pool({
    connectionString: import.meta.env.DATABASE_URL || process.env.DATABASE_URL,
    ssl: import.meta.env.DATABASE_URL?.includes('railway.internal') ? false : {
        rejectUnauthorized: false // Required for some cloud database providers
    },
    max: 10, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
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
