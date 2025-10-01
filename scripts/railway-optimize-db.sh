#!/bin/bash
# This script runs the database optimization on Railway after deployment

echo "🚀 Running database optimization on Railway..."
node scripts/optimize-products-table.cjs

if [ $? -eq 0 ]; then
    echo "✅ Database optimization complete!"
else
    echo "❌ Database optimization failed!"
    exit 1
fi

