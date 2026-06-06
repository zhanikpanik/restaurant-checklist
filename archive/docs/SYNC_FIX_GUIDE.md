# 🔧 Poster Sync Fix Guide

## ❌ Problem
You were seeing: **"❌ Sync failed: undefined"**

## ✅ Root Cause
The sync API requires authentication via a `restaurant_id` cookie, which wasn't set.

## 🛠️ Solution Applied

### 1. Fixed API Error Handling
- ✅ Added `credentials: 'include'` to all fetch calls
- ✅ Improved error messages to show actual error details
- ✅ Added user-friendly warning when restaurant not selected

### 2. What Was Changed
**File:** `components/poster/PosterSyncPanel.tsx`
- Better error handling in `loadSyncStatus()`
- Better error handling in `handleSync()`
- Warning message when authentication is missing

---

## 🚀 How to Use (Development)

### Step 1: Select a Restaurant
```
Visit: http://localhost:3000/dev/switch-restaurant
```

This page will:
- Show all restaurants in your database
- Let you select one
- Set the `restaurant_id` cookie
- Redirect you to home

### Step 2: Use the Sync Panel
```
Visit: http://localhost:3000/suppliers-categories
```

Now the Poster Sync Panel should work! You'll see:
- ✅ Current sync status for each entity
- ✅ "Smart Sync" button (skips if recently synced)
- ✅ "Force Sync" button (always fetches fresh data)

---

## 🌐 How to Use (Production - Railway)

### Option 1: OAuth Flow (Recommended)
1. Visit: `https://restaurant-checklist-production.up.railway.app/api/poster/oauth/authorize`
2. Log in with Poster POS credentials
3. The callback will automatically set `restaurant_id` cookie

### Option 2: Manual Cookie (Dev Only)
Development switch-restaurant page is **disabled in production** for security.

---

## 🔍 Troubleshooting

### Issue: Still getting "Authentication required"

**Check Cookie:**
```javascript
// In browser console:
document.cookie
```

Should see: `restaurant_id=YOUR_RESTAURANT_ID`

**Fix:**
- Development: Visit `/dev/switch-restaurant`
- Production: Complete OAuth flow

---

### Issue: "Invalid restaurant"

**Possible causes:**
1. Restaurant doesn't exist in database
2. Restaurant is marked as inactive

**Check database:**
```sql
SELECT id, name, is_active FROM restaurants;
```

---

## 📋 Testing Checklist

### Local Development
- [ ] Visit `/dev/switch-restaurant`
- [ ] Select a restaurant from the list
- [ ] Visit `/suppliers-categories`
- [ ] Sync panel shows status (not error)
- [ ] Click "Smart Sync All" - should work
- [ ] Click "Force Sync All" - should work

### Production (Railway)
- [ ] Complete Poster OAuth flow
- [ ] Visit `/suppliers-categories`
- [ ] Sync panel works

---

## 📊 What Each Sync Button Does

| Button | Behavior |
|--------|----------|
| **Smart Sync** | Only syncs if data is older than 24 hours |
| **Force Sync All** | Always downloads fresh data from Poster API |
| **Per-entity Sync** | Syncs only that entity (ingredients, suppliers, etc.) |
| **Per-entity Force** | Forces fresh sync for that specific entity |

---

## 🎯 Next Steps

1. **Test locally** - Make sure sync works
2. **Deploy to Railway** - `git push` (already done!)
3. **Complete OAuth** - Connect your Poster account
4. **Configure webhooks** - For real-time sync
5. **Monitor** - Check sync status regularly

---

## 📞 Support

If sync still doesn't work:

1. Check browser console for errors
2. Check Railway logs: `railway logs`
3. Verify `restaurant_id` cookie is set
4. Verify Poster API credentials are in Railway environment variables

---

## 🔗 Related Files

- `/components/poster/PosterSyncPanel.tsx` - UI component
- `/app/api/poster/sync/route.ts` - Sync API endpoint
- `/lib/poster-sync-service.ts` - Sync logic
- `/app/dev/switch-restaurant/page.tsx` - Dev restaurant selector

