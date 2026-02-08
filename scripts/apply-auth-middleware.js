/**
 * Script to apply authentication middleware to all API routes
 * This ensures all routes verify restaurant_id properly
 */

const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '..', 'app', 'api');

const ROUTES_TO_UPDATE = [
  'categories/route.ts',
  'suppliers/route.ts',
  'products/route.ts',
  'sections/route.ts',
  'section-products/route.ts',
  'sync-sections/route.ts',
];

function updateRoute(filePath) {
  console.log(`\nUpdating: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Add import if not present
  if (!content.includes('import { requireAuth }')) {
    content = content.replace(
      /^(import .* from ["']@\/lib\/db["'];?\n)/m,
      '$1import { requireAuth } from "@/lib/auth";\n'
    );
    modified = true;
    console.log('  ✅ Added requireAuth import');
  }

  // Replace cookie-based restaurant_id extraction with requireAuth
  const patterns = [
    {
      // Pattern 1: tenant cookie
      regex: /const tenantCookie = request\.cookies\.get\("tenant"\);\s*const tenant = tenantCookie\?\.value \|\| "default";/g,
      replacement: `// Authenticate and get restaurant ID
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      return auth;
    }
    const { restaurantId } = auth;`
    },
    {
      // Pattern 2: restaurant_id cookie
      regex: /const restaurantCookie = request\.cookies\.get\("restaurant_id"\);\s*const restaurantId = restaurantCookie\?\.value \|\| "default";/g,
      replacement: `// Authenticate and get restaurant ID
    const auth = await requireAuth(request);
    if (auth instanceof NextResponse) {
      return auth;
    }
    const { restaurantId } = auth;`
    }
  ];

  patterns.forEach(({ regex, replacement }) => {
    if (regex.test(content)) {
      content = content.replace(regex, replacement);
      modified = true;
      console.log('  ✅ Replaced cookie extraction with requireAuth');
    }
  });

  // Replace 'tenant' variable references with 'restaurantId'
  if (content.includes('[tenant]') || content.includes('(tenant)')) {
    content = content.replace(/\[tenant\]/g, '[restaurantId]');
    content = content.replace(/\(tenant\)/g, '(restaurantId)');
    content = content.replace(/\$\{tenant\}/g, '${restaurantId}');
    modified = true;
    console.log('  ✅ Replaced tenant references with restaurantId');
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('  ✅ File updated successfully');
  } else {
    console.log('  ℹ️  No changes needed');
  }

  return modified;
}

function main() {
  console.log('🔒 Applying authentication middleware to API routes...\n');

  let updatedCount = 0;

  ROUTES_TO_UPDATE.forEach(route => {
    const filePath = path.join(API_DIR, route);
    if (fs.existsSync(filePath)) {
      if (updateRoute(filePath)) {
        updatedCount++;
      }
    } else {
      console.log(`⚠️  File not found: ${filePath}`);
    }
  });

  console.log(`\n✅ Complete! Updated ${updatedCount}/${ROUTES_TO_UPDATE.length} routes`);
  console.log('\n📝 Next steps:');
  console.log('1. Review the changes in each file');
  console.log('2. Test each API endpoint');
  console.log('3. Verify restaurant isolation works correctly');
}

main();
