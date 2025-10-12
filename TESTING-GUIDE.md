# Multi-Tenant Testing Guide

This guide will help you verify that the multi-tenant system is working correctly and that multiple restaurants can coexist without data conflicts.

## 🎯 What We're Testing

1. **Data Isolation** - Each restaurant sees only their own data
2. **Poster Sync** - Multiple restaurants can sync from Poster without conflicts
3. **No Cross-Contamination** - Actions in one restaurant don't affect another
4. **OAuth Flow** - New restaurants can connect via OAuth
5. **Tenant Switching** - Can switch between restaurants seamlessly

---

## ✅ Pre-Test Setup

### Current Restaurant Accounts
Based on the database, you have:
- **default** - Default Restaurant (Account: zakup) - Has 6 suppliers, 2 sections, 8 categories, 30 orders
- **245580** - Account 245580 - Has 1 section
- **asdasd** - Account asdasd (zakup) - Empty

---

## 🧪 Test Suite

### Test 1: Verify Database Isolation (Already Done ✅)

We already ran this test with `test-multi-tenant-isolation.js`:

```bash
node scripts/test-multi-tenant-isolation.js
```

**Expected Result:**
- ✅ No duplicate Poster IDs within same restaurant
- ✅ Different restaurants can have same Poster IDs
- ✅ Each restaurant has separate data counts

**Status:** ✅ PASSED

---

### Test 2: Manual Browser Testing - Data Isolation

#### Step 1: View Default Restaurant
1. Open your app: https://restaurant-checklist-production.up.railway.app
2. Go to Manager page: `/manager`
3. Note what you see:
   - [ ] Suppliers listed (should be 6 for default)
   - [ ] Sections/Categories (should be 8 categories)
   - [ ] Orders count

#### Step 2: Switch to Restaurant 245580
1. Add `?tenant=245580` to any page URL
   - Example: `/manager?tenant=245580`
2. Check the data:
   - [ ] Should see DIFFERENT suppliers (or empty)
   - [ ] Should see DIFFERENT sections (should be 1)
   - [ ] Should NOT see data from "default" restaurant

#### Step 3: Switch Back to Default
1. Add `?tenant=default` to URL
2. Verify original data is back:
   - [ ] Original 6 suppliers are still there
   - [ ] Original categories still there
   - [ ] No data was lost or mixed

**Expected Result:** Each tenant shows only their own data

---

### Test 3: Test Poster Sync - No Conflicts

#### For Restaurant 1 (default):
1. Go to `/manager?tenant=default`
2. Click "Синхронизировать с Poster" in each tab:
   - [ ] Sync Suppliers (отделы)
   - [ ] Sync Sections (товары)
   - [ ] Sync Categories
3. Note the counts: `Created: X, Updated: Y`

#### For Restaurant 2 (245580):
1. Go to `/manager?tenant=245580`
2. Click "Синхронизировать с Poster" in each tab
3. Note the counts: `Created: X, Updated: Y`

**Expected Results:**
- ✅ Both syncs should succeed without errors
- ✅ No "duplicate key violation" errors
- ✅ Each restaurant gets their own Poster data
- ✅ Syncing one restaurant doesn't affect the other

**Check for Issues:**
- ❌ If you see: "duplicate key value violates unique constraint" → Migration failed
- ❌ If Restaurant A shows Restaurant B's data after sync → Data leak

---

### Test 4: Create Orders - Isolation Test

#### In Default Restaurant:
1. Go to `/kitchen?tenant=default` or `/bar?tenant=default`
2. Create a new order with a test product
3. Submit the order
4. Go to `/manager?tenant=default`
5. Verify the order appears

#### In Restaurant 245580:
1. Go to `/manager?tenant=245580`
2. Verify the order from "default" does NOT appear here
3. Create a new order in `/kitchen?tenant=245580`
4. Verify it appears in `/manager?tenant=245580`
5. Go back to `/manager?tenant=default`
6. Verify the 245580 order does NOT appear in default

**Expected Result:** Orders are completely isolated per restaurant

---

### Test 5: OAuth Flow - Add New Restaurant

This tests that new restaurants can be added without breaking existing ones.

1. Go to `/setup` (or create this page if needed)
2. Click "Connect with Poster POS"
3. Log in with a NEW Poster account (different from existing ones)
4. After OAuth callback:
   - [ ] Should be redirected to `/manager?tenant=<new_restaurant_id>`
   - [ ] Should see empty/fresh data (no old restaurant data)
   - [ ] Tenant cookie should be set to new restaurant

5. Try syncing data for this new restaurant:
   - [ ] Sync should work without errors
   - [ ] Data should be isolated from other restaurants

6. Switch back to `?tenant=default`:
   - [ ] Original data should still be intact
   - [ ] No mixing of data

**Expected Result:** New restaurants can be added via OAuth without affecting existing ones

---

### Test 6: Stress Test - Same Poster IDs

