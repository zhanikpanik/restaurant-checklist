/**
 * Initialize Poster Sync System
 * 
 * Run this script to set up the sync database schema
 * Usage: node scripts/setup-poster-sync.js
 */

import { setupPosterSyncSchema } from '../lib/poster-sync-schema.js';
import pool from '../lib/db.js';

async function main() {
  console.log('🚀 Setting up Poster Sync System...\n');

  try {
    // Setup sync schema
    await setupPosterSyncSchema();

    console.log('\n✅ Poster sync system is ready!');
    console.log('\n📝 Next steps:');
    console.log('1. Set CRON_SECRET in your .env file');
    console.log('2. Deploy to Vercel (cron will auto-start)');
    console.log('3. Or manually trigger sync via /api/poster/sync');
    console.log('\n📖 Read POSTER_SYNC_GUIDE.md for more info\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  } finally {
    // Close pool
    if (pool) {
      await pool.end();
    }
  }
}

main();
