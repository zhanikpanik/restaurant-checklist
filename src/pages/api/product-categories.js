import pool from "../../lib/db.js";
import { getTenantId } from "../../lib/tenant-manager.js";

export const prerender = false;

export async function GET({ request }) {
  if (!pool) {
    return new Response(
      JSON.stringify({ success: false, error: "Database not available" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const client = await pool.connect();
  try {
    const tenantId = getTenantId(request);

    const result = await client.query(
      `SELECT
        id,
        name,
        supplier_id,
        created_at,
        updated_at
      FROM product_categories
      WHERE restaurant_id = $1
      ORDER BY name ASC`,
      [tenantId],
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: result.rows,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error fetching product categories:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  } finally {
    client.release();
  }
}

export async function POST({ request }) {
  if (!pool) {
    return new Response(
      JSON.stringify({ success: false, error: "Database not available" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const client = await pool.connect();
  try {
    const tenantId = getTenantId(request);
    const { name, supplier_id } = await request.json();

    if (!name) {
      return new Response(
        JSON.stringify({ success: false, error: "Category name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const result = await client.query(
      `INSERT INTO product_categories (restaurant_id, name, supplier_id, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING *`,
      [tenantId, name, supplier_id || null],
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: result.rows[0],
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error creating product category:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  } finally {
    client.release();
  }
}

export async function PUT({ request }) {
  if (!pool) {
    return new Response(
      JSON.stringify({ success: false, error: "Database not available" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const client = await pool.connect();
  try {
    const tenantId = getTenantId(request);
    const { id, name, supplier_id } = await request.json();

    if (!id || !name) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Category ID and name are required",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const result = await client.query(
      `UPDATE product_categories
       SET name = $1, supplier_id = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND restaurant_id = $4
       RETURNING *`,
      [name, supplier_id || null, id, tenantId],
    );

    if (result.rows.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Category not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result.rows[0],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error updating product category:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  } finally {
    client.release();
  }
}

export async function DELETE({ request }) {
  if (!pool) {
    return new Response(
      JSON.stringify({ success: false, error: "Database not available" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const client = await pool.connect();
  try {
    const tenantId = getTenantId(request);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: "Category ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const result = await client.query(
      `DELETE FROM product_categories
       WHERE id = $1 AND restaurant_id = $2
       RETURNING id`,
      [id, tenantId],
    );

    if (result.rows.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Category not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Category deleted successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error deleting product category:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  } finally {
    client.release();
  }
}
