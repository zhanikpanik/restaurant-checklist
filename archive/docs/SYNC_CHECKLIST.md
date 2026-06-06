# ✅ Poster Sync System - Deployment Checklist

## Pre-Deployment

- [x] **Schema files created**
  - `lib/poster-sync-schema.ts`
  - `lib/poster-sync-service.ts`

- [x] **API routes created**
  - `app/api/poster/sync/route.ts` (manual sync)
  - `app/api/cron/sync-poster/route.ts` (background)

- [x] **UI component created**
  - `components/PosterSyncPanel.tsx`

- [x] **Configuration files**
  - `vercel.json` (cron config)
  - `.env.example` (template)

- [x] **Documentation**
  - `POSTER_SYNC_GUIDE.md`
  - `QUICK_START_SYNC.md`
  - `IMPLEMENTATION_SUMMARY.md`

## Local Testing

- [ ] **Add CRON_SECRET to .env.local**
  ```bash
  echo "CRON_SECRET=$(openssl rand -hex 32)" >> .env.local
  ```

- [ ] **Start dev server**
  ```bash
  npm run dev
  ```

- [ ] **Verify schema created**
  Check database for new tables:
  - `poster_sync_status`
  - `poster_categories`
  - `poster_products`
  - `poster_suppliers`
  - `poster_ingredients`
  - `poster_storages`

- [ ] **Test manual sync API**
  ```bash
  curl -X POST http://localhost:3000/api/poster/sync
  ```

- [ ] **Verify data synced**
  ```sql
  SELECT COUNT(*) FROM poster_products;
  SELECT * FROM poster_sync_status;
  ```

- [ ] **Test sync status API**
  ```bash
  curl http://localhost:3000/api/poster/sync
  ```

- [ ] **Test UI (optional)**
  Add `<PosterSyncPanel />` to a page and test

## Deployment

- [ ] **Set environment variables in Vercel**
  1. Go to Vercel Dashboard
  2. Project Settings → Environment Variables
  3. Add: `CRON_SECRET` = (same value as local)

- [ ] **Push to Git**
  ```bash
  git add .
  git commit -m "Add Poster sync system"
  git push
  ```

- [ ] **Verify deployment**
  - Check Vercel deployment logs
  - No build errors
  - Deployment successful

- [ ] **Verify cron job created**
  1. Vercel Dashboard → Project
  2. Deployments → Cron Jobs
  3. Should see: `/api/cron/sync-poster` (every 30 min)

## Post-Deployment

- [ ] **Wait for first cron run** (up to 30 min)

- [ ] **Check cron logs**
  - Vercel → Deployments → Function Logs
  - Look for sync messages

- [ ] **Verify sync in production database**
  ```sql
  SELECT * FROM poster_sync_status ORDER BY last_sync_at DESC;
  SELECT COUNT(*) FROM poster_products;
  ```

- [ ] **Test manual sync in production**
  ```bash
  curl -X POST https://yourdomain.com/api/poster/sync
  ```

- [ ] **Monitor first few syncs**
  - Check for errors
  - Verify data updates
  - Check performance

## Update Application Code

- [ ] **Replace Poster API calls with database queries**
  
  Example migration:
  ```typescript
  // Old code (slow)
  const posterAPI = new PosterAPI(accessToken);
  const products = await posterAPI.getProducts();
  
  // New code (fast)
  const { rows: products } = await pool.query(`
    SELECT * FROM poster_products 
    WHERE restaurant_id = $1
  `, [restaurantId]);
  ```

- [ ] **Update product listing pages**
- [ ] **Update category pages**
- [ ] **Update supplier pages**
- [ ] **Update inventory pages**

## Monitoring & Maintenance

- [ ] **Set up alerts** (optional)
  - Monitor sync failures
  - Track sync duration
  - Alert on errors

- [ ] **Weekly checks**
  - Review sync logs
  - Check data freshness
  - Monitor performance

- [ ] **Monthly review**
  - Analyze sync patterns
  - Optimize sync frequency if needed
  - Review error rates

## Optional Enhancements

- [ ] **Add webhooks** (for real-time sync)
- [ ] **Add sync history** (track changes over time)
- [ ] **Add conflict resolution** (handle manual edits)
- [ ] **Add delta sync** (only changed records)
- [ ] **Add sync notifications** (alert users)

---

## Success Criteria

✅ Cron job runs every 30 minutes
✅ Data syncs successfully
✅ No errors in logs
✅ Page load times improved
✅ Database queries <100ms
✅ Users don't notice sync happening

---

## Rollback Plan

If something goes wrong:

1. **Stop cron job**
   - Comment out in `vercel.json`
   - Redeploy

2. **Revert to direct API calls**
   - Keep sync system
   - Just don't use cached data yet

3. **Debug offline**
   - Check logs
   - Fix issues
   - Test locally
   - Redeploy when ready

---

**Last Updated:** 2024-02-09
**Status:** Ready for deployment ✅
