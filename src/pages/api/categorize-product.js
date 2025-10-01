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
        try {
            // Check if category exists first
            const existsResult = await client.query(
                'SELECT id FROM product_categories WHERE restaurant_id = $1 AND name = $2',
                [restaurantId, category]
            );
            
            if (existsResult.rows.length === 0) {
                // Category doesn't exist, insert it
                await client.query(
                    'INSERT INTO product_categories (restaurant_id, name) VALUES ($1, $2)',
                    [restaurantId, category]
                );
            }
        } catch (err) {
            // Ignore duplicate key errors
            if (err.code !== '23505') {
                throw err;
            }
        }
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
async function categorizeWithAI(productName, availableCategories) {
    try {
        const categoryNames = availableCategories.map(c => c.name).join(', ');
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 100,
                messages: [
                    {
                        role: 'user',
                        content: `Categorize this product into one of these categories: ${categoryNames}. Return ONLY the category name, nothing else. Product: "${productName}"`
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
        const suggestedCategory = data.content[0].text.trim();
        
        console.log(`🤖 AI suggested "${suggestedCategory}" for "${productName}"`);
        
        // Find matching category (case-insensitive)
        const matchedCategory = availableCategories.find(
            c => c.name.toLowerCase() === suggestedCategory.toLowerCase()
        );
        
        if (matchedCategory) {
            return matchedCategory.id;
        }
        
        console.warn(`⚠️ AI returned category "${suggestedCategory}" not in available list`);
        return null;
    } catch (error) {
        console.error('AI Categorization error:', error);
        return null;
    }
}

export async function POST({ request }) {
    const { productId, categoryId, productName } = await request.json();
    const { client, error } = await getDbClient();

    if (error) return error;


    try {
        await client.query('BEGIN');
        
        const restaurantId = 'default';
        
        // Ensure database schema is set up
        await ensureCategoriesTable(client);
        await ensureProductCategoryColumn(client);

        let finalCategoryId = categoryId;

        // If no category provided, use AI to suggest one
        if (!finalCategoryId && productName) {
            // Get available categories from database
            const categoriesResult = await client.query(
                'SELECT id, name FROM product_categories WHERE restaurant_id = $1 ORDER BY name',
                [restaurantId]
            );
            
            if (categoriesResult.rows.length === 0) {
                throw new Error('No categories available. Please create categories first.');
            }
            
            console.log(`🤖 Categorizing "${productName}" using ${categoriesResult.rows.length} available categories`);
            
            // Ask AI to choose from available categories
            finalCategoryId = await categorizeWithAI(productName, categoriesResult.rows);
            
            if (!finalCategoryId) {
                console.warn(`⚠️ Could not categorize "${productName}"`);
                // Don't fail, just skip this product
                await client.query('COMMIT');
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Could not determine appropriate category'
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // Update or insert product category (UPSERT)
        if (productId !== undefined) {
            try {
                // Try to update first (allow null categoryId to clear category)
                const updateResult = await client.query(
                    'UPDATE products SET category_id = $1 WHERE id = $2',
                    [finalCategoryId, productId]
                );
                
                if (updateResult.rowCount > 0) {
                    console.log(`✅ Updated category ${finalCategoryId || 'NULL'} for product ${productId}`);
                } else {
                    // Product doesn't exist in database
                    if (finalCategoryId) {
                        // Check if it exists first (might be without restaurant_id)
                        const existsResult = await client.query(
                            'SELECT id FROM products WHERE id = $1 LIMIT 1',
                            [productId]
                        );
                        
                        if (existsResult.rows.length > 0) {
                            // Exists but UPDATE didn't work, try without restaurant_id filter
                            await client.query(
                                'UPDATE products SET category_id = $1 WHERE id = $2',
                                [finalCategoryId, productId]
                            );
                            console.log(`✅ Updated category ${finalCategoryId} for product ${productId} (without restaurant filter)`);
                        } else {
                            // Truly doesn't exist, insert it
                            try {
                                await client.query(
                                    `INSERT INTO products (id, restaurant_id, category_id, name, created_at) 
                                     VALUES ($1, $2, $3, $4, NOW())`,
                                    [productId, restaurantId, finalCategoryId, productName || `Product ${productId}`]
                                );
                                console.log(`✅ Inserted product ${productId} with category ${finalCategoryId}`);
                            } catch (insertErr) {
                                console.warn(`⚠️ Could not insert product ${productId}:`, insertErr.message);
                                // Product might have been inserted by another request, try update again
                                await client.query(
                                    'UPDATE products SET category_id = $1 WHERE id = $2',
                                    [finalCategoryId, productId]
                                );
                            }
                        }
                    } else {
                        console.log(`⚠️ Product ${productId} not in database, skipping (no category to set)`);
                    }
                }
            } catch (err) {
                console.error(`Error updating product ${productId}:`, err.message);
                throw err;
            }
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
