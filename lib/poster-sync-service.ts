import pool from "./db";
import { PosterAPI } from "./poster-api";

/**
 * Service for syncing Poster data to local database
 */
export class PosterSyncService {
  private posterAPI: PosterAPI;
  private restaurantId: string;

  constructor(restaurantId: string, accessToken: string) {
    this.restaurantId = restaurantId;
    this.posterAPI = new PosterAPI(accessToken);
  }

  /**
   * Get the last sync time for an entity type
   */
  async getLastSyncTime(entityType: string): Promise<Date | null> {
    if (!pool) throw new Error("Database pool not initialized");

    const result = await pool.query(
      `SELECT last_sync_at FROM poster_sync_status 
       WHERE restaurant_id = $1 AND entity_type = $2`,
      [this.restaurantId, entityType]
    );

    return result.rows[0]?.last_sync_at || null;
  }

  /**
   * Update sync status for an entity type
   */
  async updateSyncStatus(
    entityType: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    if (!pool) throw new Error("Database pool not initialized");

    await pool.query(
      `INSERT INTO poster_sync_status 
       (restaurant_id, entity_type, last_sync_at, last_sync_success, last_sync_error, sync_count, updated_at)
       VALUES ($1, $2, NOW(), $3, $4, 1, NOW())
       ON CONFLICT (restaurant_id, entity_type)
       DO UPDATE SET
         last_sync_at = NOW(),
         last_sync_success = $3,
         last_sync_error = $4,
         sync_count = poster_sync_status.sync_count + 1,
         updated_at = NOW()`,
      [this.restaurantId, entityType, success, error || null]
    );
  }

  /**
   * Sync categories from Poster
   */
  async syncCategories(): Promise<number> {
    console.log(`🔄 [${this.restaurantId}] Syncing categories...`);

    try {
      const categories = await this.posterAPI.getCategories();
      
      if (!categories || !Array.isArray(categories)) {
        throw new Error("Invalid categories response from Poster");
      }

      let syncedCount = 0;

      for (const category of categories) {
        await pool!.query(
          `INSERT INTO poster_categories 
           (restaurant_id, poster_category_id, name, parent_category_id, sort_order, is_visible, synced_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           ON CONFLICT (restaurant_id, poster_category_id)
           DO UPDATE SET
             name = $3,
             parent_category_id = $4,
             sort_order = $5,
             is_visible = $6,
             synced_at = NOW(),
             updated_at = NOW()`,
          [
            this.restaurantId,
            category.category_id || category.id,
            category.category_name || category.name,
            category.parent_category || null,
            category.sort_order || 0,
            category.visible !== 0,
          ]
        );
        syncedCount++;
      }

      await this.updateSyncStatus("categories", true);
      console.log(`✅ [${this.restaurantId}] Synced ${syncedCount} categories`);
      
      return syncedCount;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.updateSyncStatus("categories", false, errorMsg);
      console.error(`❌ [${this.restaurantId}] Failed to sync categories:`, error);
      throw error;
    }
  }

  /**
   * Sync products from Poster
   */
  async syncProducts(): Promise<number> {
    console.log(`🔄 [${this.restaurantId}] Syncing products...`);

    try {
      const products = await this.posterAPI.getProducts();
      
      if (!products || !Array.isArray(products)) {
        throw new Error("Invalid products response from Poster");
      }

      let syncedCount = 0;

      for (const product of products) {
        await pool!.query(
          `INSERT INTO poster_products 
           (restaurant_id, poster_product_id, poster_category_id, name, price, cost, unit, is_visible, synced_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           ON CONFLICT (restaurant_id, poster_product_id)
           DO UPDATE SET
             poster_category_id = $3,
             name = $4,
             price = $5,
             cost = $6,
             unit = $7,
             is_visible = $8,
             synced_at = NOW(),
             updated_at = NOW()`,
          [
            this.restaurantId,
            product.product_id || product.id,
            product.category_id || product.menu_category_id || null,
            product.product_name || product.name,
            product.price || 0,
            product.cost || 0,
            product.unit || 'шт',
            product.visible !== 0,
          ]
        );
        syncedCount++;
      }

      await this.updateSyncStatus("products", true);
      console.log(`✅ [${this.restaurantId}] Synced ${syncedCount} products`);
      
      return syncedCount;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.updateSyncStatus("products", false, errorMsg);
      console.error(`❌ [${this.restaurantId}] Failed to sync products:`, error);
      throw error;
    }
  }

