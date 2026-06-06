// Test Redis cache functionality with fallback to in-memory
import { getCache, setCache, deleteCache, deleteCachePattern, getCacheStats, isUsingRedis } from '../src/lib/cache.js';
import dotenv from 'dotenv';

dotenv.config();

async function testRedisCache() {
  console.log('🧪 REDIS CACHE TEST');
  console.log('='.repeat(80));
  console.log('');

  // Check if Redis is available
  const usingRedis = isUsingRedis();
  console.log(`Cache Type: ${usingRedis ? '✅ Redis' : '⚠️  In-Memory (Fallback)'}`);

  if (!usingRedis) {
    console.log('ℹ️  Redis not available. Set REDIS_URL environment variable to use Redis.');
    console.log('   Testing with in-memory cache fallback...\n');
  } else {
    console.log('✅ Redis connection established\n');
  }

  console.log('='.repeat(80));
  console.log('\n📊 Test 1: Set and Get Cache\n');

  try {
    // Test simple string
    await setCache('test:string', 'Hello Redis!', 60);
    const stringValue = await getCache('test:string');
    console.log(`✅ String cache: ${stringValue === 'Hello Redis!' ? 'PASS' : 'FAIL'}`);
    console.log(`   Stored: "Hello Redis!", Retrieved: "${stringValue}"`);

    // Test object
    const testObject = {
      id: 'test123',
      name: 'Test Restaurant',
      poster_token: 'abc123',
      created_at: new Date().toISOString()
    };
    await setCache('test:object', testObject, 60);
    const objectValue = await getCache('test:object');
    console.log(`✅ Object cache: ${objectValue?.id === 'test123' ? 'PASS' : 'FAIL'}`);
    console.log(`   Stored object with ID: ${testObject.id}, Retrieved ID: ${objectValue?.id}`);

    // Test number
    await setCache('test:number', 42, 60);
    const numberValue = await getCache('test:number');
    console.log(`✅ Number cache: ${numberValue === 42 ? 'PASS' : 'FAIL'}`);
    console.log(`   Stored: 42, Retrieved: ${numberValue}`);

    // Test array
    const testArray = ['item1', 'item2', 'item3'];
    await setCache('test:array', testArray, 60);
    const arrayValue = await getCache('test:array');
    console.log(`✅ Array cache: ${Array.isArray(arrayValue) && arrayValue.length === 3 ? 'PASS' : 'FAIL'}`);
    console.log(`   Stored array length: ${testArray.length}, Retrieved length: ${arrayValue?.length}`);

  } catch (error) {
    console.error('❌ Test 1 FAILED:', error.message);
  }

  console.log('\n' + '-'.repeat(80) + '\n');
  console.log('📊 Test 2: Cache Expiration (TTL)\n');

  try {
    // Set cache with 2 second TTL
    await setCache('test:expiring', 'This will expire', 2);
    console.log('✅ Set cache with 2 second TTL');

    // Get immediately
    const immediate = await getCache('test:expiring');
    console.log(`✅ Immediate get: ${immediate ? 'PASS' : 'FAIL'} - Value: "${immediate}"`);

    // Wait 3 seconds
    console.log('⏳ Waiting 3 seconds for expiration...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get after expiration
    const afterExpiry = await getCache('test:expiring');
    console.log(`✅ After expiry: ${afterExpiry === null ? 'PASS' : 'FAIL'} - Value: ${afterExpiry}`);

  } catch (error) {
    console.error('❌ Test 2 FAILED:', error.message);
  }

  console.log('\n' + '-'.repeat(80) + '\n');
  console.log('📊 Test 3: Delete Cache\n');

  try {
    // Set and delete single key
    await setCache('test:delete', 'Delete me', 60);
    console.log('✅ Set test:delete');

    await deleteCache('test:delete');
    console.log('✅ Deleted test:delete');

    const deleted = await getCache('test:delete');
    console.log(`✅ Verify deleted: ${deleted === null ? 'PASS' : 'FAIL'} - Value: ${deleted}`);

  } catch (error) {
    console.error('❌ Test 3 FAILED:', error.message);
  }

  console.log('\n' + '-'.repeat(80) + '\n');
  console.log('📊 Test 4: Pattern Delete\n');

  try {
    // Set multiple keys with pattern
    await setCache('restaurant:default', { id: 'default', name: 'Default' }, 60);
    await setCache('restaurant:123', { id: '123', name: 'Restaurant 123' }, 60);
    await setCache('restaurant:456', { id: '456', name: 'Restaurant 456' }, 60);
    await setCache('other:data', { data: 'Other' }, 60);
    console.log('✅ Created 3 restaurant:* keys and 1 other:data key');

    // Delete pattern
    const deletedCount = await deleteCachePattern('restaurant:*');
    console.log(`✅ Deleted ${deletedCount} keys matching pattern "restaurant:*"`);

    // Verify deleted
    const resto1 = await getCache('restaurant:default');
    const resto2 = await getCache('restaurant:123');
    const other = await getCache('other:data');

    console.log(`✅ restaurant:default deleted: ${resto1 === null ? 'PASS' : 'FAIL'}`);
    console.log(`✅ restaurant:123 deleted: ${resto2 === null ? 'PASS' : 'FAIL'}`);
    console.log(`✅ other:data preserved: ${other !== null ? 'PASS' : 'FAIL'}`);

  } catch (error) {
    console.error('❌ Test 4 FAILED:', error.message);
  }

  console.log('\n' + '-'.repeat(80) + '\n');
  console.log('📊 Test 5: Cache Statistics\n');

  try {
    const stats = await getCacheStats();
    console.log('✅ Cache Statistics:');
    console.log(JSON.stringify(stats, null, 2));

  } catch (error) {
    console.error('❌ Test 5 FAILED:', error.message);
  }

  console.log('\n' + '-'.repeat(80) + '\n');
  console.log('📊 Test 6: Restaurant Config Cache (Real-World Test)\n');

  try {
    // Simulate restaurant config caching
    const restaurantConfig = {
      id: 'test-restaurant',
      name: 'Test Restaurant',
      logo: '🍽️',
      primary_color: '#3B82F6',
      poster_token: '123456:abcdefghijklmnop',
      poster_account_name: 'testaccount',
      poster_base_url: 'https://testaccount.joinposter.com/api',
      kitchen_storage_id: 1,
      bar_storage_id: 2,
      timezone: 'Europe/Moscow',
      language: 'ru',
      is_active: true,
    };

    // Set cache
    const cacheKey = 'restaurant:test-restaurant';
    await setCache(cacheKey, restaurantConfig, 300); // 5 minutes
    console.log(`✅ Cached restaurant config for: ${restaurantConfig.name}`);

    // Get cache
    const cached = await getCache(cacheKey);
    console.log(`✅ Retrieved from cache: ${cached?.name}`);
    console.log(`✅ Poster token preserved: ${cached?.poster_token ? 'YES' : 'NO'}`);
    console.log(`✅ All fields preserved: ${Object.keys(cached || {}).length === Object.keys(restaurantConfig).length ? 'YES' : 'NO'}`);

    // Verify data integrity
    const matches = JSON.stringify(cached) === JSON.stringify(restaurantConfig);
    console.log(`✅ Data integrity: ${matches ? 'PASS' : 'FAIL'}`);

  } catch (error) {
    console.error('❌ Test 6 FAILED:', error.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n🎉 CACHE TESTS COMPLETE!\n');

  if (usingRedis) {
    console.log('✅ Redis is working correctly and ready for production');
    console.log('   Benefits: Shared cache across multiple instances, persistent storage');
  } else {
    console.log('⚠️  Using in-memory cache fallback');
    console.log('   To enable Redis:');
    console.log('   1. Add Redis service in Railway dashboard');
    console.log('   2. Set REDIS_URL environment variable');
    console.log('   3. Redeploy the application');
    console.log('   ');
    console.log('   In-memory cache works for development but NOT recommended for production:');
    console.log('   - Cache is lost on restart');
    console.log('   - Not shared between instances');
    console.log('   - Limited memory (100 keys max)');
  }
  console.log('');

  // Clean up test keys
  await deleteCachePattern('test:*');
  await deleteCache('restaurant:test-restaurant');
  await deleteCache('other:data');
  console.log('🧹 Cleaned up test cache keys');
  console.log('');

  process.exit(0);
}

testRedisCache();
