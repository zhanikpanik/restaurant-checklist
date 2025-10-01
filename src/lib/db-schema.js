import pool from './db.js';

export async function setupDatabaseSchema() {
    if (!pool) {
        console.error('❌ Cannot setup database schema: pool is not initialized');
        throw new Error('Database pool not initialized');
    }
    
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
                contact_info TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(restaurant_id, name)
            );
        `);

        // Migrate existing suppliers table if needed (add contact_info column if it doesn't exist)
        try {
            await client.query(`
                ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_info TEXT;
            `);
            console.log('✅ Suppliers table migration complete');
        } catch (migrationError) {
            console.log('ℹ️ Suppliers table migration skipped (already up to date)');
        }

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

        // Migration: Add supplier_id column if it doesn't exist
        try {
            await client.query(`
                ALTER TABLE product_categories 
                ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL;
            `);
            console.log('✅ Product categories supplier_id column migration complete');
        } catch (migrationError) {
            console.log('ℹ️ Product categories migration skipped (already up to date)');
        }

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

        // Create departments table for custom sections
        await client.query(`
            CREATE TABLE IF NOT EXISTS departments (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                emoji VARCHAR(10) DEFAULT '📦',
                poster_storage_id INTEGER, -- NULL for custom departments, 1=kitchen, 2=bar
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Insert default departments
        await client.query(`
            INSERT INTO departments (name, emoji, poster_storage_id) VALUES 
                ('Кухня', '🍳', 1),
                ('Бар', '🍷', 2),
                ('Горничная', '🧹', NULL)
            ON CONFLICT (name) DO NOTHING;
        `);

        // Create custom_products table
        await client.query(`
            CREATE TABLE IF NOT EXISTS custom_products (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                unit VARCHAR(50) DEFAULT 'шт',
                category_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,
                department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
                min_quantity INTEGER DEFAULT 1,
                current_quantity INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(name, department_id)
            );
        `);

        // Create indexes for better performance
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_suppliers_restaurant_id ON suppliers(restaurant_id);
            CREATE INDEX IF NOT EXISTS idx_categories_restaurant_id ON product_categories(restaurant_id);
            CREATE INDEX IF NOT EXISTS idx_products_restaurant_id ON products(restaurant_id);
            CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
            CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(restaurant_id, status);
            CREATE INDEX IF NOT EXISTS idx_custom_products_department ON custom_products(department_id);
            CREATE INDEX IF NOT EXISTS idx_custom_products_category ON custom_products(category_id);
            CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active);
        `);

        console.log('✅ Database schema setup complete (including custom products and departments)');
        
    } catch (error) {
        console.error('❌ Error setting up database schema:', error);
        throw error;
    } finally {
        client.release();
    }
}
