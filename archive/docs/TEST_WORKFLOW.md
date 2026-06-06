# Pre-Launch Test Workflow

Complete this checklist to verify all features work correctly before Poster Marketplace submission.

**Estimated time:** 30-45 minutes

---

## Prerequisites

- [ ] App running locally (`npm run dev`) or on staging
- [ ] Database connected and migrated
- [ ] At least one restaurant configured
- [ ] Poster integration connected (or test data seeded)

---

## Test 1: Authentication & Authorization

### 1.1 Login Flow
- [ ] Open app in incognito/private window
- [ ] Verify redirect to `/login`
- [ ] Login with valid credentials
- [ ] Verify redirect to home page
- [ ] Verify restaurant name shown in header

### 1.2 Role-Based Access
| Test | Manager | Staff | Expected |
|------|---------|-------|----------|
| Access `/manager` | ✅ | ❌ 403/redirect | |
| Access `/` (checklist) | ✅ | ✅ | |
| See all sections | ✅ | Only assigned | |
| Create users | ✅ | ❌ | |

### 1.3 Session Security
- [ ] Open DevTools → Application → Cookies
- [ ] Verify cookies have `HttpOnly`, `SameSite` flags
- [ ] Logout and verify cookies cleared
- [ ] Try accessing protected route → should redirect to login

---

## Test 2: Poster Sync (if connected)

### 2.1 Section Sync
- [ ] Go to Manager → Sections
- [ ] Click "Синхронизировать секции"
- [ ] Verify sections appear from Poster storages
- [ ] Check section has correct name and emoji

### 2.2 Product Sync
- [ ] Select a section
- [ ] Click "Синхронизировать товары"
- [ ] Verify products appear with names from Poster
- [ ] Check products show "📦 Poster" badge

---

## Test 3: Product Management

### 3.1 Category Assignment (Bulk)
- [ ] Go to Manager → Products
- [ ] Filter by "Без категории" (uncategorized)
- [ ] Select 3+ products using checkboxes
- [ ] Verify selection count shows correctly
- [ ] Select a category from dropdown
- [ ] Click "Применить"
- [ ] Verify toast: "Обновлено X товаров"
- [ ] Verify products now show category name

### 3.2 Product Edit
- [ ] Click on any product row
- [ ] Verify edit modal opens
- [ ] Change category
- [ ] Click "Сохранить"
- [ ] Verify toast confirmation
- [ ] Verify change persisted (refresh page)

### 3.3 Search & Filter
- [ ] Type in search box → verify results filter
- [ ] Select section filter → verify products filter
- [ ] Select category filter → verify products filter
- [ ] Click "Сбросить" → verify filters cleared

### 3.4 Pagination
- [ ] Verify pagination shows if >20 products
- [ ] Click page 2 → verify different products
- [ ] Change page size → verify list updates

---

## Test 4: Supplier & Category Setup

### 4.1 Create Supplier
- [ ] Go to Manager → Suppliers
- [ ] Click "Добавить"
- [ ] Enter name and phone (e.g., +7 999 123 4567)
- [ ] Click "Сохранить"
- [ ] Verify supplier appears in list

### 4.2 Create Category with Supplier
- [ ] Go to Manager → Categories
- [ ] Click "Добавить"
- [ ] Enter category name
- [ ] Select supplier from dropdown
- [ ] Click "Сохранить"
- [ ] Verify category shows supplier name

---

## Test 5: Order Creation Flow

### 5.1 Add Items to Cart
- [ ] Go to home page (checklist)
- [ ] Select a section tab
- [ ] Click on a product
- [ ] Enter quantity (e.g., 5)
- [ ] Click "Готово" or press Enter
- [ ] Verify cart badge shows count
- [ ] Add 2-3 more products from different categories

### 5.2 Review Cart
- [ ] Click cart icon
- [ ] Verify all added products shown
- [ ] Verify products grouped by supplier
- [ ] Verify quantities correct
- [ ] Try editing quantity in cart
- [ ] Try removing an item

### 5.3 Create Order
- [ ] Click "Создать заказ"
- [ ] Verify order created toast
- [ ] Verify cart cleared
- [ ] Go to Manager → Orders
- [ ] Verify new order appears with "Ожидает" status

### 5.4 WhatsApp Integration
- [ ] Go to Manager → Orders
- [ ] Find pending orders grouped by supplier
- [ ] Click "WhatsApp" button
- [ ] Verify WhatsApp opens (or wa.me link)
- [ ] Verify message contains:
  - Restaurant name
  - Date
  - Product list with quantities
  - Units

---

## Test 6: Order Management

### 6.1 Order Status Flow
- [ ] Find a pending order
- [ ] Click ✓ button to mark delivered
- [ ] Verify status changes to "Доставлен"
- [ ] Verify toast confirmation