  /**
   * Sync suppliers from Poster
   */
  async syncSuppliers(): Promise<number> {
    console.log(`🔄 [${this.restaurantId}] Syncing suppliers...`);

    try {
      const suppliers = await this.posterAPI.getSuppliers();
      
      if (!suppliers || !Array.isArray(suppliers)) {
        throw new Error("Invalid suppliers response from Poster");
      }

      let syncedCount = 0;

      for (const supplier of suppliers) {
        await pool!.query(
          `INSERT INTO poster_suppliers 
           (restaurant_id, poster_supplier_id, name, phone, email, address, comment, synced_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
           ON CONFLICT (restaurant_id, poster_supplier_id)
           DO UPDATE SET
             name = $3,
             phone = $4,
             email = $5,
             address = $6,
             comment = $7,
             synced_at = NOW(),
             updated_at = NOW()`,
          [
            this.restaurantId,
            supplier.supplier_id,
            supplier.supplier_name,
            supplier.supplier_phone || null,
            null, // email not provided by Poster API
            supplier.supplier_address || supplier.supplier_adress || null,
            null, // comment not provided by Poster API
          ]
        );
        syncedCount++;
      }

      await this.updateSyncStatus("suppliers", true);
      console.log(`✅ [${this.restaurantId}] Synced ${syncedCount} suppliers`);
      
      return syncedCount;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.updateSyncStatus("suppliers", false, errorMsg);
      console.error(`❌ [${this.restaurantId}] Failed to sync suppliers:`, error);
      throw error;
    }
  }

  /**
   * Sync ingredients (storage items) from Poster
   */
  async syncIngredients(): Promise<number> {
    console.log(`🔄 [${this.restaurantId}] Syncing ingredients...`);

    try {
      const ingredients = await this.posterAPI.getIngredients();
      
      if (!ingredients || !Array.isArray(ingredients)) {
        throw new Error("Invalid ingredients response from Poster");
      }

      let syncedCount = 0;

      for (const ingredient of ingredients) {
        await pool!.query(
          `INSERT INTO poster_ingredients 
           (restaurant_id, poster_ingredient_id, poster_category_id, name, unit, unit_weight, cost, is_visible, synced_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           ON CONFLICT (restaurant_id, poster_ingredient_id)
           DO UPDATE SET
             poster_category_id = $3,
             name = $4,
             unit = $5,
             unit_weight = $6,
             cost = $7,
             is_visible = $8,
             synced_at = NOW(),
             updated_at = NOW()`,
          [
            this.restaurantId,
            ingredient.ingredient_id,
            ingredient.ingredient_category_id || null,
            ingredient.ingredient_name,
            ingredient.ingredient_unit || 'шт',
            null, // unit_weight not provided by Poster API
            null, // cost not provided by Poster API
            true, // is_visible - default to true
          ]
        );
        syncedCount++;
      }

      await this.updateSyncStatus("ingredients", true);
      console.log(`✅ [${this.restaurantId}] Synced ${syncedCount} ingredients`);
      
      return syncedCount;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.updateSyncStatus("ingredients", false, errorMsg);
      console.error(`❌ [${this.restaurantId}] Failed to sync ingredients:`, error);
      throw error;
    }
  }

