#!/usr/bin/env node

/**
 * Script to automatically fix all API endpoints to use db-helper pattern
 * This script updates imports and adds proper error handling
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_DIR = path.join(__dirname, '../src/pages/api');

// Files already fixed
const FIXED_FILES = [
    'save-cart-items.js',
    'get-cart-items.js',
    'clear-cart-items.js',
    'orders-by-supplier.js'
];

function getAllApiFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            files.push(...getAllApiFiles(fullPath));
        } else if (item.name.endsWith('.js')) {
            files.push(fullPath);
        }
    }
    
    return files;
}

function needsFix(content) {
    return content.includes("import pool from") && 
           content.includes("pool.connect()");
}

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (!needsFix(content)) {
        console.log(`⏭️  Skipping ${path.basename(filePath)} - already fixed or doesn't need fixing`);
        return false;
    }
    
    console.log(`🔧 Fixing ${path.basename(filePath)}...`);
    
    // Step 1: Replace pool import
    content = content.replace(
        /import pool from ['"].*db\.js['"];/,
        "import { getDbClient, safeRelease } from '../../lib/db-helper.js';"
    );
    
    // Step 2: Replace pool.connect() patterns
    // Pattern 1: const client = await pool.connect();
    content = content.replace(
        /(\s+)const client = await pool\.connect\(\);/g,
        (match, indent) => {
            return `${indent}const { client, error } = await getDbClient();\n${indent}if (error) return error;\n`;
        }
    );
    
    // Step 3: Replace client.release() with safeRelease(client)
    content = content.replace(
        /(\s+)client\.release\(\);/g,
        '$1safeRelease(client);'
    );
    
    // Write the fixed content
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed ${path.basename(filePath)}`);
    return true;
}

console.log('🚀 Starting API endpoint fix...\n');

const allFiles = getAllApiFiles(API_DIR);
let fixedCount = 0;
let skippedCount = 0;

for (const filePath of allFiles) {
    const relativePath = path.relative(API_DIR, filePath);
    
    if (FIXED_FILES.includes(path.basename(filePath))) {
        console.log(`⏭️  Skipping ${relativePath} - already manually fixed`);
        skippedCount++;
        continue;
    }
    
    try {
        if (fixFile(filePath)) {
            fixedCount++;
        } else {
            skippedCount++;
        }
    } catch (error) {
        console.error(`❌ Error fixing ${relativePath}:`, error.message);
    }
}

console.log(`\n📊 Summary:`);
console.log(`   ✅ Fixed: ${fixedCount} files`);
console.log(`   ⏭️  Skipped: ${skippedCount} files`);
console.log(`   📁 Total: ${allFiles.length} files`);
console.log(`\n✨ Done!`);

