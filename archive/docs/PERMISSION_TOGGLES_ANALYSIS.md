# Permission Toggles: "Can Send Orders" Feature

## Current State

### ✅ What Works:
- **Database**: `user_sections` table has `can_send_orders` column ✅
- **API**: `/api/user-sections` POST endpoint accepts `can_send_orders` ✅
- **DepartmentSettingsModal**: Has toggle UI ✅
- **Orders Page**: Checks permission to show/hide "Send to WhatsApp" button ✅

### ❌ What's Missing:
- **User Management Page** (`/admin/users`): No toggles for permissions! ❌
- When assigning sections, can't set `can_send_orders` per section
- Only shows which sections user has access to, not their permissions

---

## The Problem

### Current `/admin/users` Flow:
```
Admin → Create user → [Отделы] button → Select sections:
  ✓ Бар
  ✓ Кухня
→ Save

Result: User can VIEW sections, but CAN'T send orders!
```

**Missing:** Toggle to allow sending orders.

---

## Where the Toggle Already Works

### DepartmentSettingsModal (from section page):
```tsx
{/* Can Send Orders Toggle */}
<div className="flex items-center justify-between p-3 bg-white rounded-lg border">
  <label className="text-sm font-medium text-gray-700">
    Может отправлять заказы
  </label>
  <button
    onClick={() => setUserCanSendOrders(!userCanSendOrders)}
    className={`toggle ${userCanSendOrders ? "bg-blue-600" : "bg-gray-300"}`}
  >
    <span className={`dot ${userCanSendOrders ? "translate-x-6" : "translate-x-1"}`} />
  </button>
</div>
```

**This works!** But it's only accessible from the section settings, not from user management.

---

## 💡 Proposed Solution

### Add Permission Toggles to User Management

Update the "Sections Assignment Modal" in `/admin/users/page.tsx`:

### Before:
```tsx
<Modal title="Назначение отделов">
  <div className="space-y-2">
    {sections.map(section => (
      <label className="flex items-center gap-3 p-3 border rounded-lg">
        <input type="checkbox" />
        <span>{section.emoji} {section.name}</span>
      </label>
    ))}
  </div>
</Modal>
```

### After:
```tsx
<Modal title="Назначение отделов и прав">
  <div className="space-y-3">
    {sections.map(section => (
      <div className={`p-3 border rounded-lg ${selected ? 'border-blue-500 bg-blue-50' : ''}`}>
        {/* Section checkbox */}
        <label className="flex items-center gap-3">
          <input type="checkbox" />
          <span className="text-lg">{section.emoji}</span>
          <span className="font-medium">{section.name}</span>
        </label>

        {/* Permissions - only show if section is selected */}
        {selected && (
          <div className="ml-9 mt-2 space-y-2">
            {/* Can Send Orders Toggle */}
            <div className="flex items-center justify-between p-2 bg-white rounded">
              <label className="text-sm text-gray-700">
                📤 Может отправлять заказы
              </label>
              <button
                onClick={() => togglePermission(section.id, 'can_send_orders')}
                className={`toggle ${hasPermission(section.id, 'can_send_orders') ? 'bg-green-600' : 'bg-gray-300'}`}
              >
                <span className="dot" />
              </button>
            </div>

            {/* Can Receive Supplies Toggle */}
            <div className="flex items-center justify-between p-2 bg-white rounded">
              <label className="text-sm text-gray-700">
                📦 Может принимать поставки
              </label>
              <button
                onClick={() => togglePermission(section.id, 'can_receive_supplies')}
                className={`toggle ${hasPermission(section.id, 'can_receive_supplies') ? 'bg-green-600' : 'bg-gray-300'}`}
              >
                <span className="dot" />
              </button>
            </div>
          </div>
        )}
      </div>
    ))}
  </div>
</Modal>
```

---

## Implementation Details

### State Structure

Instead of just tracking section IDs:
```typescript
const [selectedSectionIds, setSelectedSectionIds] = useState<number[]>([]);
```

Track permissions per section:
```typescript
interface SectionPermission {
  section_id: number;
  can_send_orders: boolean;
  can_receive_supplies: boolean;
}

const [sectionPermissions, setSectionPermissions] = useState<SectionPermission[]>([]);
```

### Helper Functions

