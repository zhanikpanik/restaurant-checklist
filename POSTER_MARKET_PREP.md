# 🚀 Poster App Market Submission Guide

**Goal:** Submit "Restaurant Checklist" to the Poster App Market.
**Docs:** [Poster Market Guidelines](https://dev.joinposter.com/docs/v3/market/guidelines/index)

---

## 📋 Checklist Overview

- [ ] **1. App Configuration** (Manifest settings)
- [ ] **2. Legal Pages** (Privacy & Terms)
- [ ] **3. Marketing Text** (Name, Descriptions, Benefits)
- [ ] **4. Visual Assets** (Icon, Screenshots)
- [ ] **5. Test Credentials** (For review team)
- [ ] **6. Video Demo** (Optional but recommended)

---

## 1. App Configuration (Developer Console)

Go to [Poster Developer Console](https://joinposter.com/en/manage/applications) and verify:

| Setting | Value / Instruction |
|---------|---------------------|
| **Platform URL** | `https://restaurant-checklist-production.up.railway.app` (The iframe URL) |
| **Auth URL** | `https://restaurant-checklist-production.up.railway.app/api/poster/oauth/authorize` |
| **Support URL** | `https://restaurant-checklist-production.up.railway.app/help` or your email |
| **Privacy Policy** | `https://restaurant-checklist-production.up.railway.app/privacy` |
| **Terms of Service** | `https://restaurant-checklist-production.up.railway.app/terms` |
| **Background URL** | (Optional) URL to a background image for the iframe loader |

---

## 2. Legal Pages Verification

- **Privacy Policy:** content is in `app/privacy/page.tsx`.
  - ⚠️ **Action:** Check line ~130: `privacy@restaurant-checklist.com`. Change this to your real email if needed.
- **Terms of Service:** content is in `app/terms/page.tsx`.
  - ⚠️ **Action:** Check line ~205: `support@restaurant-checklist.com`. Change this to your real email.

---

## 3. Marketing Text (Copy & Paste)

Here are the drafts for your listing. You can use them as-is or translate/tweak them.

### 🇬🇧 English

**App Name:** Restaurant Checklist & Orders

**Short Description:**
Manage department checklists, create supply orders, and sync inventory with Poster POS in real-time.

**Full Description:**
Simplify your restaurant's daily operations with **Restaurant Checklist**. This app connects directly to your Poster POS inventory to streamline ordering and task management for your kitchen, bar, and staff.

**Key Features:**
*   **Department Checklists:** Create digital checklists for every station (Kitchen, Bar, etc.).
*   **Smart Ordering:** Staff can create supply orders directly from the app.
*   **Poster Integration:** Automatically syncs products, ingredients, and suppliers from Poster.
*   **Role-Based Access:** Control who can see orders and who can send them.
*   **WhatsApp Integration:** Send orders to suppliers with one click.
*   **Real-time Sync:** Always work with the latest inventory data.

**How it works:**
1.  Install the app and authorize with Poster.
2.  Your storage locations automatically become departments.
3.  Staff log in to check stock and create orders.
4.  Managers review and send orders to suppliers.

---

### 🇷🇺 Russian (Primary)

**App Name:** Чек-лист и Заказы (Restaurant Checklist)

**Short Description:**
Управление чек-листами, заказами поставщикам и синхронизация складских остатков с Poster POS.

**Full Description:**
Упростите ежедневную рутину вашего ресторана с приложением **Restaurant Checklist**. Приложение напрямую связывается с вашим складом Poster POS для удобного управления заказами и задачами кухни, бара и персонала.

**Ключевые возможности:**
*   **Чек-листы отделов:** Цифровые бланки заказов для каждой станции (Кухня, Бар и т.д.).
*   **Умные заказы:** Персонал создает заявки на закупку прямо в приложении.
*   **Интеграция с Poster:** Автоматическая синхронизация товаров, ингредиентов и поставщиков.
*   **Контроль доступа:** Настройка прав доступа для сотрудников (кто может видеть и отправлять заказы).
*   **Отправка в WhatsApp:** Формирование заказа для поставщика в один клик.
*   **Актуальные остатки:** Работа всегда с актуальными данными склада.

**Как это работает:**
1.  Установите приложение в Poster.
2.  Ваши склады автоматически станут отделами в приложении.
3.  Сотрудники отмечают необходимое количество товаров.
4.  Менеджер проверяет и отправляет сводный заказ поставщикам.

---

## 4. Visual Assets Requirements

You need to prepare these files. Use a design tool like Canva, Figma, or Photoshop.

| Asset | Size | Format | Requirements |
|-------|------|--------|--------------|
| **App Icon** | 512x512 px | PNG/JPG | Square, clear logo. Avoid small text. |
| **Screenshots** | 1280x720 px (16:9) | PNG/JPG | High quality, show main features. Min 3, Max 10. |

**Recommended Screenshots to Capture:**
1.  **Main Dashboard:** Showing the list of departments (Kitchen, Bar, etc.) with clean icons.
2.  **Order Process:** Inside a department, showing products with the counter (+/-) buttons.
3.  **Cart View:** The "Cart" screen showing the summary of items to order.
4.  **Manager View:** The "Orders" page showing the status of different orders.
5.  **Settings/Sync:** The Suppliers page showing the new "Sync" button and categories.

**Tip:** Use the "Device Mode" in Chrome DevTools (F12) to simulate a tablet (iPad) resolution if you don't have a device, or take full-screen desktop screenshots and crop them.

---

## 5. Test Credentials

The review team needs to test the app. Since your app uses Poster OAuth, they will likely use their own Poster account.

**However, they might ask for a "Test Scenario":**
1.  **Login:** "Open the app from the Poster POS interface."
2.  **Action:** "Go to 'Kitchen', add 2 items to cart."
3.  **Action:** "Go to Cart, click 'Create Order'."
4.  **Verification:** "Check the 'Orders' tab to see the new order."

---

## 🚀 Submission Steps

1.  Login to **Poster Developer Console**.
2.  Select your app.
3.  Fill in the **"Market"** or **"Publishing"** tab details using the text above.
4.  Upload your **Icon** and **Screenshots**.
5.  Submit for review!

**Good luck!** 🎉
