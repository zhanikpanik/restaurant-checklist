import pg from 'pg';

// Create a new pool instance. The pool will read the DATABASE_URL environment variable
// to connect to your PostgreSQL database.
const pool = new pg.Pool({
    connectionString: import.meta.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for some cloud database providers
    }
});

// Function to create the cart_items table if it doesn't exist
export async function initializeDb() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS cart_items (
                id SERIAL PRIMARY KEY,
                product_id VARCHAR(255) NOT NULL,
                name TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                unit VARCHAR(50),
                department VARCHAR(100) NOT NULL,
                restaurant_id VARCHAR(100) DEFAULT 'default_restaurant' NOT NULL, -- For future multi-tenancy
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('Database initialized and cart_items table is ready.');
    } catch (err) {
        console.error('Error initializing database:', err);
    } finally {
        client.release();
    }
}

// Export the pool for querying the database from other parts of the application
export default pool;
