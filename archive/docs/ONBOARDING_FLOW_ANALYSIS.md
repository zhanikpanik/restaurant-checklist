# New User Onboarding Flow Analysis

## Complete User Journey from /setup

### 📍 Current Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Step 1: /setup                           │
│  🍽️ "Connect Your Restaurant"                              │
│  [Connect with Poster POS] button                           │
│  ✓ Automatic supplier sync                                  │
│  ✓ Product inventory integration                            │
│  ✓ Auto-create supplies on delivery                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│            Step 2: OAuth Authorization                      │
│  → /api/poster/oauth/authorize                              │
│  → Poster POS login page (external)                         │
│  → User authorizes app                                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│           Step 3: OAuth Callback Processing                 │
│  → /api/poster/oauth/callback                               │
│  ✓ Exchange code for access token                           │
│  ✓ Fetch restaurant data from Poster                        │
│  ✓ Create restaurant in database                            │
│  ✓ Create admin user with temp password                     │
│  ✓ Store Poster credentials                                 │
│  → Redirect to /setup?success=oauth&admin_created=true...   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│       Step 4: /setup (Success State)                        │
│  ✅ "Setup Complete!"                                       │
│  🔄 Auto-syncing sections & ingredients...                  │
│                                                              │
│  🔐 Your Admin Account                                      │
│  Email: admin@restaurant.com                                │
│  Password: ••••••••••••  [👁️] [Copy]                       │
│  ⚠️ Save these credentials!                                 │
│                                                              │
│  [Go to Login] button                                       │
│  + Connect another restaurant (link)                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│               Step 5: /login                                │
│  User enters email + password                               │
│  → Submits form                                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│          Step 6: First Login → Dashboard (/)                │
│  🍽️ Restaurant Name                                        │
│                                                              │
│  ❌ "Отделы не найдены"                                     │
│  "Для текущего ресторана отделы не настроены"              │
│                                                              │
│  (Empty state - no sections synced yet!)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚨 **CRITICAL PROBLEMS**

### Problem 1: **Empty Dashboard on First Login**
**Issue:** After setup completes and auto-sync runs, user logs in and sees... nothing!

**Why?**
- Auto-sync happens on `/setup` page (Step 4)
- User is NOT logged in during sync
- Synced data is saved to database
- But sections are fetched **per-user** based on `user_sections` table
- New admin user has NO section assignments yet
- Result: `allSections.length === 0` → Empty state

**User sees:**
```
📦 Отделы не найдены
Для текущего ресторана отделы не настроены
```

**Expected:**
User should see all the synced sections (Бар, Кухня, Склад, etc.)

---

### Problem 2: **Lost Credentials**
**Issue:** Password is shown ONCE on setup page, never again.

**Problems:**
- ❌ No "Forgot Password" flow
- ❌ No password reset functionality
- ❌ If user closes window without saving → Locked out forever
- ❌ No email confirmation sent
- ❌ Password shown in plain text on screen (security risk)

---

### Problem 3: **No Onboarding Guidance**
**Issue:** Even if sections appear, new user has no idea what to do next.

**What's missing:**
- ❌ No welcome tour
- ❌ No "Next steps" guidance
- ❌ No explanation of workflow
- ❌ No sample data or examples
- ❌ User lands on empty dashboard with no context

---

### Problem 4: **Sync Timing Issue**
**Issue:** Auto-sync runs BEFORE user logs in.

**Flow bug:**
```
1. Setup page → Auto-sync sections/ingredients
2. User goes to login
3. User logs in
4. Dashboard fetches user's sections
5. User has 0 assigned sections (admin wasn't auto-assigned)
6. Empty state shows
```

**Should be:**
```
1. Setup page → Create restaurant + admin
2. User logs in
3. On first login → Auto-sync sections
4. Auto-assign ALL sections to admin
5. Dashboard shows all sections
```

---

### Problem 5: **No Section Assignments**
**Issue:** `user_sections` table is never populated for the admin user.

**Code location:** `/api/poster/oauth/callback/route.ts`
- ✅ Creates restaurant
- ✅ Creates admin user
- ❌ Does NOT assign sections to admin
- ❌ Auto-sync creates sections but doesn't link to user

---

### Problem 6: **Confusing Success State**
**Issue:** Setup success page has too many actions.

**Current:**
```
✅ Setup Complete
[Go to Login]
+ Connect another restaurant
```

**Problems:**
- Why would a new user connect ANOTHER restaurant immediately?
- "Go to Login" is redundant - should auto-redirect
- No clear "What happens next?" guidance

---

## 💡 RECOMMENDED FIXES

### Fix 1: **Auto-Assign Admin to All Sections**
**Location:** `/api/poster/oauth/callback/route.ts`

After creating restaurant + admin, add:
```typescript
// After sync completes, assign all sections to admin
const sections = await db.query(`
  SELECT id FROM sections 
  WHERE restaurant_id = $1
`, [restaurantId]);

for (const section of sections.rows) {
  await db.query(`
    INSERT INTO user_sections (user_id, section_id, can_send_orders, can_receive_supplies)
    VALUES ($1, $2, true, true)
    ON CONFLICT DO NOTHING
  `, [adminUserId, section.id]);
}
```

---

