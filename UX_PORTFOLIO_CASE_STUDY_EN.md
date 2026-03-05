# Restaurant Procurement: A Zero-Latency B2B Experience

**Role:** Lead Product Designer & Frontend Developer  
**Platform:** Mobile-first Web Application  
**Stack:** Next.js, React, Tailwind CSS, PostgreSQL  

---

## Overview

Restaurants manage hundreds of ingredients daily, requiring staff to regularly count inventory—often late at night. Existing POS systems (like Poster) are built for accountants, with mobile interfaces that are slow and bloated with unnecessary details like tax codes and SKUs. 

The goal of this project was to design a specialized, fast, and simple tool tailored specifically for staff to count inventory and for managers to place supplier orders efficiently.

---

## Zero-Latency Interface

To ensure a seamless experience without waiting for loading spinners, the app uses an **Optimistic UI** pattern. When a user taps to update an item's quantity, the interface updates instantly and provides tactile visual feedback. The actual data syncs with the server quietly in the background, allowing users to rapidly update large lists of ingredients.

> **[ 📸 SCREENSHOT 1: The Bartender's View ]**
> *Where: Department view (`/custom`)*
> *What to show: The list of items with large `+` and `-` touch targets.*
> *Caption: A native-feeling interface designed for rapid, one-handed use.*

---

## Contextual Management Features

Rather than forcing managers into a separate, isolated "admin dashboard," management capabilities are woven naturally into the app's existing workflows. This contextual approach keeps the interface unified and intuitive.

For example, on the Home page, managers instantly see color-coded status cards indicating pending or in-transit orders. When viewing a specific department, they can seamlessly assign users to that department right where the relevant data lives. Tools like "Suppliers & Ingredients" are readily accessible from the main interface without navigating away to a complex admin panel.

> **[ 📸 SCREENSHOT 2: Contextual Management ]**
> *Where: The Home page (`/`) and Department view (`/custom`)*
> *What to show: The status cards on the Home page alongside the user assignment features in the department view.*
> *Caption: Management features are distributed contextually across the app for immediate access.*

---

## Bulk Data Assignment

When connecting the app to a POS system, hundreds of unsorted ingredients must be categorized by supplier. I designed a fluid bulk-assignment workflow: managers use an instant search bar to find items, select them, and use a Floating Action Button (FAB) that triggers a Bottom Sheet. This enables assigning a supplier to dozens of items in a single tap.

> **[ 📸 SCREENSHOT 3: Bulk Assignment Flow ]**
> *Where: The Unsorted tab (`/suppliers-categories`)*
> *What to show: Selected items, the search bar, and the Bottom Sheet open.*
> *Caption: Instant search and bulk actions streamline data organization.*

---

## Background Synchronization

The app integrates with the Poster POS API, pulling thousands of items. To prevent long load times, I engineered a background synchronization system with local PostgreSQL caching using Batch Upserting. This reduced sync time from over 60 seconds to just 2-3 seconds.

This process is visible in a user-friendly Admin Sync Panel, showing managers exactly when their data was last updated without exposing technical logs.

> **[ 📸 SCREENSHOT 4: The Sync Panel ]**
> *Where: The custom Admin panel (`components/PosterSyncPanel.tsx`)*
> *What to show: Visual sync status indicators.*
> *Caption: Translating complex server processes into a human-readable interface.*

---

## Streamlined Order Receiving

Receiving deliveries is often where inventory discrepancies occur. The app simplifies this on the Orders page by categorizing requests into intuitive tabs: Pending, In Transit, and History. 

When a supplier delivery arrives, staff access the "In Transit" tab to confirm the items. The interface displays exactly what was ordered alongside quick-input fields for the actual received quantity and price. Any discrepancy between the ordered and received amounts is instantly highlighted with color-coded text (red for shortages, green for overages), ensuring that errors are immediately visible before the delivery is finalized.

> **[ 📸 SCREENSHOT 5: Order Receiving ]**
> *Where: The Orders page (`/orders`), "In Transit" tab*
> *What to show: The list of incoming items with ordered vs. received quantities and price inputs.*
> *Caption: Discrepancies are highlighted instantly, preventing inventory errors at the moment of delivery.*

---

## Conclusion

By focusing on the physical context of the users, the app eliminates the visual bloat typical of enterprise software. The combination of large touch targets, optimistic updates, and highly performant background synchronization transforms a tedious daily task into a fast, seamless process.