```typescript
// Check if section is selected
const isSectionSelected = (sectionId: number) => {
  return sectionPermissions.some(p => p.section_id === sectionId);
};

// Toggle section on/off
const toggleSection = (sectionId: number) => {
  if (isSectionSelected(sectionId)) {
    // Remove section
    setSectionPermissions(prev => prev.filter(p => p.section_id !== sectionId));
  } else {
    // Add section with default permissions
    setSectionPermissions(prev => [...prev, {
      section_id: sectionId,
      can_send_orders: false,
      can_receive_supplies: false
    }]);
  }
};

// Toggle individual permission
const togglePermission = (sectionId: number, permission: 'can_send_orders' | 'can_receive_supplies') => {
  setSectionPermissions(prev => prev.map(p => 
    p.section_id === sectionId 
      ? { ...p, [permission]: !p[permission] }
      : p
  ));
};

// Check if permission is enabled
const hasPermission = (sectionId: number, permission: 'can_send_orders' | 'can_receive_supplies') => {
  return sectionPermissions.find(p => p.section_id === sectionId)?.[permission] || false;
};
```

### Save Handler

```typescript
const handleSaveSections = async () => {
  if (!selectedUser) return;

  try {
    const res = await fetch("/api/user-sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: selectedUser.id,
        sections: sectionPermissions  // Send full permission objects
      }),
    });

    if (res.ok) {
      toast.success("Права сохранены");
      closeModal();
    }
  } catch (err) {
    toast.error("Ошибка сохранения");
  }
};
```

---

## Visual Design

### Collapsed (Section not selected):
```
┌────────────────────────────────────┐
│ ☐  🍷 Бар                          │
└────────────────────────────────────┘
```

### Expanded (Section selected):
```
┌────────────────────────────────────┐
│ ☑  🍷 Бар                          │
│                                    │
│    📤 Может отправлять    [●──]   │
│       заказы                       │
│                                    │
│    📦 Может принимать     [──●]   │
│       поставки                     │
└────────────────────────────────────┘
```

---

## User Experience

### Scenario 1: Creating Bartender
```
Admin → Add User → Name: "Иван" → Role: Staff
→ [Отделы] → Select:
   ☑ Бар
     📤 Может отправлять заказы: ●──  (ON)
     📦 Может принимать поставки: ──● (OFF)
→ Save

Result: Иван can view Bar, create orders, send to WhatsApp
        But CAN'T receive deliveries (manager will do that)
```

### Scenario 2: Creating Chef
```
Admin → Add User → Name: "Петр" → Role: Staff
→ [Отделы] → Select:
   ☑ Кухня
     📤 Может отправлять заказы: ●──  (ON)
     📦 Может принимать поставки: ●──  (ON)
→ Save

Result: Петр can order ingredients AND receive deliveries
```

### Scenario 3: Creating Junior Staff
```
Admin → Add User → Name: "Мария" → Role: Staff
→ [Отделы] → Select:
   ☑ Бар
     📤 Может отправлять заказы: ──● (OFF)
     📦 Может принимать поставки: ──● (OFF)
→ Save

Result: Мария can VIEW products, add to cart
        But CAN'T send orders (needs manager approval)
```

---

## API Changes Needed

The `/api/user-sections` POST endpoint already supports this format:

```typescript
// Current API accepts:
{
  user_id: 123,
  sections: [
    { section_id: 1, can_send_orders: true, can_receive_supplies: false },
    { section_id: 2, can_send_orders: false, can_receive_supplies: true }
  ]
}
```

**No backend changes needed!** Just need to update the UI.

---

## Priority

**P0 (Critical for usability)**

Right now, when you create a staff user and assign them to sections, they **can't actually do anything** because all permissions default to `false`.

Admin has to:
1. Create user
2. Assign sections
3. Go to each section page
4. Open settings
5. Find the user
6. Toggle permissions

**That's 6 steps!** Should be 2.

---

## Implementation Checklist

### `/admin/users/page.tsx` changes:

- [ ] Change `selectedSectionIds: number[]` → `sectionPermissions: SectionPermission[]`
- [ ] Add permission toggles to section assignment modal
- [ ] Update `handleSaveSections()` to send permission objects
- [ ] Add visual indicators (icons, colors) for permission states
- [ ] Add "Quick presets" buttons:
  - [Full Access] - All permissions ON
  - [Read Only] - All permissions OFF
  - [Can Order] - Just `can_send_orders` ON

### Optional enhancements:

- [ ] Show permission summary in user card:
  ```
  Бар (📤 Отправка)
  Кухня (📤 Отправка, 📦 Приёмка)
  ```
- [ ] Bulk edit permissions:
  ```
  [Apply to all sections] checkbox
  ```
- [ ] Permission presets by role:
  ```
  Role: Manager → Auto-enable all permissions
  Role: Staff → Auto-disable all (manual selection)
  ```

---

## Want me to implement this?

**This is essential for making user management actually usable!** 🚀
