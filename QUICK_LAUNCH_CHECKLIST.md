# 🚀 Quick Launch Checklist

**Use this checklist before deploying to market**

---

## Phase 1: Pre-Flight Check (30 min)

### Code Quality
- [ ] Run `npm run build` - builds successfully ✅
- [ ] No TypeScript errors ✅
- [ ] No critical console warnings ✅
- [ ] All API routes return proper status codes ✅

### Environment Setup
- [ ] `.env` file removed from Git tracking
- [ ] `.env.local` used for local development only
- [ ] `.env.example` updated with all required variables ✅
- [ ] Production environment variables set in hosting platform

### Security Verification
- [ ] `AUTH_SECRET` is unique and random (not "development_secret")
- [ ] `CRON_SECRET` is set and secure
- [ ] `POSTER_APP_SECRET` configured
- [ ] Database credentials secure (not in code)
- [ ] No hardcoded passwords or tokens in code

---

## Phase 2: Functional Testing (1-2 hours)

Follow the **COMPREHENSIVE_TEST_GUIDE.md** for detailed steps:

### Part 1: Core Features
- [ ] Login/logout works
- [ ] Section cards display on home page
- [ ] Products load for each section
- [ ] Cart functionality works (add/remove/update)
- [ ] Order creation saves to database
- [ ] Order history displays correctly

### Part 2: Manager Features
- [ ] Suppliers & Categories page loads
- [ ] Poster sync (suppliers) works
- [ ] Poster sync (products) works
- [ ] Create/edit supplier works
- [ ] Assign products to suppliers
- [ ] Unsorted list shows deduplicated items

### Part 3: Poster Integration
- [ ] OAuth flow completes successfully
- [ ] Access token saved to database
- [ ] Sync imports suppliers from Poster
- [ ] Sync imports ingredients from Poster
- [ ] Sync imports storages as sections
- [ ] Webhook endpoint responds (test with curl)

### Part 4: Multi-Tenant
- [ ] Create second test restaurant
- [ ] Switch between restaurants
- [ ] Verify data isolation (Restaurant A can't see Restaurant B's data)
- [ ] Check restaurant_id validation on API routes

### Part 5: Role-Based Access
- [ ] Admin sees all features
- [ ] Manager sees suppliers & all sections
- [ ] Staff sees only assigned sections
- [ ] Delivery user redirected correctly

---

## Phase 3: Performance Check (15 min)

### Page Load Speed
- [ ] Home page loads < 2 seconds
- [ ] Product lists load < 1 second
- [ ] Cart updates instantly (< 200ms)
- [ ] Order submission < 1 second

### API Performance
- [ ] `/api/sections` responds < 300ms
- [ ] `/api/section-products` responds < 500ms
- [ ] `/api/orders` (POST) completes < 1 second
- [ ] No database timeout errors

### Mobile Testing
- [ ] Test on mobile browser (Chrome/Safari)
- [ ] All buttons are tap-friendly
- [ ] Cart button visible at bottom
- [ ] No horizontal scroll
- [ ] Forms work on mobile keyboard

---

## Phase 4: Store Assets (1-2 hours)

### App Icon
- [ ] Created 512x512px icon
- [ ] Icon is simple and recognizable
- [ ] Icon works at 64x64px (small size)
- [ ] Icon uploaded to Poster dashboard

### Screenshots (Required: 3-5)
1. [ ] Home page with department cards
2. [ ] Product list with cart
3. [ ] Suppliers & Categories (manager view)
4. [ ] Order history/status
5. [ ] (Optional) Poster sync panel

**Screenshot specs:**
- Format: PNG or JPG
- Dimensions: 1280x720 or 1920x1080 (landscape) or 720x1280 (portrait)
- Show actual app usage, not mockups

### Descriptions
- [ ] App title: "Restaurant Checklist" (or your chosen name)
- [ ] Short description (50 chars): E.g., "Multi-department inventory & order management"
- [ ] Full description (500 chars): Features, benefits, why use it
- [ ] Russian translation of descriptions (if required by Poster)

---

## Phase 5: Legal & Support (30 min)

### Legal Pages
- [ ] Privacy policy accessible at `/privacy` ✅
- [ ] Terms of service accessible at `/terms` ✅
- [ ] Contact email listed in legal pages
- [ ] Data retention policy mentioned
- [ ] User rights explained (access, deletion)

### Support Setup
- [ ] Support email created (e.g., support@yourdomain.com)
- [ ] Email added to environment variables: `SUPPORT_EMAIL`
- [ ] Email tested (send/receive works)
- [ ] Auto-reply set up (optional)

---

## Phase 6: Deployment (1 hour)

### Railway / Vercel Setup
- [ ] GitHub repo connected to Railway/Vercel
- [ ] Environment variables configured:
  - [ ] `DATABASE_URL`
  - [ ] `POSTER_APP_ID`
  - [ ] `POSTER_APP_SECRET`
  - [ ] `POSTER_REDIRECT_URI` (production URL)
  - [ ] `AUTH_SECRET`
  - [ ] `CRON_SECRET`
  - [ ] `AUTO_MIGRATE=true` (for first deploy)
- [ ] Build succeeds
- [ ] Deployment completes

### Post-Deployment Checks
- [ ] Visit production URL (site loads)
- [ ] `/api/health` returns `{"status":"ok"}`
- [ ] Database connection works
- [ ] Login page accessible
- [ ] OAuth redirect URI matches Poster settings
- [ ] HTTPS enabled (green padlock in browser)

---

## Phase 7: Poster Integration Setup (30 min)

