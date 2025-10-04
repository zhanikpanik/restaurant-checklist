import pool from '../../lib/db.js';

export async function GET() {
    try {
        const result = await pool.query(
            'SELECT * FROM restaurants WHERE poster_token IS NOT NULL ORDER BY name'
        );
        
        return new Response(JSON.stringify({
            success: true,
            data: result.rows
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        console.error('Error fetching restaurants:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to fetch restaurants'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
}

export async function POST({ request }) {
    try {
        const {
            id,
            name,
            logo,
            primary_color,
            currency,
            poster_token,
            kitchen_storage_id,
            bar_storage_id
        } = await request.json();

        if (!id || !name) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Restaurant ID and name are required'
            }), { status: 400 });
        }

        const result = await pool.query(
            `INSERT INTO restaurants (
                id, name, logo, primary_color, currency,
                poster_token, kitchen_storage_id, bar_storage_id
            )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                id,
                name,
                logo || '🍽️',
                primary_color || '#3B82F6',
                currency || '₽',
                poster_token || null,
                kitchen_storage_id || 1,
                bar_storage_id || 2
            ]
        );
        
        return new Response(JSON.stringify({
            success: true,
            data: result.rows[0]
        }), {
            status: 201,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        console.error('Error creating restaurant:', error);
        
        if (error.code === '23505') { // Unique constraint violation
            return new Response(JSON.stringify({
                success: false,
                error: 'Restaurant with this ID already exists'
            }), { status: 409 });
        }
        
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to create restaurant'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
}

export async function PUT({ request }) {
    try {
        const { id, name, logo, primary_color, currency, is_active } = await request.json();
        
        if (!id || !name) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Restaurant ID and name are required'
            }), { status: 400 });
        }
        
        const result = await pool.query(
            `UPDATE restaurants 
             SET name = $1, logo = $2, primary_color = $3, currency = $4, is_active = $5, updated_at = CURRENT_TIMESTAMP
             WHERE id = $6
             RETURNING *`,
            [name, logo, primary_color, currency, is_active, id]
        );
        
        if (result.rows.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Restaurant not found'
            }), { status: 404 });
        }
        
        return new Response(JSON.stringify({
            success: true,
            data: result.rows[0]
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        console.error('Error updating restaurant:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Failed to update restaurant'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
}
