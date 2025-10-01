import { getDbClient, safeRelease } from '../../lib/db-helper.js';
import fetch from 'node-fetch';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const DEFAULT_CATEGORIES = [
    'Мясо', 'Рыба', 'Овощи', 'Фрукты', 'Молочные продукты',
    'Крупы', 'Специи', 'Напитки', 'Алкоголь', 'Хлебобулочные',
    'Кондитерские изделия', 'Замороженные продукты', 'Консервы', 'Бакалея', 'Прочее'
];

export const prerender = false;

// Create categories table if it doesn't exist
async function ensureCategoriesTable(client) {
    // Get restaurant_id from tenant middleware (default to 'default' for now)
    const restaurantId = 'default';
    
    // Insert default categories if they don't exist for this restaurant
    for (const category of DEFAULT_CATEGORIES) {
        await client.query(
            'INSERT INTO product_categories (restaurant_id, name) VALUES ($1, $2) ON CONFLICT (restaurant_id, name) DO NOTHING',
            [restaurantId, category]
        );
    }
}

// Add category_id column to products if it doesn't exist (this should already exist in schema)
async function ensureProductCategoryColumn(client) {
    const columnExists = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='products' AND column_name='category_id';
    `);

    if (columnExists.rows.length === 0) {
        await client.query('ALTER TABLE products ADD COLUMN category_id INTEGER REFERENCES product_categories(id)');
    }
}

// AI-based categorization using Anthropic REST API
async function categorizeWithAI(productName) {
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-opus-20240229',
                max_tokens: 100,
                messages: [
                    {
                        role: 'user',
                        content: `Categorize this product into one of these categories: ${DEFAULT_CATEGORIES.join(', ')}. Return only the category name without any additional text. Product: "${productName}"`
                    }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Anthropic API error:', error);
            throw new Error(error.error?.message || 'Failed to categorize product');
        }

        const data = await response.json();
        const category = data.content[0].text.trim();
        
        // Validate that the returned category is in our list
        if (!DEFAULT_CATEGORIES.includes(category)) {
            console.warn('AI returned invalid category:', category);
            return 'Прочее';
        }
        
        return category;
    } catch (error) {
        console.error('AI Categorization error:', error);
        return 'Прочее'; // Default category on error
    }
}

export async function POST({ request }) {
    const { productId, categoryId, productName } = await request.json();
    const { client, error } = await getDbClient();

    if (error) return error;


    try {
        await client.query('BEGIN');
        
        // Ensure database schema is set up
        await ensureCategoriesTable(client);
        await ensureProductCategoryColumn(client);

        let finalCategoryId = categoryId;

        // If no category provided, use AI to suggest one
        if (!finalCategoryId && productName) {
            const restaurantId = 'default';
            const aiCategory = await categorizeWithAI(productName);
            
            // Get or create the AI-suggested category
            const categoryResult = await client.query(
                'INSERT INTO product_categories (restaurant_id, name) VALUES ($1, $2) ON CONFLICT (restaurant_id, name) DO UPDATE SET name=EXCLUDED.name RETURNING id',
                [restaurantId, aiCategory]
            );
            
            finalCategoryId = categoryResult.rows[0].id;
        }

        // Update product category
        if (productId && finalCategoryId) {
            await client.query(
                'UPDATE products SET category_id = $1 WHERE id = $2',
                [finalCategoryId, productId]
            );
        }

        await client.query('COMMIT');

        return new Response(JSON.stringify({
            success: true,
            categoryId: finalCategoryId
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in categorize-product:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        safeRelease(client);
    }
}

// Get all categories
// Get all categories
// Get all categories
export async function GET() {
    const { client, error } = await getDbClient();

    if (error) return error;

    try {
        await client.query('BEGIN');
        
        // Ensure database schema is set up
        await ensureCategoriesTable(client);
        
        const restaurantId = 'default';
        const result = await client.query('SELECT * FROM product_categories WHERE restaurant_id = $1 ORDER BY name', [restaurantId]);
        
        await client.query('COMMIT');
        
        return new Response(JSON.stringify({
            success: true,
            categories: result.rows
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error getting categories:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            categories: DEFAULT_CATEGORIES.map(name => ({ name })) // Fallback to default categories
        }), {
            status: 200, // Still return 200 with fallback data
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        safeRelease(client);
    }
}
