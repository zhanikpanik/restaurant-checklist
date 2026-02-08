#!/bin/bash

# Migration script to add supplier_id to section_products
# This simplifies the data model from Ingredients->Categories->Suppliers to Ingredients->Suppliers

echo "🔄 Running database migration: Add supplier_id to section_products"
echo ""

# Try to load .env file from parent directory
if [ -f "../.env" ]; then
    echo "📄 Loading environment variables from .env file..."
    export $(cat ../.env | grep -v '^#' | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set it by either:"
    echo "  1. Adding it to ../.env file:"
    echo "     DATABASE_URL='postgresql://user:password@localhost:5432/dbname'"
    echo ""
    echo "  2. Or export it manually:"
    echo "     export DATABASE_URL='postgresql://user:password@localhost:5432/dbname'"
    echo ""
    exit 1
fi

# Run the migration
echo "Running migration..."
psql "$DATABASE_URL" -f "$(dirname "$0")/migrations/add_supplier_to_products.sql"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "Changes made:"
    echo "  - Added supplier_id column to section_products table"
    echo "  - Migrated existing supplier links from categories to products"
    echo "  - Created index for better performance"
    echo ""
    echo "Next steps:"
    echo "  1. Restart your server: npm run dev"
    echo "  2. Products now link directly to suppliers (no categories needed)"
    echo "  3. Categories are still available if you want to use them for organization"
else
    echo ""
    echo "❌ Migration failed!"
    echo "Please check the error messages above and fix any issues."
    exit 1
fi
