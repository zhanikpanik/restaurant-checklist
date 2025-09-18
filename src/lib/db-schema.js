import pool from './db.js';

export async function setupDatabaseSchema() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Setting up database schema...');
        
        // Create restaurants table first (for tenant management)
        await client.query(`
            CREATE TABLE IF NOT EXISTS restaurants (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                logo VARCHAR(10) DEFAULT '🍽️',
                primary_color VARCHAR(7) DEFAULT '#3B82F6',
                currency VARCHAR(3) DEFAULT '₽',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active BOOLEAN DEFAULT true
            );
        `);
        
        // Insert default restaurants if they don't exist
        await client.query(`
            INSERT INTO restaurants (id, name, logo, primary_color) 
            VALUES 
                ('default', 'Default Restaurant', '🍽️', '#3B82F6'),
                ('restaurant1', 'Restaurant One', '🍕', '#EF4444'),
                ('restaurant2', 'Restaurant Two', '🍣', '#10B981'),
                ('pizzaplace', 'Pizza Place', '🍕', '#F59E0B'),
                ('sushibar', 'Sushi Bar', '🍣', '#8B5CF6')
            ON CONFLICT (id) DO NOTHING;
        `);

        // Create suppliers table with restaurant_id
        await client.query(`
            CREATE TABLE IF NOT EXISTS suppliers (
                id SERIAL PRIMARY KEY,
                restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(20),
                email VARCHAR(255),
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(restaurant_id, name)
            );
        `);

        // Create product_categories table with restaurant_id
        await client.query(`
            CREATE TABLE IF NOT EXISTS product_categories (
                id SERIAL PRIMARY KEY,
                restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(restaurant_id, name)
            );
        `);

        // Create products table with restaurant_id
        await client.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                category_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,
                supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
                poster_id VARCHAR(100),
                unit VARCHAR(50),
                department VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(restaurant_id, name, department)
            );
        `);

        // Create orders table with restaurant_id
        await client.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
                restaurant_id VARCHAR(50) NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
                order_data JSONB NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                created_by_role VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sent_at TIMESTAMP,
                delivered_at TIMESTAMP
            );
        `);

        // Create indexes for better performance
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_suppliers_restaurant_id ON suppliers(restaurant_id);
            CREATE INDEX IF NOT EXISTS idx_categories_restaurant_id ON product_categories(restaurant_id);
            CREATE INDEX IF NOT EXISTS idx_products_restaurant_id ON products(restaurant_id);
            CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
            CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(restaurant_id, status);
        `);

        console.log('✅ Database schema setup complete');
        
    } catch (error) {
        console.error('❌ Error setting up database schema:', error);
        throw error;
    } finally {
        client.release();
    }
}
