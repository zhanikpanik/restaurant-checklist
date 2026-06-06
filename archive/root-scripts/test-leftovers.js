import { posterAPI } from './lib/poster-api.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const envLocalPath = path.join(rootDir, '.env.local');
if (fs.existsSync(envLocalPath)) dotenv.config({ path: envLocalPath });

async function main() {
  console.log("Testing Poster Leftovers...");
  
  if (!process.env.POSTER_ACCESS_TOKEN) {
      console.error("No POSTER_ACCESS_TOKEN in env");
      // Try to find a token in DB if not in env? 
      // For this script, we assume env or hardcoded for testing.
      // But wait, the app uses DB tokens per restaurant. 
      // This script won't work unless I mock the DB call or have a token.
      return;
  }
  
  try {
      // 1. Get Storages
      const storages = await posterAPI.getStorages();
      console.log(`Found ${storages.length} storages:`, storages.map(s => `${s.storage_name} (${s.storage_id})`));
      
      // 2. Get Leftovers for first storage
      if (storages.length > 0) {
          const firstStorageId = Number(storages[0].storage_id);
          console.log(`Fetching leftovers for storage ${firstStorageId}...`);
          
          const leftovers = await posterAPI.getStorageLeftovers(firstStorageId);
          console.log(`Got ${leftovers.length} records.`);
          if (leftovers.length > 0) {
              console.log("Sample item:", leftovers[0]);
          }
      }
  } catch (e) {
      console.error("Error:", e);
  }
}

main();
