import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

dotenv.config();

async function fixSectionProducts() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check section_products structure
    const columnsResult = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'section_products'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 section_products columns:', columnsResult.rows.map(r => r.column_name).join(', '));

    // Get section IDs from "asdasd" that need to be mapped to "default" sections
    const asdasdSections = await client.query(`
      SELECT id, name, poster_storage_id
      FROM sections
      WHERE restaurant_id = 'asdasd'
    `);

    console.log(`\n🔍 Found ${asdasdSections.rows.length} sections with restaurant_id = "asdasd"`);

    if (asdasdSections.rows.length === 0) {
      console.log('✅ No sections to migrate - they were already migrated!');

      // Check if products exist linked to default sections
      const defaultSections = await client.query(`
        SELECT id, name FROM sections WHERE restaurant_id = 'default'
      `);

      console.log(`\n📦 Sections in "default" tenant: ${defaultSections.rows.length}`);

      for (const section of defaultSections.rows) {
        const productsCount = await client.query(`
          SELECT COUNT(*) FROM section_products WHERE section_id = $1
        `, [section.id]);

        console.log(`   - ${section.name} (ID: ${section.id}): ${productsCount.rows[0].count} products`);
      }

      return;
    }

    // For each asdasd section, find matching default section and update products
    for (const asdasdSection of asdasdSections.rows) {
      // Find matching default section by name and poster_storage_id
      const defaultSection = await client.query(`
        SELECT id, name
        FROM sections
        WHERE restaurant_id = 'default'
        AND (name = $1 OR poster_storage_id = $2)
        LIMIT 1
      `, [asdasdSection.name, asdasdSection.poster_storage_id]);

      if (defaultSection.rows.length === 0) {
        console.log(`⚠️  No matching "default" section found for "${asdasdSection.name}"`);
        continue;
      }

      const defaultSectionId = defaultSection.rows[0].id;

      // Update section_products to point to default section
      const updateResult = await client.query(`
        UPDATE section_products
        SET section_id = $1
        WHERE section_id = $2
        RETURNING id
      `, [defaultSectionId, asdasdSection.id]);

      console.log(`✅ Moved ${updateResult.rows.length} products from "${asdasdSection.name}" (asdasd) to (default)`);
    }

    // Delete old asdasd sections (products are now linked to default sections)
    const deleteResult = await client.query(`
      DELETE FROM sections WHERE restaurant_id = 'asdasd' RETURNING name
    `);

    console.log(`\n🗑️  Deleted ${deleteResult.rows.length} old "asdasd" sections`);

    console.log('\n🎉 Section products migration completed!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

fixSectionProducts();
