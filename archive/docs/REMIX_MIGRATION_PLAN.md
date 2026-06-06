# Remix Migration Plan for Restaurant Ordering App

## Overview

Migrate a Next.js 15 restaurant ordering app to Remix. The app handles department-based product ordering with role-based permissions (admin, manager, staff, delivery).

---

## Current Stack

| Layer | Current | Target |
|-------|---------|--------|
| Framework | Next.js 15 (App Router) | Remix |
| Auth | NextAuth v5 | remix-auth + remix-auth-form |
| Database | PostgreSQL (raw queries via `lib/db.ts`) | Same (no change) |
| Styling | Tailwind CSS | Same (no change) |
| State | Zustand | Keep or use Remix loader data |
| UI Components | Custom (`components/ui/*`) | Same (no change) |

---

## Project Structure Mapping

```
CURRENT (Next.js)                    →  TARGET (Remix)
─────────────────────────────────────────────────────────────
app/
├── layout.tsx                       →  app/root.tsx
├── page.tsx                         →  app/routes/_index.tsx
├── orders/page.tsx                  →  app/routes/orders.tsx
├── custom/page.tsx                  →  app/routes/custom.tsx
├── delivery/page.tsx                →  app/routes/delivery.tsx
├── suppliers-categories/page.tsx   →  app/routes/suppliers-categories.tsx
├── admin/users/page.tsx             →  app/routes/admin.users.tsx
├── api/
│   ├── orders/route.ts              →  app/routes/api.orders.ts (or use loaders/actions)
│   ├── sections/route.ts            →  app/routes/api.sections.ts
│   ├── suppliers/route.ts           →  app/routes/api.suppliers.ts
│   ├── users/route.ts               →  app/routes/api.users.ts
│   ├── user-sections/route.ts       →  app/routes/api.user-sections.ts
│   └── auth/[...nextauth]/route.ts  →  app/routes/auth.*.tsx (remix-auth)

components/                          →  app/components/ (copy as-is)
lib/db.ts                            →  app/lib/db.server.ts
lib/api.ts                           →  Remove (use fetcher or direct loader)
lib/auth.ts                          →  app/services/auth.server.ts
```

---

## Migration Steps

### Phase 1: Project Setup

1. **Create Remix project**
   ```bash
   npx create-remix@latest restaurant-checklist-remix
   # Choose: Just the basics, Remix App Server, TypeScript, Yes to npm install
   ```

2. **Install dependencies**
   ```bash
   npm install pg tailwindcss postcss autoprefixer
   npm install remix-auth remix-auth-form bcryptjs
   npm install @types/pg @types/bcryptjs -D
   ```

3. **Configure Tailwind**
   - Copy `tailwind.config.ts` from current project
   - Copy `app/globals.css` → `app/tailwind.css`
   - Import in `root.tsx`

4. **Copy shared files (no changes needed)**
   - `components/ui/*` → `app/components/ui/*`
   - `components/department/*` → `app/components/department/*`
   - `components/manager/*` → `app/components/manager/*`
   - `types/index.ts` → `app/types/index.ts`
   - `lib/db.ts` → `app/lib/db.server.ts`

---

### Phase 2: Authentication

1. **Create auth service** (`app/services/auth.server.ts`)
   ```typescript
   import { Authenticator } from "remix-auth";
   import { FormStrategy } from "remix-auth-form";
   import { sessionStorage } from "~/services/session.server";
   import { verifyLogin } from "~/lib/db.server";

   export const authenticator = new Authenticator(sessionStorage);

   authenticator.use(
     new FormStrategy(async ({ form }) => {
       const email = form.get("email") as string;
       const password = form.get("password") as string;
       const user = await verifyLogin(email, password);
       if (!user) throw new Error("Invalid credentials");
       return user;
     }),
     "user-pass"
   );
   ```

2. **Create session storage** (`app/services/session.server.ts`)
   ```typescript
   import { createCookieSessionStorage } from "@remix-run/node";

   export const sessionStorage = createCookieSessionStorage({
     cookie: {
       name: "_session",
       secrets: [process.env.SESSION_SECRET!],
       sameSite: "lax",
       path: "/",
       httpOnly: true,
       secure: process.env.NODE_ENV === "production",
     },
   });

   export const { getSession, commitSession, destroySession } = sessionStorage;
   ```