  /**
   * Sync storages from Poster
   */
  async syncStorages(): Promise<number> {
    console.log(`🔄 [${this.restaurantId}] Syncing storages...`);

    try {
      const storages = await this.posterAPI.getStorages();
      
      if (!storages || !Array.isArray(storages)) {
        throw new Error("Invalid storages response from Poster");
      }

      let syncedCount = 0;

      for (const storage of storages) {
        await pool!.query(
          `INSERT INTO poster_storages 
           (restaurant_id, poster_storage_id, name, synced_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())
           ON CONFLICT (restaurant_id, poster_storage_id)
           DO UPDATE SET
             name = $3,
             synced_at = NOW(),
             updated_at = NOW()`,
          [
            this.restaurantId,
            storage.storage_id,
            storage.storage_name,
          ]
        );
        syncedCount++;
      }

      await this.updateSyncStatus("storages", true);
      console.log(`✅ [${this.restaurantId}] Synced ${syncedCount} storages`);
      
      return syncedCount;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await this.updateSyncStatus("storages", false, errorMsg);
      console.error(`❌ [${this.restaurantId}] Failed to sync storages:`, error);
      throw error;
    }
  }

  /**
   * Full sync of all Poster data
   */
  async syncAll(): Promise<{
    categories: number;
    products: number;
    suppliers: number;
    ingredients: number;
    storages: number;
  }> {
    console.log(`🚀 [${this.restaurantId}] Starting full sync...`);
    
    const startTime = Date.now();

    try {
      const results = {
        categories: await this.syncCategories(),
        suppliers: await this.syncSuppliers(),
        storages: await this.syncStorages(),
        ingredients: await this.syncIngredients(),
        products: await this.syncProducts(),
      };

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ [${this.restaurantId}] Full sync completed in ${duration}s`, results);

      return results;
    } catch (error) {
      console.error(`❌ [${this.restaurantId}] Full sync failed:`, error);
      throw error;
    }
  }

  /**
   * Check if sync is needed (based on last sync time)
   */
  async needsSync(entityType: string, maxAgeMinutes: number = 30): Promise<boolean> {
    const lastSync = await this.getLastSyncTime(entityType);
    
    if (!lastSync) {
      return true; // Never synced before
    }

    const ageMinutes = (Date.now() - lastSync.getTime()) / 1000 / 60;
    return ageMinutes >= maxAgeMinutes;
  }

  /**
   * Check if sync should run (based on 24 hour interval)
   */
  async shouldSync(entityType: string): Promise<boolean> {
    const lastSync = await this.getLastSyncTime(entityType);
    if (!lastSync) return true;
    
    const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
    return hoursSinceSync > 24; // Sync if older than 24 hours
  }

  /**
   * Sync a single ingredient by ID (for webhooks)
   */
  async syncSingleIngredient(ingredientId: string): Promise<void> {
    console.log(`🔄 [${this.restaurantId}] Syncing single ingredient: ${ingredientId}`);
    
    try {
      const ingredients = await this.posterAPI.getIngredients();
      const ingredient = ingredients.find(i => i.ingredient_id === ingredientId);
      
      if (!ingredient) {
        console.log(`⚠️ [${this.restaurantId}] Ingredient ${ingredientId} not found or deleted`);
        // Delete from DB if it was removed in Poster
        await pool!.query(
          `DELETE FROM poster_ingredients 
           WHERE restaurant_id = $1 AND poster_ingredient_id = $2`,
          [this.restaurantId, ingredientId]
        );
        return;
      }

      await pool!.query(
        `INSERT INTO poster_ingredients 
         (restaurant_id, poster_ingredient_id, poster_category_id, name, unit, synced_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (restaurant_id, poster_ingredient_id)
         DO UPDATE SET
           poster_category_id = $3,
           name = $4,
           unit = $5,
           synced_at = NOW(),
           updated_at = NOW()`,
        [
          this.restaurantId,
          ingredient.ingredient_id,
          ingredient.ingredient_category_id || null,
          ingredient.ingredient_name,
          ingredient.ingredient_unit || 'шт',
        ]
      );
      
      console.log(`✅ [${this.restaurantId}] Synced ingredient: ${ingredient.ingredient_name}`);
    } catch (error) {
      console.error(`❌ [${this.restaurantId}] Failed to sync ingredient ${ingredientId}:`, error);
      throw error;
    }
  }

  /**
   * Sync a single supplier by ID (for webhooks)
   */
  async syncSingleSupplier(supplierId: number): Promise<void> {
    console.log(`🔄 [${this.restaurantId}] Syncing single supplier: ${supplierId}`);
    
    try {
      const suppliers = await this.posterAPI.getSuppliers();
      const supplier = suppliers.find(s => s.supplier_id === supplierId);
      
      if (!supplier) {
        console.log(`⚠️ [${this.restaurantId}] Supplier ${supplierId} not found or deleted`);
        // Delete from DB if it was removed in Poster
        await pool!.query(
          `DELETE FROM poster_suppliers 
           WHERE restaurant_id = $1 AND poster_supplier_id = $2`,
          [this.restaurantId, supplierId]
        );
        return;
      }

      await pool!.query(
        `INSERT INTO poster_suppliers 
         (restaurant_id, poster_supplier_id, name, phone, email, address, comment, synced_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         ON CONFLICT (restaurant_id, poster_supplier_id)
         DO UPDATE SET
           name = $3,
           phone = $4,
           email = $5,
           address = $6,
           comment = $7,
           synced_at = NOW(),
           updated_at = NOW()`,
        [
          this.restaurantId,
          supplier.supplier_id,
          supplier.supplier_name,
          supplier.supplier_phone || null,
          null, // email not provided by Poster API
          supplier.supplier_address || supplier.supplier_adress || null,
          null, // comment not provided by Poster API
        ]
      );
      
      console.log(`✅ [${this.restaurantId}] Synced supplier: ${supplier.supplier_name}`);
    } catch (error) {
      console.error(`❌ [${this.restaurantId}] Failed to sync supplier ${supplierId}:`, error);
      throw error;
    }
  }

  /**
   * Force sync with option to ignore last sync time
   */
  async forceSyncAll(): Promise<{
    categories: number;
    products: number;
    suppliers: number;
    ingredients: number;
    storages: number;
  }> {
    console.log(`🔄 [${this.restaurantId}] Force syncing all data...`);
    return this.syncAll();
  }
}

/**
 * Get Poster access token for a restaurant
 */
export async function getPosterAccessToken(restaurantId: string): Promise<string | null> {
  if (!pool) throw new Error("Database pool not initialized");

  // First try the dedicated tokens table
  try {
    const tokenResult = await pool.query(
      `SELECT access_token FROM poster_tokens 
       WHERE restaurant_id = $1 AND is_active = true 
       ORDER BY created_at DESC LIMIT 1`,
      [restaurantId]
    );

    if (tokenResult.rows.length > 0) {
      return tokenResult.rows[0].access_token;
    }
  } catch (err) {
    // Table might not exist yet, ignore and fallback
    console.warn("Could not query poster_tokens table:", err);
  }

  // Fallback to restaurants table (legacy location)
  try {
    const restaurantResult = await pool.query(
      `SELECT poster_token FROM restaurants WHERE id = $1`,
      [restaurantId]
    );

    return restaurantResult.rows[0]?.poster_token || null;
  } catch (err) {
    console.error("Could not query restaurants table:", err);
    return null;
  }
}

/**
 * Create sync service instance for a restaurant
 */
export async function createSyncService(restaurantId: string): Promise<PosterSyncService> {
  const accessToken = await getPosterAccessToken(restaurantId);
  
  if (!accessToken) {
    throw new Error(`No active Poster token found for restaurant ${restaurantId}`);
  }

  return new PosterSyncService(restaurantId, accessToken);
}
