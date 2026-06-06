# Next.js Deployment Guide for Railway

## ✅ Pre-Deployment Checklist

Your app is now ready to deploy! Here's what has been configured:

### Files Updated for Deployment:
- ✅ `package.json` - Next.js scripts configured
- ✅ `next.config.js` - Standalone output enabled for Docker
- ✅ `Dockerfile` - Optimized for Next.js production
- ✅ `railway.toml` - Railway deployment config
- ✅ `.dockerignore` - Optimized build excludes
- ✅ `.env.local` - Local development variables
- ✅ Database connection - Tested and working

### Environment Variables on Railway:
Your Railway environment already has the correct variables:
- `DATABASE_URL` - Uses internal Railway network (`.railway.internal`)
- `POSTER_APP_ID` - Configured
- `POSTER_APP_SECRET` - Configured
- `POSTER_REDIRECT_URI` - Points to production URL
- `NODE_ENV=production`

## 🚀 Deployment Steps

### Option 1: Deploy via GitHub (Recommended)

1. **Commit your changes:**
   ```bash
   git add .
   git commit -m "Migrate to Next.js from Astro"
   git push origin main
   ```

2. **Railway will automatically:**
   - Detect the changes
   - Build using Dockerfile or Nixpacks
   - Deploy the new Next.js app
   - Use the existing environment variables

### Option 2: Deploy via Railway CLI

```bash
railway up
```

This will:
- Build your app locally
- Upload to Railway
- Deploy to production

## 🔍 Post-Deployment Verification

1. **Check the deployment logs:**
   ```bash
   railway logs
   ```

2. **Test the deployed app:**
   - Visit: `https://restaurant-checklist-production.up.railway.app`
   - Check database connection
   - Test API routes: `/api/sections`, `/api/restaurants`
   - Verify pages load correctly

3. **Monitor the app:**
   ```bash
   railway status
   ```

## 🐛 Troubleshooting

### If build fails:

1. **Check logs:**
   ```bash
   railway logs --follow
   ```

2. **Common issues:**
   - Missing dependencies: Ensure `package.json` is complete
   - Build errors: Check TypeScript errors locally first
   - Memory issues: Railway may need more resources

### If database connection fails:

The production DATABASE_URL should use `.railway.internal`:
```
postgresql://postgres:***@postgres-gk3q.railway.internal:5432/railway
```

This is already configured in your Railway environment.

### If app doesn't start:

1. **Verify build command:**
   ```bash
   npm run build
   ```

2. **Test locally in production mode:**
   ```bash
   npm run build
   npm start
   ```

## 📊 Key Differences from Local

| Environment | Database URL | Features |
|------------|--------------|----------|
| **Local** | `shortline.proxy.rlwy.net:37099` | Public proxy for external access |
| **Production** | `postgres-gk3q.railway.internal:5432` | Internal network, faster & secure |

## 🔄 Future Deployments

Every push to `main` branch will automatically trigger:
1. Build process
2. Tests (if configured)
3. Deployment to Railway
4. Health checks

## ✅ Migration Complete!

Your app has been successfully migrated from:
- **OLD:** Astro + Alpine.js
- **NEW:** Next.js + TypeScript + React

All configured for Railway deployment! 🎉