3. **Create login route** (`app/routes/auth.login.tsx`)
   ```typescript
   import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
   import { Form } from "@remix-run/react";
   import { authenticator } from "~/services/auth.server";

   export async function loader({ request }: LoaderFunctionArgs) {
     return authenticator.isAuthenticated(request, {
       successRedirect: "/",
     });
   }

   export async function action({ request }: ActionFunctionArgs) {
     return authenticator.authenticate("user-pass", request, {
       successRedirect: "/",
       failureRedirect: "/auth/login",
     });
   }

   export default function LoginPage() {
     return (
       <Form method="post">
         <input type="email" name="email" required />
         <input type="password" name="password" required />
         <button type="submit">Войти</button>
       </Form>
     );
   }
   ```

---

### Phase 3: Convert Pages

#### Pattern: Next.js Page → Remix Route

**Before (Next.js):**
```typescript
"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function OrdersPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then(res => res.json())
      .then(data => {
        setOrders(data.data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return <OrdersList orders={orders} />;
}
```

**After (Remix):**
```typescript
import { LoaderFunctionArgs, json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticator } from "~/services/auth.server";
import { getOrders } from "~/lib/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: "/auth/login",
  });
  
  const orders = await getOrders(user.restaurantId);
  return json({ orders, user });
}

export default function OrdersPage() {
  const { orders, user } = useLoaderData<typeof loader>();
  
  // No loading state needed - data is already loaded!
  return <OrdersList orders={orders} />;
}
```

---

### Phase 4: Convert API Routes

#### Option A: Resource Routes (keeps `/api/*` pattern)

**Before (Next.js `app/api/orders/route.ts`):**
```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await pool.query("SELECT * FROM orders WHERE restaurant_id = $1", [session.user.restaurantId]);
  return NextResponse.json({ success: true, data: result.rows });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const body = await request.json();
  // ... create order
  return NextResponse.json({ success: true, data: newOrder });
}
```

**After (Remix `app/routes/api.orders.ts`):**
```typescript
import { LoaderFunctionArgs, ActionFunctionArgs, json } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";
import { pool } from "~/lib/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await authenticator.isAuthenticated(request);
  if (!user) {
    return json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await pool.query("SELECT * FROM orders WHERE restaurant_id = $1", [user.restaurantId]);
  return json({ success: true, data: result.rows });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await authenticator.isAuthenticated(request);
  const body = await request.json();
  // ... create order
  return json({ success: true, data: newOrder });
}
```

#### Option B: Inline loaders/actions (Remix-native, recommended)

Move data fetching directly into page routes - no separate API files needed.

---

### Phase 5: Convert Components

Most components work as-is. Key changes:

| Pattern | Next.js | Remix |
|---------|---------|-------|
| Navigation | `import { useRouter } from "next/navigation"` | `import { useNavigate } from "@remix-run/react"` |
| Links | `import Link from "next/link"` | `import { Link } from "@remix-run/react"` |
| Session | `useSession()` | `useLoaderData()` (pass from loader) |
| API calls | `fetch("/api/...")` | `useFetcher()` or `<Form>` |
| Images | `next/image` | Regular `<img>` or `remix-image` |

**Example - useRouter replacement:**
```typescript
// Before (Next.js)
import { useRouter } from "next/navigation";
const router = useRouter();
router.push("/orders");

// After (Remix)
import { useNavigate } from "@remix-run/react";
const navigate = useNavigate();
navigate("/orders");
```

**Example - Form submission:**
```typescript
// Before (Next.js)
const handleSubmit = async (data) => {
  const res = await fetch("/api/orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (res.ok) router.push("/orders");
};

// After (Remix) - Option 1: useFetcher
import { useFetcher } from "@remix-run/react";

function OrderForm() {
  const fetcher = useFetcher();
  
  return (
    <fetcher.Form method="post" action="/api/orders">
      <input name="product" />
      <button type="submit">
        {fetcher.state === "submitting" ? "Saving..." : "Save"}
      </button>
    </fetcher.Form>
  );
}
```

---

### Phase 6: File-by-File Migration Checklist

