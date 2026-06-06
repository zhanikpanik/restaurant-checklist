require('dotenv').config();
const { Pool } = require('pg');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function cleanOrders() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Order Cleanup Tool\n');
    
    // Show current stats
    const statsResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered
      FROM orders
    `);
    
    const stats = statsResult.rows[0];
    console.log('📊 Current Orders:');
    console.log(`   Total: ${stats.total}`);
    console.log(`   Pending: ${stats.pending}`);
    console.log(`   Sent: ${stats.sent}`);
    console.log(`   Delivered: ${stats.delivered}\n`);
    
    if (stats.total === '0') {
      console.log('✅ No orders to clean!');
      return;
    }
    
    // Show options
    console.log('Choose what to delete:\n');
    console.log('1. Delete ALL orders');
    console.log('2. Delete orders by status (pending/sent/delivered)');
    console.log('3. Delete orders older than X days');
    console.log('4. Delete delivered orders only');
    console.log('5. Cancel\n');
    
    const choice = await question('Enter choice (1-5): ');
    
    let query = '';
    let confirmMsg = '';
    
    switch(choice.trim()) {
      case '1':
        query = 'DELETE FROM orders';
        confirmMsg = `Delete ALL ${stats.total} orders?`;
        break;
        
      case '2':
        const status = await question('Enter status (pending/sent/delivered): ');
        query = `DELETE FROM orders WHERE status = $1`;
        const statusCount = stats[status.trim().toLowerCase()] || 0;
        confirmMsg = `Delete ${statusCount} ${status} orders?`;
        break;
        
      case '3':
        const days = await question('Delete orders older than how many days? ');
        query = `DELETE FROM orders WHERE created_at < NOW() - INTERVAL '${parseInt(days)} days'`;
        const oldResult = await client.query(`
          SELECT COUNT(*) as count 
          FROM orders 
          WHERE created_at < NOW() - INTERVAL '${parseInt(days)} days'
        `);
        confirmMsg = `Delete ${oldResult.rows[0].count} orders older than ${days} days?`;
        break;
        
      case '4':
        query = 'DELETE FROM orders WHERE status = $1';
        confirmMsg = `Delete ${stats.delivered} delivered orders?`;
        break;
        
      case '5':
        console.log('❌ Cancelled');
        return;
        
      default:
        console.log('❌ Invalid choice');
        return;
    }
    
    // Confirm deletion
    console.log(`\n⚠️  ${confirmMsg}`);
    const confirm = await question('Type YES to confirm: ');
    
    if (confirm.trim().toUpperCase() !== 'YES') {
      console.log('❌ Cancelled');
      return;
    }
    
    // Execute deletion
    let result;
    if (choice === '2' || choice === '4') {
      const statusValue = choice === '4' ? 'delivered' : (await question('Enter status again: ')).trim();
      result = await client.query(query, [statusValue]);
    } else {
      result = await client.query(query);
    }
    
    console.log(`\n✅ Deleted ${result.rowCount} orders successfully!`);
    
    // Show new stats
    const newStatsResult = await client.query(`
      SELECT COUNT(*) as total FROM orders
    `);
    console.log(`📊 Remaining orders: ${newStatsResult.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
    rl.close();
  }
}

cleanOrders();


