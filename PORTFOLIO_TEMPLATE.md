# Bar Inventory & Procurement System

## 📋 Overview
A comprehensive, full-stack B2B SaaS application designed to streamline inventory management and procurement for restaurants and bars. Built to integrate seamlessly with the **Poster POS API**, the system automates stock synchronization, enables role-based workflows for staff and managers, and provides real-time insights into inventory levels.

By caching POS data in a local PostgreSQL database via a custom background cron job system, the application achieves a **30x improvement** in page load times and significantly reduces third-party API rate limit bottlenecks.

## 🚀 Key Features

- **Real-Time POS Syncing:** A robust background sync engine running via Vercel Cron jobs that caches products, categories, suppliers, and ingredients from Poster POS into a PostgreSQL database, cutting API calls by 95% and improving load times from 5-7 seconds to under 200ms.
- **Role-Based Access Control (RBAC):** Tailored experiences for different user roles (Admin, Manager, Staff). Staff members see customized departmental views without access to sensitive settings, while managers can bulk-assign suppliers and monitor overall stock.
- **Procurement Automation:** Intuitive interface for bar staff to adjust inventory levels and instantly generate purchase orders for low-stock items.
- **Optimistic UI Updates:** Built with React and Zustand, offering instant UI updates (e.g., when assigning items to suppliers or modifying stock) without waiting for server round-trips.
- **Secure Authentication:** Implementation of NextAuth.js for secure session management and OAuth 2.0 flow specifically for Poster POS integration.

## 🛠️ Technology Stack

- **Frontend:** Next.js 15 (App Router), React 18, Tailwind CSS, Zustand, Tailwind-Merge, CLSX
- **Backend:** Next.js Route Handlers, Node.js, Vercel Cron Jobs
- **Database & Caching:** PostgreSQL (pg), Redis (ioredis)
- **Authentication & Security:** NextAuth.js (v5 beta), CSRF Protection, bcryptjs
- **Integrations:** Poster POS API (OAuth 2.0, Webhooks)
- **Deployment & Hosting:** Vercel (Frontend & Serverless Functions) / Railway (Database & Background Tasks)

## 💡 Technical Highlights

### 1. High-Performance Sync Architecture
Developed a robust sync service that intelligently determines when to fetch fresh data from Poster POS versus serving from the local PostgreSQL cache. This architecture reduced daily third-party API calls from ~1,000 to ~48.

### 2. State Management & Optimistic Rendering
Leveraged Zustand for global state management and implemented optimistic UI rendering for critical user flows like bulk supplier assignment. This ensures a snappy, zero-latency feel for end users.

### 3. Complex Data Migrations & Role Workflows
Engineered complex SQL schemas to handle multiple tenants (restaurants) efficiently, alongside comprehensive database migration scripts. The application securely segregates data per restaurant while maintaining strict role-based access for operations.

## 📈 Impact

- **Operational Efficiency:** Automated the previously manual procurement process, saving bar staff hours per week in writing manual restock orders.
- **Performance:** Reduced data fetch latency by 48x (from 1.2s to 25ms for categories), delivering a fluid, desktop-like experience on mobile devices.
- **Scalability:** The multi-tenant architecture is production-ready, supporting independent sync configurations and data isolation for multiple restaurant locations.

## 🔗 Links
- **Live Demo:** [Link to your deployed project]
- **Source Code:** [Link to your GitHub repo]
