# Case Study: Streamlining Restaurant Procurement (B2B SaaS)

**Role:** Lead Product Designer & Frontend Developer  
**Platform:** Mobile-first Web Application  
**Stack:** Next.js, React, Tailwind CSS, PostgreSQL  

---

## 1. Analysis: Understanding the Pain of Restaurant Procurement

Before drawing a single screen, I spent time analyzing how restaurant bar staff and managers actually order supplies. The procurement process in hospitality is notoriously chaotic. 

**The Current Reality:**
1. **The Bartender's Night Shift:** At 2:00 AM, exhausted after a busy shift, a bartender has to go into the stockroom, count bottles, and figure out what to order for tomorrow.
2. **The Clunky POS Problem:** Most restaurants use powerful POS (Point of Sale) systems like Poster. These systems are great for accounting, but their mobile interfaces for inventory management are bloated, slow, and overly complex for a bartender who just needs to order 5 bottles of syrup.
3. **The Manager's Headache:** The manager receives disjointed requests via WhatsApp or scribbled on paper, has to figure out which supplier provides which syrup, and consolidate everything into official purchase orders.

**Why existing solutions fail:**
*   **Information Overload:** They show too much irrelevant data (SKUs, internal accounting codes, tax IDs) to staff who only care about names and quantities.
*   **High Latency:** Traditional web apps show a loading spinner every time you change a quantity. When counting 100 items, waiting 2 seconds per item means spending minutes just looking at spinners.
*   **Unforgiving Workflows:** Sorting hundreds of new ingredients into supplier categories requires clicking through endless dropdown menus.

**The Goal:** 
Create a mobile-first interface that strips away everything except the absolute essentials. It needed to be fast enough to use with one hand while standing in a cramped stockroom, and smart enough to organize data cleanly for the managers.

---

## 2. Design Philosophy: Speed as a UI/UX Feature

In a fast-paced restaurant environment, **speed is not just a technical metric; it is a core design feature.** Every interaction needed to feel instantaneous. 

To achieve this, I implemented **Optimistic UI**. When a bartender taps `+` to increase stock, or a manager bulk-assigns items to a supplier, the interface updates immediately—giving instant tactile feedback while the server syncs quietly in the background.

---

## 3. The Solutions & Screen Walkthrough

### 1. Decluttering the Executive Dashboard

**The Challenge:** The initial dashboard suffered from cognitive overload. Status cards were bloated with unnecessary text, useless item counts, and lacked visual hierarchy. 

**The Solution:** I redesigned the information architecture, reducing the cards from three lines of text to a highly scannable two-line layout. I introduced subtle gradient backgrounds (yellow for pending, blue for transit) and consistent iconography. The result is a 40% reduction in vertical space and drastically improved readability.

> **[ 📸 INSERT SCREENSHOT 1: The Executive Dashboard ]**
> *   **Where to capture:** The main home page (`/`) showing the top status cards (Pending, In Transit, Last Order) and the list of departments below.
> *   **Caption:** *Clean, color-coded status cards give managers instant situational awareness without overwhelming them with data.*

---

### 2. The Core Interaction: Zero-Latency Ordering Flow

**The Challenge:** Ordering ingredients needs to be as frictionless as adjusting the volume on a phone. The old way required tapping into a product detail page, typing a number on a virtual keyboard, and hitting save.

**The Solution:** I designed a clean, mobile-native list view with large, thumb-friendly `+` and `-` touch targets. By leveraging Optimistic UI, we eliminated loading spinners entirely during the ordering flow. Tapping a button triggers a satisfying `active:scale-[0.98]` micro-interaction, providing the tactile feedback of a native iOS app.

> **[ 📸 INSERT SCREENSHOT 2: Staff Ordering Flow ]**
> *   **Where to capture:** A department view (`/custom`) where staff adjust ingredient quantities.
> *   **Caption:** *A native-feeling, zero-latency interface designed for one-handed use in busy restaurant environments.*

---

### 3. Solving Complex Workflows: Manager Bulk Assignment

**The Challenge:** B2B apps often fail at complex workflows. When a restaurant syncs its POS system, hundreds of ingredients drop into an "Unsorted" list. Managers needed a way to quickly assign these items to specific suppliers (e.g., "Coca-Cola goes to Metro", "Lemons go to Local Market").

**The Solution:** Instead of forcing the user into a dropdown menu for every single item, I designed a powerful bulk-assignment flow. 
1. Managers use a fast, instant search bar to filter items.
2. They select multiple items using custom, brand-colored checkboxes.
3. A sleek **Floating Action Button (FAB)** appears at the bottom.
4. Tapping it slides up a native-style **Bottom Sheet** where they select the supplier once.

> **[ 📸 INSERT SCREENSHOT 3: Manager Bulk Assignment ]**
> *   **Where to capture:** The `/suppliers-categories` page (Unsorted Tab) with a few items selected and the Bottom Sheet open.
> *   **Caption:** *Replacing clunky web dropdowns with a native-feeling Floating Action Bar and Bottom Sheet for rapid bulk actions.*

---

### 4. Masking Technical Complexity: Background Syncing

**The Challenge:** The app pulls thousands of items from the Poster POS API. Directly querying this API caused page loads of up to 60 seconds—unacceptable for mobile users.

**The Solution:** I engineered a background syncing system with a PostgreSQL cache. To handle the "N+1 Query Problem," I implemented Batch Upserting, dropping the sync time from over a minute to under 3 seconds. 

Because transparency builds trust, I designed a beautiful internal admin panel so managers can see exactly when their data was last synced without being exposed to the raw database logs.

> **[ 📸 INSERT SCREENSHOT 4: The Poster Sync Admin Panel ]**
> *   **Where to capture:** The custom Admin panel (`components/PosterSyncPanel.tsx`) showing the visual sync status.
> *   **Caption:** *Good design extends to internal tooling: bridging the gap between raw backend data and human-readable status.*

---

## 4. The Impact

By focusing heavily on the initial analysis of the user's physical environment, I was able to strip away the bloat typical of B2B software. 

The combination of thoughtful UI design (softer radii, custom micro-interactions, floating action buttons) and performant frontend architecture (Optimistic UI, Batch Upserting) resulted in an application that transformed a tedious 2:00 AM chore into a seamless, modern experience.

**It proves that B2B internal tools don't have to be ugly or slow.**