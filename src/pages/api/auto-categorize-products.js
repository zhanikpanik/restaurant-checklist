import { getDbClient, safeRelease } from '../../lib/db-helper.js';
import { getTenantId } from '../../lib/tenant-manager.js';
import 'dotenv/config';

export const prerender = false;

/**
 * Auto-categorize products using AI
 * POST /api/auto-categorize-products
 */
export async function POST({ request }) {
    const tenantId = getTenantId(request);
    const { client, error } = await getDbClient();

    if (error) return error;

    try {
        console.log(`🤖 [${tenantId}] Starting AI-powered auto-categorization...`);

        const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
        console.log('🔑 API Key check:', ANTHROPIC_API_KEY ? 'Found' : 'Not found');

        if (!ANTHROPIC_API_KEY) {
            throw new Error('ANTHROPIC_API_KEY not configured - please add it to your .env file');
        }

        // 1. Create default categories if they don't exist
        const defaultCategories = [
            { name: 'Мясо и птица', keywords: ['мясо', 'курица', 'говядина', 'свинина', 'баранина', 'утка', 'индейка', 'фарш', 'колбаса', 'сосиски'] },
            { name: 'Рыба и морепродукты', keywords: ['рыба', 'лосось', 'тунец', 'креветки', 'кальмар', 'мидии', 'икра', 'краб'] },
            { name: 'Овощи', keywords: ['овощ', 'картофель', 'морковь', 'лук', 'помидор', 'огурец', 'капуста', 'перец', 'баклажан', 'кабачок', 'свекла', 'редис', 'салат', 'зелень'] },
            { name: 'Фрукты и ягоды', keywords: ['фрукт', 'яблоко', 'банан', 'апельсин', 'лимон', 'груша', 'клубника', 'малина', 'черника', 'ягод'] },
            { name: 'Молочные продукты', keywords: ['молоко', 'сыр', 'творог', 'сметана', 'йогурт', 'кефир', 'масло сливочное', 'сливки'] },
            { name: 'Хлеб и выпечка', keywords: ['хлеб', 'булка', 'батон', 'лаваш', 'тесто', 'мука', 'дрожжи'] },
            { name: 'Крупы и макароны', keywords: ['крупа', 'рис', 'гречка', 'макарон', 'спагетти', 'пасты', 'перловка', 'пшено', 'овсянка'] },
            { name: 'Напитки', keywords: ['сок', 'вода', 'чай', 'кофе', 'лимонад', 'морс', 'компот', 'напиток'] },
            { name: 'Алкоголь', keywords: ['вино', 'пиво', 'водка', 'виски', 'коньяк', 'ликер', 'шампанское', 'бренди', 'ром', 'текила'] },
            { name: 'Специи и приправы', keywords: ['специи', 'соль', 'перец', 'приправ', 'соус', 'кетчуп', 'майонез', 'горчица', 'уксус', 'масло растительное'] },
            { name: 'Консервы', keywords: ['консерв', 'маринованн', 'соленн', 'маслин'] },
            { name: 'Сладости', keywords: ['сахар', 'шоколад', 'конфет', 'печенье', 'торт', 'пирожн', 'варенье', 'мед', 'джем'] },
            { name: 'Бакалея', keywords: ['бакалея'] }
        ];

        const categoryMap = {};

        for (const cat of defaultCategories) {
            try {
                // Check if category exists
                const existingCat = await client.query(
                    'SELECT id FROM product_categories WHERE name = $1 AND restaurant_id = $2',
                    [cat.name, tenantId]
                );

                if (existingCat.rows.length > 0) {
                    categoryMap[cat.name] = {
                        id: existingCat.rows[0].id,
                        keywords: cat.keywords
                    };
                } else {
                    // Create category
                    const newCat = await client.query(
                        'INSERT INTO product_categories (name, restaurant_id) VALUES ($1, $2) RETURNING id',
                        [cat.name, tenantId]
                    );
                    categoryMap[cat.name] = {
                        id: newCat.rows[0].id,
                        keywords: cat.keywords
                    };
                }
            } catch (catError) {
                // If duplicate, try to fetch it again
                if (catError.code === '23505') {
                    const existingCat = await client.query(
                        'SELECT id FROM product_categories WHERE name = $1 AND restaurant_id = $2',
                        [cat.name, tenantId]
                    );
                    if (existingCat.rows.length > 0) {
                        categoryMap[cat.name] = {
                            id: existingCat.rows[0].id,
                            keywords: cat.keywords
                        };
                    }
                } else {
                    throw catError;
                }
            }
        }

        console.log(`✅ Created/verified ${Object.keys(categoryMap).length} categories`);

        // 2. Get all products without categories
        const products = await client.query(`
            SELECT sp.id, sp.name
            FROM section_products sp
            JOIN sections s ON sp.section_id = s.id
            WHERE s.restaurant_id = $1 AND sp.is_active = true
              AND (sp.category_id IS NULL OR sp.category_id NOT IN (SELECT pc.id FROM product_categories pc WHERE pc.restaurant_id = $1))
        `, [tenantId]);

        console.log(`📦 Found ${products.rows.length} products to categorize`);

        if (products.rows.length === 0) {
            return new Response(JSON.stringify({
                success: true,
                message: 'No products to categorize',
                data: {
                    totalProducts: 0,
                    categorized: 0,
                    uncategorized: 0,
                    categoriesCreated: Object.keys(categoryMap).length
                }
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        let categorized = 0;
        let uncategorized = 0;

        // 3. Use AI to categorize products in batches
        const BATCH_SIZE = 50; // Process 50 products at a time
        const productBatches = [];

        for (let i = 0; i < products.rows.length; i += BATCH_SIZE) {
            productBatches.push(products.rows.slice(i, i + BATCH_SIZE));
        }

        const categoryNames = Object.keys(categoryMap);

        for (let batchIndex = 0; batchIndex < productBatches.length; batchIndex++) {
            const batch = productBatches[batchIndex];
            console.log(`🤖 Processing batch ${batchIndex + 1}/${productBatches.length} (${batch.length} products)`);

            // Prepare prompt for AI
            const productList = batch.map((p, idx) => `${idx + 1}. ${p.name}`).join('\n');

            const prompt = `You are a restaurant inventory categorization expert. Categorize these products into the most appropriate category.

Available categories:
${categoryNames.map((name, idx) => `${idx + 1}. ${name}`).join('\n')}

Products to categorize:
${productList}

Return ONLY a JSON array with this exact format, no additional text:
[{"product_index": 1, "category": "Category Name"}, {"product_index": 2, "category": "Category Name"}, ...]

For each product, return the category name from the available categories list. If unsure, use your best judgment based on the product name.`;

            try {
                // Call Claude API
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': ANTHROPIC_API_KEY,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({
                        model: 'claude-3-5-haiku-20241022',
                        max_tokens: 4096,
                        messages: [{
                            role: 'user',
                            content: prompt
                        }]
                    })
                });

                const aiResult = await response.json();

                if (!aiResult.content || !aiResult.content[0] || !aiResult.content[0].text) {
                    console.error('Invalid AI response:', aiResult);
                    uncategorized += batch.length;
                    continue;
                }

                const aiText = aiResult.content[0].text.trim();

                // Extract JSON from response (handle markdown code blocks)
                let jsonText = aiText;
                if (aiText.includes('```json')) {
                    jsonText = aiText.split('```json')[1].split('```')[0].trim();
                } else if (aiText.includes('```')) {
                    jsonText = aiText.split('```')[1].split('```')[0].trim();
                }

                const categorizations = JSON.parse(jsonText);

                // Apply categorizations
                for (const cat of categorizations) {
                    const productIndex = cat.product_index - 1; // Convert to 0-based index
                    if (productIndex >= 0 && productIndex < batch.length) {
                        const product = batch[productIndex];
                        const categoryInfo = categoryMap[cat.category];

                        if (categoryInfo) {
                            await client.query(
                                'UPDATE section_products SET category_id = $1 WHERE id = $2',
                                [categoryInfo.id, product.id]
                            );
                            categorized++;
                        } else {
                            console.warn(`Category not found: ${cat.category} for product: ${product.name}`);
                            uncategorized++;
                        }
                    }
                }

            } catch (aiError) {
                console.error(`Error in AI categorization for batch ${batchIndex + 1}:`, aiError);
                uncategorized += batch.length;
            }
        }

        console.log(`✅ Auto-categorization complete: ${categorized} categorized, ${uncategorized} uncategorized`);

        return new Response(JSON.stringify({
            success: true,
            message: `Auto-categorization complete`,
            data: {
                totalProducts: products.rows.length,
                categorized,
                uncategorized,
                categoriesCreated: Object.keys(categoryMap).length
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error(`❌ [${tenantId}] Error during auto-categorization:`, error);
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
