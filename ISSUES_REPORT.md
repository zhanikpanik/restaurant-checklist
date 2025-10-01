# 🚨 Project Issues & Potential Problems Report

Generated: October 1, 2025

## 🔴 **CRITICAL ISSUES** (App Breaking)

### 1. **Missing Database Configuration**
- **Impact**: App crashes when creating orders
- **Location**: `.env` file missing
- **Error**: `Cannot read properties of null (reading 'connect')`
- **Fix Required**: 
  ```env
  DATABASE_URL=postgresql://user:pass@host:port/dbname
  ```
- **Status**: ⚠️ Partially fixed - added error handling, but DB still needed

### 2. **Missing `cart_items` Table in Schema**
- **Impact**: Cart saving will fail even with DB configured
- **Location**: `src/lib/db-schema.js`
- **Problem**: The schema setup doesn't create the `cart_items` table
- **Files Affected**:
  - `src/pages/api/save-cart-items.js` (tries to insert into cart_items)
  - `src/pages/api/get-cart-items.js` (tries to select from cart_items)
  - `src/pages/api/clear-cart-items.js` (tries to delete from cart_items)
- **Fix Required**: Add table creation to db-schema.js

### 3. **Hardcoded Poster API Token (Security Risk)**
- **Impact**: Security vulnerability, token exposed in client-side code
- **Locations**:
  - `astro.config.mjs` line 20: `'305185:07928627ec76d09e589e1381710e55da'`
  - `src/config/poster.js` line 10: Hardcoded fallback token
- **Risk**: Anyone can see your Poster token in browser dev tools
- **Fix Required**: Remove hardcoded tokens, use only environment variables

---

## 🟠 **HIGH PRIORITY ISSUES** (Functional Problems)

### 4. **No Authentication/Authorization**
- **Impact**: Anyone can access any API endpoint
- **Problem**: No user authentication, no role checking on API routes
- **Examples**:
  - `/api/save-cart-items` - anyone can modify cart
  - `/api/orders` - anyone can create orders
  - `/api/suppliers` - anyone can add/edit suppliers
  - `/api/admin/*` - admin endpoints are public!
- **Risk**: Data manipulation, unauthorized access
- **Referenced in**: `POSTER_APP_STORE_CHECKLIST.md` line 22-27

### 5. **Database Connection Pool Not Checked in 31+ API Endpoints**
- **Impact**: Silent failures or crashes when DB is unavailable
- **Problem**: Only `save-cart-items.js` has proper pool null checking
- **Files Affected**: All API endpoints that use `pool.connect()` (31 files)
- **Current**: Endpoints will crash with same error you experienced
- **Status**: 1/32 fixed

### 6. **Missing Error Handling in client.release()**
- **Impact**: Database connection leaks if error occurs
- **Problem**: All endpoints call `client.release()` in finally block, but if client is undefined (connection failed), it will throw
- **Example Pattern** (in 31 files):
  ```javascript
  try {
      const client = await pool.connect(); // might fail
      // ... operations
  } finally {
      client.release(); // will crash if client is undefined
  }
  ```
- **Fix Required**: Check if client exists before releasing

---

## 🟡 **MEDIUM PRIORITY ISSUES** (Quality & Maintainability)

### 7. **Inconsistent Tenant/Restaurant ID Handling**
- **Impact**: Multi-tenant features may not work correctly
- **Problem**: Some endpoints use `locals.tenantId`, others don't
- **Examples**:
  - `save-cart-items.js` - doesn't filter by tenant
  - `get-cart-items.js` - doesn't filter by tenant
  - Cart data from different restaurants will mix
- **Risk**: Data leakage between restaurants

### 8. **No CORS Configuration**
- **Impact**: API endpoints are open to any origin
- **Problem**: Missing CORS headers configuration
- **Risk**: Cross-site request forgery attacks
- **Fix Required**: Configure CORS in `astro.config.mjs`

### 9. **No Rate Limiting**
- **Impact**: API abuse possible
- **Problem**: Unlimited requests to all endpoints
- **Risk**: DOS attacks, resource exhaustion
- **Fix Required**: Add rate limiting middleware

### 10. **No Input Validation/Sanitization**
- **Impact**: SQL injection, XSS vulnerabilities
- **Examples**:
  - User inputs directly inserted into queries in some places
  - No validation on item names, quantities, etc.