### 6.2 Order Details
- [ ] Click on an order row
- [ ] Verify modal opens with full details
- [ ] Verify all items shown
- [ ] Close modal

### 6.3 Order Filtering
- [ ] Click "Ожидает" filter → only pending shown
- [ ] Click "Доставлено" filter → only delivered shown
- [ ] Click "Все" → all orders shown

### 6.4 Order Deletion
- [ ] Click delete button on an order
- [ ] Confirm deletion
- [ ] Verify order removed from list

---

## Test 7: User Management (Manager Only)

### 7.1 Create User
- [ ] Go to Manager → Users
- [ ] Click "Добавить"
- [ ] Fill in: email, name, password, role
- [ ] Assign sections (for staff role)
- [ ] Click "Сохранить"
- [ ] Verify user appears in list

### 7.2 Edit User Sections
- [ ] Click on a staff user
- [ ] Change assigned sections
- [ ] Save and verify

### 7.3 Deactivate User
- [ ] Click on a user
- [ ] Uncheck "Активен"
- [ ] Save
- [ ] Verify user cannot login (test in incognito)

---

## Test 8: Mobile Responsiveness

### 8.1 Responsive Layout
- [ ] Open DevTools → Toggle device toolbar
- [ ] Test on iPhone 12 (390×844)
- [ ] Test on iPad (768×1024)

### 8.2 Mobile Checklist
- [ ] Sections show as scrollable tabs
- [ ] Products show as cards (not table)
- [ ] Quantity input keyboard appears
- [ ] Cart accessible
- [ ] Navigation works

### 8.3 Mobile Manager
- [ ] Products tab shows card view
- [ ] Checkboxes accessible
- [ ] Bulk actions work
- [ ] Orders list readable

---

## Test 9: Error Handling

### 9.1 Network Errors
- [ ] Open DevTools → Network → Offline
- [ ] Try to load page → verify error shown
- [ ] Try to save → verify error toast
- [ ] Go back online → verify recovery

### 9.2 Validation Errors
- [ ] Try creating user without email → error shown
- [ ] Try creating category without name → error shown
- [ ] Try saving product without section → error shown

### 9.3 CSRF Protection
- [ ] Open DevTools → Application → Cookies
- [ ] Delete `csrf-session-id` cookie
- [ ] Try to create an order
- [ ] Verify request fails initially, then auto-retries with new token

---

## Test 10: Legal & Help Pages

### 10.1 Static Pages
- [ ] Navigate to `/privacy` → content loads
- [ ] Navigate to `/terms` → content loads
- [ ] Navigate to `/help` → content loads
- [ ] All links work
- [ ] Back to app navigation works

---

## Test 11: Performance Checks

### 11.1 Page Load
- [ ] Open DevTools → Network
- [ ] Refresh home page
- [ ] Verify initial load < 3 seconds
- [ ] Verify no console errors

### 11.2 Large Data
- [ ] Load page with 100+ products
- [ ] Verify pagination works
- [ ] Verify no lag when scrolling
- [ ] Verify search is responsive

---

## Test 12: Cross-Tenant Isolation

### 12.1 Data Isolation (if multiple restaurants)
- [ ] Login as Restaurant A manager
- [ ] Note order count and products
- [ ] Logout
- [ ] Login as Restaurant B manager
- [ ] Verify completely different data
- [ ] No Restaurant A data visible

### 12.2 API Isolation
- [ ] Open DevTools → Network
- [ ] Make an API call (e.g., load products)
- [ ] Copy the request as cURL
- [ ] Modify restaurant_id in cookie
- [ ] Verify request fails or returns empty

---

## Final Checklist

### Before Submission
- [ ] All tests above pass
- [ ] No console errors in production build
- [ ] TypeScript compiles without errors: `npx tsc --noEmit`
- [ ] Build succeeds: `npm run build`
- [ ] Environment variables documented
- [ ] Support email configured

### Store Assets Ready
- [ ] App icon (512×512)
- [ ] 3-5 screenshots
- [ ] Description (RU/EN)
- [ ] Feature list

---

## Quick Smoke Test (5 minutes)

If you're short on time, run this minimal test:

1. ✅ Login works
2. ✅ Products load
3. ✅ Add item to cart
4. ✅ Create order
5. ✅ WhatsApp button works
6. ✅ Mark order delivered
7. ✅ Bulk category assignment works
8. ✅ Mobile view works
9. ✅ `/help`, `/privacy`, `/terms` load

---

## Bug Report Template

If you find issues, document them:

```
## Bug: [Short description]

**Steps to reproduce:**
1. 
2. 
3. 

**Expected:** 

**Actual:** 

**Screenshot/Console errors:** 

**Device/Browser:** 
```

---

*Last updated: February 2026*
