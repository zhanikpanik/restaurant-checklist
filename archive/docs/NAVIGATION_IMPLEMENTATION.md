# Role-Based Navigation Implementation

## Overview
Implemented a "Role-Based Root" navigation system that determines the correct back/home URL based on user roles and assigned sections.

## Problem
Previously, the Back button on `/orders` and `/cart` pages was hardcoded to `/` (dashboard), which confused staff users who should never see the dashboard.

## Solution

### 1. Navigation Strategy
- **Managers/Admins**: Root = `/` (Dashboard) - They have full access
- **Staff (Single Department)**: Root = `/custom?section_id=...` (Their Department Page) - This is their "home"
- Back buttons now intelligently route based on context

### 2. Implementation Files

#### `/lib/navigation.ts` (NEW)
Created a utility module with two helper functions:

- **`getUserRootUrl(isManager, currentSection)`** - Async version that fetches user permissions
- **`getUserRootUrlSync(isManager, currentSection, userSections)`** - Sync version for when data is already loaded

Both functions follow this logic:
1. If `currentSection` exists (from store) → Use it
2. If user is Manager → Dashboard `/`
3. If user is Staff with sections → First assigned section
4. Fallback → Dashboard `/`

#### `/app/orders/page.tsx` (UPDATED)
- Added `backLink` state variable
- In `loadData()`, fetches user permissions and extracts sections
- Uses `getUserRootUrlSync()` to determine the correct back link
- Back button now uses dynamic `{backLink}` instead of hardcoded `/`

#### `/app/cart/page.tsx` (UPDATED)
- Added `backLink` state variable
- Added `useEffect` that calls `getUserRootUrl()` on mount and when section changes
- PageHeader now uses dynamic `{backLink}` instead of inline ternary

### 3. Key Features

✅ **Smart Fallbacks**: If permissions API fails, defaults to dashboard
✅ **Store Integration**: Respects `currentSection` from global store
✅ **Type-Safe**: Properly typed with TypeScript
✅ **DRY Code**: Reusable utility functions
✅ **No Breaking Changes**: Managers/Admins still see dashboard as expected

### 4. User Experience

#### For Staff:
- On `/orders` → Back goes to their Department Page
- On `/cart` → Back goes to their Department Page
- On Department Page → Back is hidden (they are at root)

#### For Managers:
- All back buttons → Dashboard (`/`)
- Full navigation access maintained

## Testing

Build passes successfully with no TypeScript errors:
```bash
npm run build
# ✓ Compiled successfully
```

## Future Enhancements

Potential improvements:
- Cache user sections in store to avoid repeated API calls
- Add breadcrumb navigation for multi-level navigation
- Support for staff with multiple sections (show section picker)

## Files Modified
1. `lib/navigation.ts` (created)
2. `app/orders/page.tsx` (updated)
3. `app/cart/page.tsx` (updated)

## Files Unchanged
- `/app/custom/page.tsx` - Already has correct logic (shows/hides back button based on `canManage`)