- **Risk**: Database attacks, data corruption
- **Fix Required**: Add validation library (Zod, Joi, etc.)

### 11. **Mixed localStorage and Database Strategy**
- **Impact**: Data inconsistency, hard to debug
- **Problem**: Some data in localStorage, some in DB, no clear sync strategy
- **Locations**:
  - Cart data: localStorage + DB (sometimes)
  - Orders: localStorage (for history) + DB
- **Risk**: Data loss, sync issues
- **Recommendation**: Choose one source of truth

### 12. **No Database Migrations System**
- **Impact**: Hard to update schema in production
- **Problem**: Schema changes only in `db-schema.js` with IF NOT EXISTS
- **Risk**: Can't track schema versions, hard to rollback
- **Fix Required**: Use migration tool (Prisma, Knex, etc.)

---

## 🟢 **LOW PRIORITY ISSUES** (Improvements)

### 13. **No Error Logging/Monitoring**
- **Impact**: Hard to debug production issues
- **Problem**: Only console.log/console.error
- **Recommendation**: Add Sentry, LogRocket, or similar

### 14. **No API Response Standardization**
- **Impact**: Inconsistent error handling in frontend
- **Problem**: Different response formats across endpoints
- **Example**:
  - Some return `{ success: true, data: ... }`
  - Some return `{ error: ... }`
  - No standard error codes
- **Fix Required**: Create standard response wrapper

### 15. **Large Client-Side JavaScript Files**
- **Impact**: Slow page loads
- **Problem**: Large inline scripts in .astro files
- **Example**: `cart.astro`, `bar.astro` have 500+ line scripts
- **Recommendation**: Extract to separate .js modules

### 16. **No TypeScript**
- **Impact**: More runtime errors, harder to refactor
- **Current**: JavaScript only (tsconfig.json exists but unused)
- **Recommendation**: Migrate to TypeScript incrementally

### 17. **No Automated Tests**
- **Impact**: Regressions, hard to refactor safely
- **Current**: No test files found (except tests/ dir with manual tests)
- **Recommendation**: Add Vitest or Jest with basic API tests

### 18. **Unused/Dead Code**
- **Impact**: Confusion, larger bundle
- **Examples**:
  - Multiple tenant-related files that may not be active
  - Old migration scripts
  - Unused API endpoints
- **Recommendation**: Code cleanup

### 19. **Missing .gitignore for .env**
- **Impact**: Risk of committing secrets
- **Check Required**: Verify .env is in .gitignore
- **Critical**: Never commit .env file

### 20. **No Health Check Endpoint**
- **Impact**: Hard to monitor in production
- **Recommendation**: Add `/api/health` endpoint
- **Should Return**: DB status, Poster API status, version

---

## 📋 **Summary Statistics**

- **Total Issues Found**: 20
- **Critical (App Breaking)**: 3
- **High Priority**: 6
- **Medium Priority**: 6
- **Low Priority**: 5

## 🎯 **Recommended Fix Order**

### Phase 1: Make It Work (Critical)
1. ✅ Set up DATABASE_URL environment variable
2. ✅ Add cart_items table to schema
3. ✅ Fix pool null checks in all API endpoints
4. ✅ Remove hardcoded Poster token
5. ✅ Add proper client.release() error handling

### Phase 2: Make It Secure (High Priority)
6. Add authentication middleware
7. Add authorization checks per endpoint
8. Add input validation
9. Configure CORS
10. Add rate limiting

### Phase 3: Make It Stable (Medium Priority)
11. Standardize tenant handling
12. Add database migrations
13. Standardize API responses
14. Add error logging

### Phase 4: Make It Better (Low Priority)
15. Add automated tests
16. Extract inline scripts
17. Add health checks
18. Code cleanup
19. Consider TypeScript migration

---

## 🛠️ **Quick Wins** (Can Fix Now)

1. **Add .env file** with DATABASE_URL
2. **Add cart_items table** to db-schema.js
3. **Apply db-helper.js** to all API endpoints
4. **Remove hardcoded tokens** from astro.config.mjs and poster.js
5. **Add .env to .gitignore** if not already

These 5 fixes will resolve the immediate crash and biggest security issue.

