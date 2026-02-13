# 🧪 Comprehensive App Testing Guide

This guide covers end-to-end testing of the Restaurant Checklist app, including recent fixes for ingredient duplication and supplier assignment.

---

## 🚀 Part 1: Verification of Recent Fixes (Priority)
**Goal:** Ensure the "Unsorted" list is clean and assigning suppliers works across all sections.

### 1. Check "Unsorted" Deduplication
1.  **Login** as a Manager/Admin.
2.  Navigate to **Suppliers & Categories** (🏢 icon).
3.  Click the **Unsorted** tab.
4.  **Action:** Look for an ingredient you know exists in multiple sections (e.g., "Coca Cola" in Bar and Kitchen).
5.  **Pass Criteria:**
    *   [ ] The ingredient appears **only once** in the list.
    *   [ ] The quantity is the sum of all sections (if applicable).
    *   [ ] The subtitle shows multiple section names (e.g., "Kitchen, Bar").

### 2. Bulk Supplier Assignment
1.  **Action:** In the **Unsorted** tab, select that specific ingredient (checkbox).
2.  **Action:** Select a supplier from the dropdown at the bottom (e.g., "Metro").
3.  **Action:** Click **"OK"**.
4.  **Pass Criteria:**
    *   [ ] The item disappears from the "Unsorted" list.
    *   [ ] A success notification appears (e.g., "Moved 2 items").
    *   [ ] **Verification:** Go to the "Metro" tab. The item should be visible there.
    *   [ ] **Verification:** Go back to "Unsorted". The item should **not** reappear (meaning all copies were updated).

---

## 📋 Part 2: Manager Workflows (Back Office)

### 1. Poster Synchronization
*   **Navigate:** **Suppliers & Categories**.
*   **Action:** Click the **Gear icon** (Sync Settings) near the top.
*   **Action:** Click **"Sync Suppliers"** then **"Sync Products"** (or similar sync button).
*   **Pass Criteria:**
    *   [ ] Loaders appear and finish without error.
    *   [ ] Toast notification confirms success.
    *   [ ] New products from Poster appear in the app.

### 2. Section Management
*   **Note:** Section management is now automatic via Poster sync.
*   **Action:** Verify the list of sections on the **Home Page** matches your Poster storages.
*   **Pass Criteria:**
    *   [ ] All active Poster storages appear as cards on the Home Page.

### 3. User Permissions (If enabled)
*   **Note:** User permissions are managed via database or `users.ts` currently.
*   **Action:** Ensure a "Barman" user only sees the "Bar" section card on the Home Page, not "Kitchen".

---

## 🛒 Part 3: Staff Workflows (Front Office)

### 1. Creating an Order
1.  **Login** as a standard user (or use Manager account).
2.  **Navigate:** Click on a section card (e.g., **"Bar"**).
3.  **Action:** Find a product (search or scroll).
4.  **Action:** Click the `+` button to add quantity (e.g., 5 items).
5.  **Pass Criteria:**
    *   [ ] Counter updates immediately.
    *   [ ] "Cart" floating button appears/updates at the bottom.

### 2. Cart & Checkout
1.  **Action:** Click the **Cart** button.
2.  **Pass Criteria:**
    *   [ ] Items are grouped by **Supplier** (e.g., Metro, Coca-Cola Vendor).
    *   [ ] You can edit quantities or remove items here.
3.  **Action:** Click **"Checkout"** (or "Send Order").
4.  **Pass Criteria:**
    *   [ ] Order is saved to database.
    *   [ ] You are redirected to the **Order History/Status** page.

### 3. WhatsApp Integration
1.  **Navigate:** **Orders** (History).
2.  **Action:** Click on a "Pending" order.
3.  **Action:** Click **"Send to WhatsApp"**.
4.  **Pass Criteria:**
    *   [ ] WhatsApp (Web or App) opens.
    *   [ ] A pre-filled message appears with the correct items and quantities.

---

## 🔧 Part 4: Technical Health Check

### 1. Database Integrity (SQL)
Run these checks if you suspect data issues:

**Check for "Orphaned" Products (Assigned in one section, unsorted in another):**
```sql
SELECT poster_ingredient_id, name, COUNT(*) 
FROM section_products 
GROUP BY poster_ingredient_id, name 
HAVING COUNT(*) > 1 AND COUNT(supplier_id) > 0 AND COUNT(supplier_id) < COUNT(*);
-- Should return 0 rows
```

**Check for Duplicates in Unsorted List (Raw Data):**
```sql
SELECT poster_ingredient_id, COUNT(*) 
FROM section_products 
WHERE supplier_id IS NULL 
GROUP BY poster_ingredient_id 
HAVING COUNT(*) > 1;
-- It is NORMAL to have results here, but the UI should hide them (see Part 1).
```

---

## 🐛 Troubleshooting Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| **"Duplicate Key" error during Sync** | Database migration out of sync | Run `node scripts/run-multi-tenant-migration.js` |
| **Product appears twice in Unsorted** | Frontend grouping failed | Refresh page (Cache issue) or check `poster_ingredient_id` |
| **Order not sending** | Network or Auth issue | Check console logs for API errors |
| **Can't see new Poster products** | Sync hasn't run | Go to Manager > Sync and run manual sync |
