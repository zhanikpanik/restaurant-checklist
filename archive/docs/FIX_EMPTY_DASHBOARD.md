# Fix: Empty Dashboard After Setup

## Problem

After completing the OAuth setup flow, admin users would see an empty dashboard with "Отделы не найдены" (No sections found), even though sections were successfully synced from Poster.

### Root Cause

The setup flow worked like this:

```
1. OAuth callback creates restaurant ✅
2. OAuth callback creates admin user ✅
3. Setup page auto-syncs sections ✅ (Бар, Кухня, Склад created in DB)
4. Setup page auto-syncs ingredients ✅
5. User logs in
6. Dashboard queries: SELECT sections WHERE user_id IN user_sections ❌
7. Result: EMPTY (admin was never assigned to sections)
```

**The sections existed in the database, but the admin had no assignments in the `user_sections` table.**

---

## Solution

Auto-assign all admin/manager users to all sections after sync completes.

### Implementation

**File:** `app/api/sync-sections/route.ts`

Added logic after syncing sections:

```typescript
// Auto-assign admin users to all sections
// This ensures admins can see all sections after sync
await withTenant(restaurantId, async (client) => {
  // Get all admin/manager users for this restaurant
  const adminsResult = await client.query(
    `SELECT id FROM users 
     WHERE restaurant_id = $1 
     AND role IN ('admin', 'manager') 
     AND is_active = true`,
    [restaurantId]
  );

  // Get all sections for this restaurant
  const sectionsResult = await client.query(
    `SELECT id FROM sections WHERE restaurant_id = $1 AND is_active = true`,
    [restaurantId]
  );

  // Assign each admin to all sections
  for (const admin of adminsResult.rows) {
    for (const section of sectionsResult.rows) {
      await client.query(
        `INSERT INTO user_sections (user_id, section_id, can_send_orders, can_receive_supplies)
         VALUES ($1, $2, true, true)
         ON CONFLICT (user_id, section_id) DO NOTHING`,
        [admin.id, section.id]
      );
    }
  }

  console.log(`Auto-assigned ${adminsResult.rows.length} admins to ${sectionsResult.rows.length} sections`);
});
```

---

## How It Works

### Before (Broken):
```
Sync Sections → Sections created in DB
                 ↓
              (Nothing happens)
                 ↓
Admin logs in → No sections visible (empty user_sections)
```

### After (Fixed):
```
Sync Sections → Sections created in DB
                 ↓
              Auto-assign admins to all sections
                 ↓
Admin logs in → All sections visible ✅
```

---

## Benefits

1. ✅ **Admins automatically see all sections** after sync
2. ✅ **No manual configuration needed** after setup
3. ✅ **Idempotent** - Uses `ON CONFLICT DO NOTHING` (safe to run multiple times)
4. ✅ **Works for existing restaurants** - Any admin who triggers sync gets assigned
5. ✅ **Managers also benefit** - They get full access too

---

## Edge Cases Handled

### Case 1: Multiple Admins
If there are multiple admin users:
- ✅ All admins get assigned to all sections

### Case 2: Re-sync
If sync is run again (to add new sections from Poster):
- ✅ Existing assignments preserved (`ON CONFLICT DO NOTHING`)
- ✅ New sections automatically assigned

### Case 3: Staff Users
If a staff user triggers sync:
- ✅ Admins/managers still get assigned
- ✅ Staff user is not auto-assigned (as expected - they get manual assignments)

---

## Testing Scenarios

### Scenario 1: Fresh Setup
```
1. New restaurant connects via OAuth
2. Setup page auto-syncs sections
3. Admin logs in
4. ✅ Sees all synced sections (Бар, Кухня, Склад, etc.)
```

### Scenario 2: Existing Restaurant
```
1. Admin clicks "Sync from Poster" button
2. New sections added from Poster
3. ✅ Admin automatically gets access to new sections
```

### Scenario 3: Multiple Admins
```
1. Restaurant has 2 admins
2. Admin A triggers sync
3. ✅ Both Admin A and Admin B get assigned to all sections
```

---

## Files Modified

- `app/api/sync-sections/route.ts` - Added auto-assignment logic

---

## No Onboarding Needed

This fix aligns with the philosophy of **self-explanatory design**:

- ❌ No onboarding modals
- ❌ No tutorials
- ❌ No manual configuration steps

✅ **It just works** - Admin logs in and sees sections immediately.

---

## Build Status

✅ Build successful
✅ No TypeScript errors
✅ No breaking changes
