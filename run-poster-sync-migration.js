/**
 * Run Poster Sync Schema Migration
 * 
 * This creates the necessary tables for the Poster sync system.
 * Run once after deploying the sync system.
 * 
 * Usage:
 *   node run-poster-sync-migration.js
 */

import { setupPosterSyncSchema } from './lib/poster-sync-schema.js';
import pool from './lib/db.js';

async function runMigration() {
  console.log('🚀 Running Poster Sync Schema Migration...\n');
  
  try {
    await setupPosterSyncSchema();
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 New tables created:');
    console.log('   • poster_sync_status');
    console.log('   • poster_categories');
    console.log('   • poster_products');
    console.log('   • poster_suppliers');
    console.log('   • poster_ingredients');
    console.log('   • poster_storages');
    console.log('\n🎉 Your database is ready for Poster sync!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

runMigration();
