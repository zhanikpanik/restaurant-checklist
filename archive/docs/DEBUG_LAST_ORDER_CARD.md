# 🐛 Debug Guide - Last Order Card Not Showing

**Date:** February 13, 2026  
**Status:** Debug Mode Enabled

---

## 🔍 What I Added

### Debug Logging
Added console logs to help identify the issue:

1. **In Browser Console** (F12):
   - `[Last Order] Fetching for section_id: X` - Shows when fetch starts
   - `[Last Order] API Response:` - Shows full API response
   - `[Last Order] Found order:` - Shows if order was found
   - `[Last Order] No orders found` - Shows if no orders

2. **On Department Page** (Yellow box in dev mode):
   - Shows: `lastOrder=YES/NO`, `loading=YES/NO`, `sectionId=X`

---

## 🧪 Testing Steps

### Step 1: Open Browser Console
1. Go to department page as Bar staff user
2. Press **F12** to open DevTools
3. Go to **Console** tab

### Step 2: Check What's Logged
Look for messages like:
```
[Last Order] Fetching for section_id: 1
[Last Order] API Response: {success: true, data: [...]}
[Last Order] Found order: {...}
```

### Step 3: Check Debug Box
On the page, you should see a yellow debug box showing:
```
Debug: lastOrder=YES, loading=NO, sectionId=1
```

---

## 🎯 Possible Issues & Solutions

### Issue 1: No orders found
**Console shows:**
```
[Last Order] No orders found for this section
```

**Cause:** No orders exist for this department yet

**Solution:**
1. Create an order from Bar department
2. Go to cart and submit order
3. Refresh department page
4. Card should appear

---

### Issue 2: Department name mismatch
**Console shows:**
```
[Last Order] API Response: {success: true, data: []}
```

**Cause:** The order's `department` field doesn't match section name

**Check:**
1. Open order in manager account
2. Check what department name is saved
3. Make sure it matches "Бар" or "Bar" exactly

**Fix if mismatch:**
The order might have been created with wrong department name. The API matches by name, so "Bar" ≠ "Бар"

---

### Issue 3: Section ID wrong
**Console shows:**
```
[Last Order] Fetching for section_id: undefined
```

**Cause:** URL doesn't have section_id parameter

**Solution:**
Make sure URL is like:
```
/custom?section_id=1&dept=Bar
```

---

### Issue 4: API error
**Console shows:**
```
Error loading last order: ...
```

**Cause:** API endpoint failing

**Check:**
1. Network tab in DevTools
2. Look for `/api/orders?section_id=...` request
3. Check if it's returning 500 error
4. Check server logs on Railway

---

## 📊 What to Send Me

If it's still not working, send me these:

### 1. Console Logs
Screenshot or copy-paste the console output showing:
```
[Last Order] Fetching for section_id: ...
[Last Order] API Response: ...
```

### 2. Debug Box Values
What does the yellow debug box show?
```
Debug: lastOrder=?, loading=?, sectionId=?
```

### 3. Network Response
1. Open Network tab in DevTools
2. Refresh page
3. Look for request to `/api/orders?section_id=...`
4. Click on it
5. Go to "Response" tab
6. Screenshot or copy the JSON response

### 4. Order Details
From manager account:
- Go to `/orders` page
- Find the order you created from Bar
- What does it say in the "Department" column?

---

## 🔧 Quick Fixes to Try

### Fix 1: Clear Browser Cache
```
Ctrl + Shift + Delete → Clear cached images and files
```

### Fix 2: Hard Refresh
```
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

### Fix 3: Check Order Exists
As manager:
```sql
-- Check if order exists with Bar department
SELECT * FROM orders 
WHERE order_data->>'department' IN ('Bar', 'Бар')
ORDER BY created_at DESC LIMIT 1;
```

### Fix 4: Create Fresh Order
As Bar staff:
1. Go to Bar department
2. Add 1-2 items
3. Go to cart
4. Create order
5. Immediately go back to Bar department
6. Card should appear

---

## 📝 Files Changed

- `app/custom/page.tsx`
  - Added console.log statements
  - Added debug box (yellow)
  - Removed `&my=true` from last order fetch (not needed with section_id)

---

## 🚀 Next Steps

1. **Test with debug mode** - Open console and check logs
2. **Send me the console output** if it's still not showing
3. **I'll identify the exact issue** and fix it

The debug logs will tell us exactly what's happening! 🔍

---

**Build Status:** ✅ Successful  
**Debug Mode:** ✅ Enabled  
**Ready to test:** ✅ YES