This test verifies that multiple restaurants can have suppliers/sections with the same Poster IDs.

#### Setup Test Data:
Run this script to verify database allows same Poster IDs:

```bash
node scripts/test-same-poster-ids.js
```

Create this test file if needed - it should:
1. Insert a supplier with `poster_supplier_id=999` for `restaurant_id=default`
2. Insert a supplier with `poster_supplier_id=999` for `restaurant_id=245580`
3. Both inserts should succeed
4. Query should return 2 different suppliers with same Poster ID

**Expected Result:** ✅ No conflicts, both suppliers exist independently

---

### Test 7: Update Operations - No Cross-Updates

1. In `default` restaurant:
   - Update a supplier name
   - Note the supplier's `poster_supplier_id`

2. If `245580` has a supplier with the same `poster_supplier_id`:
   - Verify its name did NOT change
   - Only the default restaurant's supplier should be updated

**Expected Result:** Updates are scoped to the correct restaurant

---

## 🔍 How to Check for Failures

### Database-Level Check
Run the query tool to see current data:

```bash
node scripts/query-constraints.js
```

Check for:
- ✅ All constraints include `restaurant_id` (except section_products which uses section_id)
- ✅ No global constraints like `UNIQUE(name)` without restaurant_id

### Application-Level Check
Look for these ERROR indicators:

❌ **Data Leak Indicators:**
- Seeing another restaurant's suppliers/products/orders
- Counts changing when switching tenants
- Orders from one restaurant appearing in another

❌ **Constraint Violation Indicators:**
- Error: "duplicate key value violates unique constraint"
- Sync operations failing
- Can't create suppliers/sections with same name

❌ **Tenant Isolation Issues:**
- Tenant cookie not persisting after OAuth
- Query param `?tenant=X` not working
- Seeing mixed data from multiple restaurants

---

## 🎬 Quick 5-Minute Test

If you want a fast verification, do this:

1. **Check database constraints:**
   ```bash
   node scripts/query-constraints.js
   ```
   Look for: All constraints include `restaurant_id`

2. **Test tenant switching:**
   - Visit `/manager?tenant=default`
   - Note supplier count
   - Visit `/manager?tenant=245580`
   - Should see different (or zero) suppliers

3. **Test sync:**
   - In each restaurant, click sync buttons
   - Both should work without errors

4. **Run isolation test:**
   ```bash
   node scripts/test-multi-tenant-isolation.js
   ```
   Should show: ✅ MULTI-TENANT ISOLATION TEST COMPLETE!

---

## 📊 Success Criteria

Your system is working correctly if:

- ✅ Database constraints all include `restaurant_id`
- ✅ All automated tests pass
- ✅ Each restaurant sees only their own data
- ✅ Syncing works without "duplicate key" errors
- ✅ Switching tenants works smoothly
- ✅ Orders are isolated per restaurant
- ✅ OAuth creates new restaurants without affecting existing ones
- ✅ No data mixing between restaurants

---

## 🚨 What to Do If Tests Fail

### If you see "duplicate key violation":
1. Check which constraint is failing
2. Re-run the migration: `node scripts/run-multi-tenant-migration.js`
3. Verify constraints: `node scripts/query-constraints.js`

### If you see data mixing between restaurants:
1. Check tenant detection in code
2. Verify `getTenantId()` is being called
3. Check database queries include `WHERE restaurant_id = $1`

### If OAuth doesn't set tenant cookie:
1. Check `src/pages/api/poster/oauth/callback.js`
2. Verify `Set-Cookie` header is being sent
3. Check browser cookies after OAuth

---

## 🎯 Next Steps After Testing

Once all tests pass, you're ready for:
- **Phase 2**: Infrastructure improvements (Redis, RLS, connection pooling)
- **Phase 3**: Async operations and background jobs
- **Phase 4**: Security enhancements
- **Phase 5**: Monitoring and admin dashboard
- **Phase 6**: Advanced features (webhooks, multi-region)

See `SCALE-UP-PLAN.md` for detailed implementation guide.

---

## 📝 Test Results Log

Use this checklist to track your testing:

```
Date: ___________
Tester: ___________

[ ] Test 1: Database Isolation (automated) - PASS/FAIL
[ ] Test 2: Manual Browser - Data Isolation - PASS/FAIL
[ ] Test 3: Poster Sync - No Conflicts - PASS/FAIL
[ ] Test 4: Create Orders - Isolation - PASS/FAIL
[ ] Test 5: OAuth Flow - New Restaurant - PASS/FAIL
[ ] Test 6: Stress Test - Same Poster IDs - PASS/FAIL
[ ] Test 7: Update Operations - No Cross-Updates - PASS/FAIL

Overall Result: PASS / FAIL

Notes:
_________________________________
_________________________________
_________________________________
```

---

**Need Help?**
If tests fail or you see unexpected behavior, check the database logs and application console for error messages. All operations are logged with emoji prefixes (🔄, ✅, ❌) for easy identification.
