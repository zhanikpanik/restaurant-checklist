import { Router, Response } from "express";
import { withTenant, withoutTenant } from "../lib/db";
import { requireAuth, AuthenticatedRequest } from "../lib/auth";

const router = Router();

// GET - Sync suppliers from Poster
router.get("/", requireAuth, async (req, res: Response) => {
  try {
    const { restaurantId } = req as AuthenticatedRequest;

    // Get restaurant's Poster token
    const restaurant = await withoutTenant(async (client) => {
      const result = await client.query(
        "SELECT poster_token, poster_account_name FROM restaurants WHERE id = $1",
        [restaurantId]
      );
      return result.rows[0];
    });

    if (!restaurant) {
      return res.status(404).json({ success: false, error: "Restaurant not found" });
    }

    const { poster_token, poster_account_name } = restaurant;

    if (!poster_token || !poster_account_name) {
      return res.status(400).json({ success: false, error: "Poster integration not configured" });
    }

    // Fetch suppliers from Poster
    const suppliersUrl = `https://${poster_account_name}.joinposter.com/api/storage.getSuppliers?token=${poster_token}`;
    console.log("Fetching suppliers from:", suppliersUrl.replace(poster_token, "***"));
    
    const suppliersResponse = await fetch(suppliersUrl);

    if (!suppliersResponse.ok) {
      console.error("Poster API error:", suppliersResponse.status, await suppliersResponse.text());
      return res.status(500).json({ success: false, error: "Failed to fetch suppliers from Poster" });
    }

    const suppliersData = await suppliersResponse.json();
    console.log("Poster suppliers response:", JSON.stringify(suppliersData));
    const suppliers = suppliersData.response || [];

    console.log(`Found ${suppliers.length} suppliers from Poster`);

    // Sync suppliers using withTenant for proper isolation
    const syncedCount = await withTenant(restaurantId, async (client) => {
      let count = 0;
      
      for (const supplier of suppliers) {
        // Check if supplier already exists for this restaurant
        const existingSupplier = await client.query(
          "SELECT id FROM suppliers WHERE poster_supplier_id = $1 AND restaurant_id = $2",
          [supplier.supplier_id, restaurantId]
        );

        if (existingSupplier.rows.length > 0) {
          // Update existing supplier
          await client.query(
            `UPDATE suppliers
             SET name = $1, 
                 phone = $2,
                 contact_info = $3,
                 updated_at = CURRENT_TIMESTAMP
             WHERE poster_supplier_id = $4 AND restaurant_id = $5`,
            [
              supplier.supplier_name,
              supplier.supplier_phone || null,
              supplier.supplier_address || null,
              supplier.supplier_id,
              restaurantId
            ]
          );
        } else {
          // Create new supplier
          await client.query(
            `INSERT INTO suppliers (
              restaurant_id, name, phone, contact_info, poster_supplier_id
            ) VALUES ($1, $2, $3, $4, $5)`,
            [
              restaurantId,
              supplier.supplier_name,
              supplier.supplier_phone || null,
              supplier.supplier_address || null,
              supplier.supplier_id
            ]
          );
        }
        count++;
      }
      
      return count;
    });

    console.log(`Synced ${syncedCount} suppliers`);

    res.json({
      success: true,
      data: { 
        syncedCount,
        suppliers: suppliers.map((s: any) => ({
          id: s.supplier_id,
          name: s.supplier_name,
          phone: s.supplier_phone,
        }))
      },
    });
  } catch (error) {
    console.error("Sync suppliers error:", error);
    res.status(500).json({ success: false, error: "Failed to sync suppliers" });
  }
});

export default router;
