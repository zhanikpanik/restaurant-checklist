import { getDbClient, safeRelease } from '../../../lib/db-helper.js';

export const prerender = false;

// AI SERVICE CALL (ANTHROPIC CLAUDE)
async function getAiCategories(productNames) {
    console.log(`🤖 Sending ${productNames.length} product names to Anthropic Claude for categorization...`);
    const prompt = `You are a restaurant supply chain expert. Your task is to categorize a given list of product names into logical, general groups suitable for a restaurant inventory system. Examples of good categories are: Alcohol, Meat, Fish & Seafood, Vegetables, Fruits, Dairy & Eggs, Groceries, Beverages, Bakery, Cleaning Supplies.\n\nHere is the list of products:\n<products>\n${productNames.join('\n')}\n</products>\n\nPlease respond with ONLY a single valid JSON object where the keys are the exact product names from the list and the values are their assigned category. Do not include any text or explanation before or after the JSON object.`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 4096,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`AI API request failed with status ${response.status}: ${errorBody}`);
        }

        const result = await response.json();
        const content = result.content[0].text;
        console.log('✅ AI response received.');
        return JSON.parse(content);
    } catch (error) {
        console.error('❌ AI categorization failed:', error);
        throw error;
    }
}

export async function GET() {
    const { client, error } = await getDbClient();

    if (error) return error;

    try {
        console.log('🚀 Starting product categorization process...');

        // Check if we have the required environment variables
        if (!process.env.POSTER_TOKEN || !process.env.ANTHROPIC_API_KEY) {
            throw new Error('Missing required environment variables: POSTER_TOKEN or ANTHROPIC_API_KEY');
        }

        // 1. Fetch all ingredients from Poster
        const ingredientsRes = await fetch(`https://joinposter.com/api/menu.getIngredients?token=${process.env.POSTER_TOKEN}`);
        const ingredientsData = await ingredientsRes.json();
        if (ingredientsData.error) throw new Error('Failed to fetch ingredients from Poster.');
        const allProducts = ingredientsData.response;
        console.log(`✅ Fetched ${allProducts.length} total products from Poster.`);

        // 2. Get AI-powered categories
        const productNames = allProducts.map(p => p.ingredient_name);
        const categorizedProducts = await getAiCategories(productNames);

        // 3. Save categories and products to our database
        await client.query('BEGIN');
        const categoryMap = new Map();

        // Insert categories and get their IDs
        const uniqueCategories = [...new Set(Object.values(categorizedProducts))];
        for (const categoryName of uniqueCategories) {
            const res = await client.query(
                'INSERT INTO product_categories (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
                [categoryName]
            );
            categoryMap.set(categoryName, res.rows[0].id);
        }
        console.log(`💾 Saved ${categoryMap.size} unique categories to the database.`);

        // Insert products with their new category ID
        for (const product of allProducts) {
            const categoryName = categorizedProducts[product.ingredient_name];
            const categoryId = categoryName ? categoryMap.get(categoryName) : null;
            await client.query(
                'INSERT INTO products (id, name, unit, category_id) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, unit = EXCLUDED.unit, category_id = EXCLUDED.category_id, last_synced_at = NOW()',
                [product.ingredient_id, product.ingredient_name, product.unit, categoryId]
            );
        }
        console.log(`💾 Saved ${allProducts.length} products with their categories to the database.`);

        await client.query('COMMIT');
        console.log('🎉 Product categorization process completed successfully!');

        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Product categorization completed successfully!',
            categoriesCreated: categoryMap.size,
            productsProcessed: allProducts.length
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ An error occurred during the process:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Product categorization failed',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        safeRelease(client);
    }
}
