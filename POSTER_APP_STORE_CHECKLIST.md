## Poster App Store Readiness Checklist

Use this list to prepare the app for publishing in the Poster Applications Store.

**Last verified:** February 2026

---

### OAuth, Multi‑Tenant & Secrets
- [x] Remove any hardcoded Poster tokens from client code
- [x] Implement Poster OAuth flow (server-side):
  - [x] `/api/poster/oauth/authorize` to initiate
  - [x] `/api/poster/oauth/callback` to exchange code for tokens
- [x] Store per-tenant tokens securely (DB): `poster_token` in `restaurants` table
- [x] Token refresh logic in `lib/poster-client.ts`
- [x] Keep secrets in environment variables; no secrets committed to repo

### Storage: Move to DB & Tenant Isolation
- [x] PostgreSQL database with proper schema
- [x] `restaurant_id` (tenant_id) on all entities
- [x] Database migrations in `scripts/`
- [x] Indexes on `restaurant_id` and key columns
- [x] Row-Level Security (RLS) enabled

### Authentication, Authorization, Security
- [x] Authenticate user/tenant on every API route (`requireAuth()` in `lib/auth.ts`)
- [x] Authorization rules per role (middleware.ts + `lib/permissions.ts`)
- [x] CSRF protection (`lib/csrf.ts` + middleware + `lib/api-client.ts`)
- [x] Input validation with Zod (`lib/validations.ts`)
- [x] Rate limiting (`lib/rate-limit.ts`)
- [x] Secure cookies (SameSite, HttpOnly)

### Poster API Integration
- [x] Centralized Poster API client (`lib/poster-client.ts`):
  - [x] OAuth token injection per tenant
  - [x] Automatic retry with exponential backoff
  - [x] Rate-limit handling (429 detection)
- [x] Required scopes documented

### Webhooks (Recommended)
- [ ] Webhook endpoints for Poster events (optional for MVP)
- [ ] Verify webhook signatures

### Delivery & Orders Functionality (Tenant‑Scoped)
- [x] All order APIs use `restaurant_id`
- [x] Deletion endpoints prevent cross-tenant access
- [x] Order history per restaurant

### UI/UX & Internationalization
- [x] Mobile responsiveness
- [x] Loading states (skeletons)
- [x] Error states (toast notifications)
- [x] Empty states (illustrated)
- [x] Russian localization
- [ ] English localization (partial - UI is Russian)

### Observability & Operations
- [x] Error tracking ready (`lib/sentry.ts`)
- [x] Health endpoint (`/api/health`)
- [x] Structured error responses
- [ ] Sentry SDK installation (optional)

### Legal & Compliance
- [x] Privacy Policy page (`/privacy`)
- [x] Terms of Service page (`/terms`)
- [ ] Data deletion endpoint (for GDPR)
- [ ] Uninstall webhook handler

### Store Listing Assets
- [x] App descriptions (RU/EN) - see `POSTER_MARKETPLACE_SUBMISSION.md`
- [x] Feature list
- [ ] App icon (512×512) - **YOU CREATE**
- [ ] Screenshots (3-5) - **YOU CAPTURE**
- [ ] Support email - **YOU SETUP**

### Documentation
- [x] Developer docs: `POSTER_MARKETPLACE_SUBMISSION.md`
- [x] Setup docs: `POSTER_SETUP.md`, `DEPLOYMENT.md`
- [ ] End-user help page (`/help`) - **IN PROGRESS**

### Quality Assurance
- [x] TypeScript strict mode
- [x] Input validation on all routes
- [ ] E2E tests (optional for MVP)
- [ ] Load testing (optional for MVP)

### Performance & Cost
- [x] Redis caching available
- [x] Pagination on all lists
- [x] Database indexes

### Environment Variables (Minimum)
- [x] `DATABASE_URL`
- [x] `AUTH_SECRET`
- [x] `NEXTAUTH_URL`
- [x] `POSTER_APP_ID`
- [x] `POSTER_APP_SECRET`
- [x] `POSTER_REDIRECT_URI`
- [ ] `REDIS_URL` (optional)
- [ ] `SENTRY_DSN` (optional)

---

## Summary

| Category | Status |
|----------|--------|
| OAuth & Multi-Tenant | ✅ Complete |
| Authentication & Security | ✅ Complete |
| Database & Storage | ✅ Complete |
| Poster API Integration | ✅ Complete |
| Legal Pages | ✅ Complete |
| UI/UX | ✅ Complete |
| Store Descriptions | ✅ Complete |
| **Store Assets (Icon, Screenshots)** | ⬜ You create |
| **Support Email** | ⬜ You setup |
| **Developer Console Registration** | ⬜ You complete |

---

## Remaining Actions (Owner: You)

1. **Create app icon** (512×512 PNG)
2. **Take 3-5 screenshots** of the app
3. **Setup support email** (e.g., support@yourdomain.com)
4. **Register at dev.joinposter.com**
5. **Submit for review**

See `POSTER_MARKETPLACE_SUBMISSION.md` for detailed instructions.
