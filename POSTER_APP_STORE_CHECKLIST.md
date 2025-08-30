## Poster App Store Readiness Checklist

Use this list to prepare the app for publishing in the Poster Applications Store. Mark each item when done.

### OAuth, Multi‑Tenant & Secrets
- [ ] Remove any hardcoded Poster tokens from client code (e.g., `public/scripts/checklist.js`)
- [ ] Implement Poster OAuth flow (server-side):
  - [ ] `POST /api/poster/oauth/start` to initiate
  - [ ] `GET /api/poster/oauth/callback` to exchange code for tokens
- [ ] Store per-tenant tokens securely (DB): `poster_account_id`, `access_token`, `refresh_token`, `expires_at`
- [ ] Add token refresh logic and scope management
- [ ] Keep secrets in environment variables; no secrets committed to repo

### Storage: Move to DB & Tenant Isolation
- [ ] Replace file-based storage in `src/lib/orderStorage.js` with DB (Postgres/MySQL/SQLite)
- [ ] Add `tenant_id` to orders and all relevant entities
- [ ] Create DB migrations (e.g., Prisma/Knex) and seed scripts
- [ ] Add indexes on `tenant_id`, `timestamp`, `department`
- [ ] Data migration: import `data/*.json` into DB under your own tenant

### Authentication, Authorization, Security
- [ ] Authenticate user/tenant on every API route (`src/pages/api/*`)
- [ ] Authorization rules per role/department (align with `ROLE_BASED_ACCESS.md`)
- [ ] Add CSRF protection for POST endpoints; secure cookies (SameSite, Secure)
- [ ] Validate and sanitize all inputs; return safe errors
- [ ] Configure CORS to only allow your domain(s)
- [ ] Rate limiting and request size limits on APIs

### Poster API Integration
- [ ] Centralize Poster API client (`src/config/poster.js`) with:
  - [ ] OAuth token injection per tenant
  - [ ] Automatic refresh on 401/expired
  - [ ] Retry/backoff and basic rate-limit handling
- [ ] Use only necessary OAuth scopes; document required scopes

### Webhooks (Recommended)
- [ ] Add webhook endpoints for Poster events (e.g., inventory updates)
- [ ] Verify webhook signatures/shared secret
- [ ] Reconcile updates per tenant

### Delivery & Orders Functionality (Tenant‑Scoped)
- [ ] Ensure all order APIs read/write using `tenant_id`
- [ ] Exports (XLS/CSV) use server data only and are tenant-scoped
- [ ] Deletion/cleanup endpoints prevent cross-tenant access

### UI/UX & Internationalization
- [ ] Onboarding flow: “Connect Poster account” (OAuth) and success page
- [ ] Account switch/logout for multi-tenant use
- [ ] Localize UI text (RU + EN at minimum); avoid hardcoded strings in JS/HTML
- [ ] Mobile responsiveness; keyboard navigation; loading/error states

### Observability & Operations
- [ ] Structured logging (e.g., Pino) with correlation IDs; redact sensitive fields
- [ ] Error tracking (Sentry or similar)
- [ ] Health and readiness endpoints; Docker/container readiness
- [ ] Backups and restore runbook for DB

### Legal & Compliance
- [ ] Privacy Policy and Terms of Service pages/links
- [ ] Data retention and user data deletion policy (per tenant)
- [ ] Uninstall flow: revoke tokens and purge tenant data on request

### Store Listing Assets
- [ ] App name, short/long description, features list (localized)
- [ ] App icon (512×512), cover/banner images, 3–5 screenshots
- [ ] Categories and keywords
- [ ] Support contact email and documentation links

### Documentation
- [ ] End‑user docs: setup, permissions, common tasks, troubleshooting
- [ ] Developer docs: env vars, deploy steps, OAuth scopes, webhooks
- [ ] Changelog and versioning policy

### Quality Assurance
- [ ] E2E tests: connect Poster → create order → deliver → export → delete
- [ ] Cross‑browser/device tests (iOS/Android + desktop)
- [ ] Load test for concurrent tenants and order volumes
- [ ] Security audit: dependency audit, static analysis, penetration test checklist

### Performance & Cost
- [ ] Cache Poster inventory responses per tenant (short TTL)
- [ ] Optimize XLS exports; stream large files
- [ ] Monitor DB query performance and add missing indexes

### Pricing/Billing (If Applicable)
- [ ] Define free vs paid tiers; limits per tenant
- [ ] Integrate billing (Poster store mechanisms or external)

### Environment Variables (Minimum)
- [ ] `POSTER_CLIENT_ID`
- [ ] `POSTER_CLIENT_SECRET`
- [ ] `POSTER_REDIRECT_URI`
- [ ] `DATABASE_URL`
- [ ] `SESSION_SECRET` or `JWT_SECRET`
- [ ] `SITE_URL`
- [ ] `LOG_LEVEL`, `SENTRY_DSN` (optional)

### Code Changes To Plan in This Repo
- [ ] `public/scripts/checklist.js`: remove direct Poster calls/tokens; call server APIs
- [ ] `src/config/poster.js`: implement Poster OAuth client + token refresh
- [ ] `src/lib/orderStorage.js`: migrate to DB with `tenant_id`; remove file I/O
- [ ] `src/pages/api/*`: enforce auth, inject `tenant_id`, validate input
- [ ] Add `/connect` page (OAuth start) and post‑install success page

### Submission Process (Poster)
- [ ] Register the app in Poster partner console; set redirect URLs
- [ ] Provide scopes, public URLs, support contacts, legal links, and assets
- [ ] Self‑review against Poster guidelines; submit and address feedback

---

Tip: Start by removing client tokens and adding OAuth + DB. Then tenant‑scope all APIs, add onboarding, and finish with docs, legal, and store assets.