#### Core Files
- [ ] `app/root.tsx` - Layout, providers, Tailwind
- [ ] `app/services/auth.server.ts` - Authentication
- [ ] `app/services/session.server.ts` - Session storage
- [ ] `app/lib/db.server.ts` - Database (copy from `lib/db.ts`)

#### Auth Routes
- [ ] `app/routes/auth.login.tsx`
- [ ] `app/routes/auth.logout.tsx`
- [ ] `app/routes/auth.register.tsx`

#### Main Pages
- [ ] `app/routes/_index.tsx` ← `app/page.tsx`
- [ ] `app/routes/orders.tsx` ← `app/orders/page.tsx`
- [ ] `app/routes/custom.tsx` ← `app/custom/page.tsx`
- [ ] `app/routes/delivery.tsx` ← `app/delivery/page.tsx`
- [ ] `app/routes/suppliers-categories.tsx` ← `app/suppliers-categories/page.tsx`

#### Admin Routes
- [ ] `app/routes/admin._index.tsx`
- [ ] `app/routes/admin.users.tsx` ← `app/admin/users/page.tsx`

#### API Routes (if keeping separate)
- [ ] `app/routes/api.orders.ts`
- [ ] `app/routes/api.sections.ts`
- [ ] `app/routes/api.suppliers.ts`
- [ ] `app/routes/api.products.ts`
- [ ] `app/routes/api.users.ts`
- [ ] `app/routes/api.user-sections.ts`

#### Components (copy, minimal changes)
- [ ] `app/components/ui/*`
- [ ] `app/components/department/*`
- [ ] `app/components/manager/*`
- [ ] `app/components/BottomNav.tsx`

---

## Key Differences Reference

| Feature | Next.js | Remix |
|---------|---------|-------|
| Data loading | `useEffect` + `fetch` | `loader` function |
| Mutations | `fetch` POST | `action` function + `<Form>` |
| Loading states | Manual `useState` | `useNavigation().state` |
| Error handling | Error boundaries | `ErrorBoundary` export |
| Auth check | Middleware or per-page | Loader redirect |
| Env vars (server) | `process.env` | Same |
| Env vars (client) | `NEXT_PUBLIC_*` | Return from loader |

---

## Time Estimate

### Manual Migration
| Phase | Duration |
|-------|----------|
| Phase 1: Setup | 2-3 hours |
| Phase 2: Auth | 3-4 hours |
| Phase 3: Pages | 1-2 days |
| Phase 4: API | 4-6 hours |
| Phase 5: Components | 2-3 hours |
| Phase 6: Testing | 1 day |
| **Total** | **3-4 days** |

### With Claude Opus 4.5
| Phase | Duration |
|-------|----------|
| Phase 1: Setup | 15-20 min |
| Phase 2: Auth | 30-45 min |
| Phase 3: Pages | 2-3 hrs |
| Phase 4: API | 1-1.5 hrs |
| Phase 5: Components | 30-45 min |
| Phase 6: Testing/Fixes | 2-4 hrs |
| **Total** | **6-10 hours (1 focused day)** |

---

## Recommended Workflow with AI

```
Session 1 (2-3 hrs):
├── Create Remix project
├── Setup Tailwind, copy configs
├── Implement auth (remix-auth)
└── Convert root layout

Session 2 (2-3 hrs):
├── Convert main pages (_index, orders, custom)
├── Convert API routes (orders, sections, products)
└── Fix component imports

Session 3 (2-3 hrs):
├── Convert remaining pages (delivery, admin, suppliers)
├── Convert remaining API routes
└── Test auth flow, fix bugs

Session 4 (1-2 hrs):
├── Fix edge cases
├── Test all user roles
└── Final cleanup
```

---

## Post-Migration Benefits

1. **No "use client" directives** - Everything works naturally
2. **No hydration mismatches** - Server renders correctly
3. **Native forms** - Less JavaScript for mutations
4. **Simpler mental model** - Loader → Component → Action
5. **Better error handling** - Built-in error boundaries per route
6. **Smaller bundle** - Only ship what's needed
7. **Faster navigation** - Prefetching built-in

---

## Commands Reference

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm start

# Type checking
npm run typecheck
```