### Fix 2: **Move Sync to First Login**
**Better flow:**
```
Setup → Create Restaurant + Admin → Login → Auto-sync on first dashboard load → Assign sections → Show dashboard
```

**Implementation:**
1. Add `is_first_login` flag to users table
2. On dashboard load, check flag
3. If true:
   - Show loading: "Setting up your restaurant..."
   - Run sync-sections + sync-ingredients
   - Assign all sections to user
   - Set `is_first_login = false`
   - Reload dashboard
4. If false:
   - Normal dashboard load

---

### Fix 3: **Welcome Tour / First-Time UI**
**Add to dashboard (/):**

When `is_first_login === true` or `sections.length > 0 && orders.length === 0`:

```tsx
<div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
  <h2 className="text-xl font-bold text-blue-900 mb-3">
    👋 Добро пожаловать в CheckList!
  </h2>
  <p className="text-blue-800 mb-4">
    Ваш ресторан подключен! Вот что нужно сделать дальше:
  </p>
  <ol className="space-y-2 text-blue-900">
    <li className="flex items-start gap-2">
      <span className="font-bold">1.</span>
      <span>Выберите отдел ниже (Бар, Кухня и т.д.)</span>
    </li>
    <li className="flex items-start gap-2">
      <span className="font-bold">2.</span>
      <span>Просмотрите товары и создайте первый заказ</span>
    </li>
    <li className="flex items-start gap-2">
      <span className="font-bold">3.</span>
      <span>Отправьте заказ поставщику через WhatsApp</span>
    </li>
  </ol>
</div>
```

---

### Fix 4: **Auto-Login After Setup**
**Better UX:**
Instead of showing credentials + "Go to Login" button:

1. **Auto-login the admin user** after setup
2. Set session cookie
3. Redirect to dashboard
4. Show welcome modal with credentials

**Implementation:**
```typescript
// In /api/poster/oauth/callback
// After creating admin:

// Generate session token
const sessionToken = await signIn('credentials', {
  email: adminEmail,
  password: tempPassword,
  redirect: false
});

// Redirect with session
redirect(`/?welcome=true&temp_password=${tempPassword}`);
```

Then on dashboard:
```tsx
// Show modal with temp password + "Change Password" button
if (searchParams.get('welcome') === 'true') {
  // Show welcome modal
}
```

---

### Fix 5: **Password Reset Flow**
**Add:**
1. "Forgot Password" link on `/login`
2. `/reset-password` page
3. Email-based reset (or admin can reset from settings)

---

### Fix 6: **Better Empty States**
**Current:**
```
❌ Отделы не найдены
```

**Better:**
```
🔄 Настраиваем ваш ресторан...
Подождите, мы синхронизируем данные из Poster.

[Loading spinner]
```

Or if sync failed:
```
⚠️ Синхронизация не завершена
[Синхронизировать сейчас] button
```

---

## 🎯 IDEAL FLOW (Recommended)

```
1. /setup
   - User clicks "Connect with Poster POS"
   
2. Poster OAuth
   - User authorizes
   
3. /api/poster/oauth/callback
   ✓ Create restaurant
   ✓ Create admin user
   ✓ Auto-login admin (set session)
   → Redirect to /?welcome=true&is_new=true
   
4. Dashboard (/) - First Load
   - Check if is_new=true
   - Show: "🔄 Настраиваем ресторан..."
   - Run sync-sections + sync-ingredients
   - Auto-assign ALL sections to admin
   - Set is_first_login = false
   
5. Dashboard (/) - After Sync
   - Show welcome modal:
     ┌─────────────────────────────────┐
     │ 👋 Добро пожаловать!            │
     │                                  │
     │ Ваш ресторан готов!             │
     │ Вот ваши учетные данные:        │
     │                                  │
     │ Email: admin@...                │
     │ Пароль: [shown once]            │
     │                                  │
     │ ⚠️ Рекомендуем изменить пароль  │
     │                                  │
     │ [Изменить пароль] [Начать работу]│
     └─────────────────────────────────┘
   
6. User clicks "Начать работу"
   - Welcome tips appear above sections
   - Sections are visible (Бар, Кухня, etc.)
   - Order status card shows "Нет заказов"
   
7. User clicks on section
   - Sees products
   - Can create first order
```

---

## 📊 Summary Table

| Current Flow | Issues | Recommended Fix |
|--------------|--------|-----------------|
| Setup → Show credentials → Login | Password shown once, can be lost | Auto-login after setup |
| Sync on setup page (no user logged in) | Data synced but user has no access | Sync on first login |
| Admin created but no sections assigned | Empty dashboard | Auto-assign all sections to admin |
| No onboarding guidance | User confused what to do | Welcome modal + tips |
| Plain text password display | Security risk | Show in modal after login, require change |
| "Connect another restaurant" link | Confusing for new user | Remove or hide until later |

---

## 🔧 Priority Fixes

### P0 (Critical):
1. ✅ **Auto-assign admin to all synced sections**
2. ✅ **Fix empty dashboard on first login**

### P1 (High):
3. ✅ **Auto-login after setup** (better UX)
4. ✅ **Welcome modal with onboarding**

### P2 (Medium):
5. Password reset functionality
6. Email confirmation
7. Change password flow

### P3 (Nice to have):
8. Interactive tour
9. Sample data
10. Video tutorials

---

**Want me to implement the P0 + P1 fixes?** 🚀
