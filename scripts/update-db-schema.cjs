const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '..', 'src', 'lib', 'db-schema.js');
let content = fs.readFileSync(schemaPath, 'utf8');

console.log('📝 Updating db-schema.js with new indexes...\n');

// Find the indexes section and add the new product indexes
const oldIndexes = `            CREATE INDEX IF NOT EXISTS idx_suppliers_restaurant_id ON suppliers(restaurant_id);
            CREATE INDEX IF NOT EXISTS idx_categories_restaurant_id ON product_categories(restaurant_id);
            CREATE INDEX IF NOT EXISTS idx_products_restaurant_id ON products(restaurant_id);
            CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
            CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(restaurant_id, status);
            CREATE INDEX IF NOT EXISTS idx_custom_products_department ON custom_products(department_id);
            CREATE INDEX IF NOT EXISTS idx_custom_products_category ON custom_products(category_id);
            CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active);`;

const newIndexes = `            CREATE INDEX IF NOT EXISTS idx_suppliers_restaurant_id ON suppliers(restaurant_id);
            CREATE INDEX IF NOT EXISTS idx_categories_restaurant_id ON product_categories(restaurant_id);
            CREATE INDEX IF NOT EXISTS idx_products_restaurant_id ON products(restaurant_id);
            CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
            CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
            CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
            CREATE INDEX IF NOT EXISTS idx_products_restaurant_category ON products(restaurant_id, category_id);
            CREATE INDEX IF NOT EXISTS idx_products_poster_id ON products(poster_id) WHERE poster_id IS NOT NULL;
            CREATE INDEX IF NOT EXISTS idx_products_department ON products(department);
            CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
            CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(restaurant_id, status);
            CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_custom_products_department ON custom_products(department_id);
            CREATE INDEX IF NOT EXISTS idx_custom_products_category ON custom_products(category_id);
            CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active);`;

content = content.replace(oldIndexes, newIndexes);

fs.writeFileSync(schemaPath, content, 'utf8');

console.log('✅ Updated db-schema.js with 6 new product indexes');
console.log('✅ Added 1 new order index');
console.log('\n📋 New indexes:');
console.log('   • idx_products_category_id');
console.log('   • idx_products_supplier_id');
console.log('   • idx_products_name');
console.log('   • idx_products_restaurant_category');
console.log('   • idx_products_poster_id (partial)');
console.log('   • idx_products_department');
console.log('   • idx_orders_created_at');
console.log('\n✨ Schema file updated for future installations!');

