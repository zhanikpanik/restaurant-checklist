# 🔧 Orders & Permissions Debug Fix

**Date:** February 13, 2026  
**Status:** ✅ Fixed

---

## Issues Fixed

### ✅ Issue 1: Staff User Can't See Orders on /orders Page

**Problem:**
- Staff user creates order from Bar department
- Goes to `/orders` page directly
- Page is empty (no orders shown)
- Manager account sees the orders fine

**Root Cause:**
The staff user wasn't assigned to the "Bar" section in the `user_sections` table yet. The API was looking for their assigned sections and finding none, so it returned empty array.

**Solution:**
1. Added better logging to debug
2. Added `section_id` parameter support for Last Order card
3. Made sure API returns empty gracefully when user has no sections

**How It Works Now:**

```typescript
// Orders API Logic:
if (staff user without can_send_orders permission) {
  // Get their assigned sections
  const sections = getUserSections(userId);
  
  if (sections.length === 0) {
    // User not assigned to any sections yet
    return []; // Empty, not an error
  }
  
  // Return orders from their sections only
  return orders.filter(o => sections.includes(o.department));
}
```

**Files Modified:**
- `app/api/orders/route.ts`
  - Added `section_id` parameter support
  - Added detailed logging
  - Better handling of unassigned users

---

### ✅ Issue 2: Last Order Card Not Showing

**Problem:**
- Last Order card disappeared
- Was showing before, now gone

**Root Cause:**
The card uses `?section_id=X&my=true` to fetch orders, but the API didn't support the `section_id` parameter.

**Solution:**
Added `section_id` filtering to the orders API:

```typescript
// If filtering by section_id (for Last Order card)
if (sectionId) {
  const sectionName = getSectionName(sectionId);
  
  // Get orders for this specific section
  return orders.filter(o => o.department === sectionName);
}
```

**Files Modified:**
- `app/api/orders/route.ts` - Added section_id filtering logic

---

## 🧪 Testing Instructions

### Test 1: Assign User to Section First

**IMPORTANT:** Before testing, the user must be assigned to a section!

1. **Login as Admin/Manager**
2. Go to Bar department page
3. Click Settings (⚙️) → "Пользователи" tab
4. Click "+ Добавить"
5. Select your staff user (Bar user)
6. **Toggle "Может отправлять заказы" = ON** (if you want them to see all orders)
7. Click "Назначить"
8. ✅ User is now assigned to Bar section

### Test 2: Create Order as Staff User

1. **Logout and login as Bar staff user**
2. Go to Bar department page (`/custom?section_id=1&dept=Bar`)
3. Add some items to cart
4. Go to `/cart`
5. Create order
6. ✅ Order should be created

### Test 3: View Orders

**Without `can_send_orders` permission:**
1. Stay logged in as Bar staff user
2. Go to `/orders` page
3. ✅ Should see ONLY Bar orders
4. ❌ Should NOT see Kitchen orders

**With `can_send_orders` permission:**
1. Admin: Assign user with toggle ON (step 6 above)
2. Logout and login again as Bar staff
3. Go to `/orders` page
4. ✅ Should see ALL orders (Bar + Kitchen + etc.)
5. ✅ Can send orders via WhatsApp

### Test 4: Last Order Card

1. As Bar staff user
2. Go to Bar department page
3. ✅ Should see "📋 Последний заказ" card at top
4. ✅ Shows your recent Bar order
5. ✅ Click "Все заказы" → goes to /orders

---

## 🎯 Permission System Summary

### User States:

| User Type | Assigned to Section? | can_send_orders? | What They See |
|-----------|---------------------|------------------|---------------|
| **Staff** | ❌ No | - | Empty orders page (need to be assigned first) |
| **Staff** | ✅ Yes (Bar) | ❌ No | Only Bar orders |
| **Staff** | ✅ Yes (Bar) | ✅ Yes | ALL orders from all departments |
| **Manager** | - | - | ALL orders always |
| **Admin** | - | - | ALL orders always |

---

## 🔍 API Parameters Explained

### GET /api/orders

**Parameters:**
- `my=true` - Filter by user's assigned sections (for staff)
- `section_id=X` - Filter by specific section (for Last Order card)
- `limit=N` - Max number of orders to return

**Examples:**
```
// Get all orders (admin/manager)
GET /api/orders

// Get my orders (staff without send permission)
GET /api/orders?my=true

// Get last order from Bar section
GET /api/orders?section_id=1&my=true&limit=1

// Get last 50 orders
GET /api/orders?limit=50
```

---

## 🐛 Debugging Tips

### If staff user sees no orders:

1. **Check if user is assigned to section:**
   ```sql
   SELECT * FROM user_sections WHERE user_id = X;
   ```
   If empty → User needs to be assigned first!

2. **Check if orders exist for that section:**
   ```sql
   SELECT * FROM orders WHERE order_data->>'department' = 'Bar';
   ```

3. **Check server logs:**
   Look for messages like:
   - `User X has no assigned sections, returning empty orders`
   - `Returning N orders for user X sections: Bar, Kitchen`

### If Last Order card doesn't show:

1. **Check if there are recent orders:**
   ```sql
   SELECT * FROM orders 
   WHERE order_data->>'department' = 'Bar' 
   ORDER BY created_at DESC LIMIT 1;
   ```

2. **Check browser console:**
   - Should see API call: `/api/orders?section_id=1&my=true&limit=1`
   - Check response - should have orders array

3. **Check section_id is correct:**
   - URL should be `/custom?section_id=1&dept=Bar`
   - Section ID should match database

---

## 📊 Database Checks

### Check user assignments:
```sql
-- See what sections a user is assigned to
SELECT 
  u.name as user_name,
  s.name as section_name,
  us.can_send_orders,
  us.can_receive_supplies
FROM user_sections us
JOIN users u ON u.id = us.user_id
JOIN sections s ON s.id = us.section_id
WHERE u.email = 'bar@example.com';
```

### Check orders by department:
```sql
-- See all orders grouped by department
SELECT 
  order_data->>'department' as department,
  COUNT(*) as order_count,
  MAX(created_at) as last_order
FROM orders
WHERE restaurant_id = 'your-restaurant-id'
GROUP BY order_data->>'department';
```

---

## ✅ Summary

### What Was Fixed:
1. ✅ Orders API now supports `section_id` parameter
2. ✅ Better handling when user has no assigned sections
3. ✅ Added logging for debugging
4. ✅ Last Order card now works correctly

### What You Need to Do:
1. **Assign staff users to their sections** (via Settings → Users)
2. **Toggle "Может отправлять заказы"** if they should see all orders
3. Test the orders page and Last Order card

### Build Status:
```
✅ TypeScript: No errors
✅ Next.js: Build successful
✅ Ready to deploy
```

---

**Key Takeaway:** Staff users MUST be assigned to sections via the Settings → Users tab before they can see orders!

---

**Fixes by:** AI Assistant  
**Time:** ~15 minutes  
**Build:** ✅ Successful