### OAuth Configuration
- [ ] Poster App ID matches environment variable
- [ ] Poster App Secret matches environment variable
- [ ] Redirect URI in Poster settings: `https://yourdomain.com/api/poster/oauth/callback`
- [ ] App scopes/permissions enabled in Poster dashboard

### Webhook Configuration
- [ ] Webhook URL set in Poster: `https://yourdomain.com/api/poster/webhooks`
- [ ] Webhook events subscribed:
  - [ ] `product.added`
  - [ ] `product.changed`
  - [ ] `product.removed`
  - [ ] `supplier.added`
  - [ ] `supplier.changed`
  - [ ] `supplier.removed`
  - [ ] `storage.added`
  - [ ] `storage.changed`
  - [ ] `storage.removed`
- [ ] Webhook secret configured (if supported by Poster)

### Test Integration
- [ ] Complete OAuth flow from production app
- [ ] Access token saved to database
- [ ] Sync suppliers from Poster (manual button)
- [ ] Sync products from Poster
- [ ] Create test ingredient in Poster POS
- [ ] Webhook triggers (check `webhook_logs` table)
- [ ] New ingredient appears in app within 5 seconds

---

## Phase 8: Monitoring Setup (30 min)

### Error Tracking (Recommended)
- [ ] Install Sentry: `npm install @sentry/nextjs`
- [ ] Run Sentry wizard: `npx @sentry/wizard@latest -i nextjs`
- [ ] Set `NEXT_PUBLIC_SENTRY_DSN` in environment
- [ ] Deploy with Sentry enabled
- [ ] Test error capture (trigger test error)
- [ ] Verify error appears in Sentry dashboard

### Health Monitoring
- [ ] Set up uptime monitoring (e.g., UptimeRobot, Pingdom)
- [ ] Monitor `/api/health` endpoint every 5 minutes
- [ ] Set up email alerts for downtime
- [ ] Monitor database connection pool (check logs)

### Cron Job Monitoring
- [ ] Verify cron job scheduled in Vercel dashboard (3 AM daily)
- [ ] Manually trigger cron: `curl https://yourdomain.com/api/cron/sync-poster?secret=CRON_SECRET`
- [ ] Check function logs for cron execution
- [ ] Verify `last_synced` updates in database

---

## Phase 9: First User Testing (1-2 hours)

### Internal Testing
- [ ] Create admin user account
- [ ] Create manager user account  
- [ ] Create staff user account
- [ ] Create test restaurant
- [ ] Connect test restaurant to Poster (OAuth)
- [ ] Create test order
- [ ] Send test order to WhatsApp
- [ ] Verify order in database
- [ ] Test on mobile device (iPhone/Android)

### Real Restaurant Test (Optional but Recommended)
- [ ] Onboard one friendly restaurant owner
- [ ] Walk through setup process
- [ ] Complete OAuth connection
- [ ] Import their real suppliers/products
- [ ] Create real order together
- [ ] Gather feedback on UX
- [ ] Fix any critical issues found

---

## Phase 10: App Store Submission (1 hour)

### Submission Checklist
- [ ] Log into Poster Developer Dashboard
- [ ] Navigate to "My Apps" → "Create New App"
- [ ] Fill in app information:
  - [ ] App name
  - [ ] Category: "Inventory & Procurement"
  - [ ] Short description
  - [ ] Full description
  - [ ] Support email
  - [ ] Privacy policy URL: `https://yourdomain.com/privacy`
  - [ ] Terms of service URL: `https://yourdomain.com/terms`
- [ ] Upload app icon (512x512px)
- [ ] Upload screenshots (3-5 images)
- [ ] Upload demo video (if available)
- [ ] Set OAuth redirect URI
- [ ] Set webhook URL
- [ ] Enable required API permissions
- [ ] Set pricing model (Free / Paid / Trial)
- [ ] Submit for review

### After Submission
- [ ] Wait for Poster review (typically 3-7 days)
- [ ] Respond to any feedback from Poster team
- [ ] Once approved, app goes live in marketplace

---

## Phase 11: Launch Day! 🎉

### Go-Live Checklist
- [ ] App approved by Poster ✅
- [ ] Production environment stable
- [ ] Monitoring active (Sentry, uptime)
- [ ] Support email monitored
- [ ] Documentation ready (help page, FAQ)
- [ ] Announce launch (social media, email, etc.)

### Day 1 Monitoring
- [ ] Check error logs every 2 hours
- [ ] Monitor Sentry for exceptions
- [ ] Watch for webhook failures
- [ ] Check database performance
- [ ] Monitor user signups
- [ ] Respond to support emails within 4 hours

### Week 1 Tasks
- [ ] Gather user feedback
- [ ] Fix any critical bugs immediately
- [ ] Monitor performance metrics
- [ ] Plan first feature update
- [ ] Thank early adopters

---

## Emergency Contacts

**Hosting Issues (Railway):**
- Dashboard: https://railway.app
- Status: https://status.railway.app

**Hosting Issues (Vercel):**
- Dashboard: https://vercel.com/dashboard
- Status: https://vercel-status.com

**Poster Support:**
- Developer Portal: https://dev.joinposter.com
- Support: (Check Poster docs for contact)

**Database Issues:**
- Connection pooling: Check `lib/db.ts` settings
- Backup/restore: Railway dashboard → Database → Backups

---

## Success Metrics (First Month)

Set goals for your first month:

- [ ] 10+ restaurants onboarded
- [ ] 100+ orders created
- [ ] < 1% error rate (Sentry)
- [ ] 95%+ uptime
- [ ] < 2 second avg page load
- [ ] 4.5+ star rating (if Poster shows ratings)
- [ ] Positive user feedback

---

**Good luck with your launch! 🚀**

Last updated: February 13, 2026
