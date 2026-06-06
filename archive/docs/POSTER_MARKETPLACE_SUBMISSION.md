# Poster Marketplace Submission Guide

## Quick Start Checklist

- [ ] Register at https://dev.joinposter.com/
- [ ] Create new application
- [ ] Configure OAuth settings
- [ ] Prepare store assets
- [ ] Submit for review

---

## Step 1: Developer Console Registration

### 1.1 Create Developer Account

1. Go to **https://dev.joinposter.com/**
2. Click "Регистрация" (Registration)
3. Fill in your details:
   - Email
   - Password
   - Company name (your restaurant or business name)
4. Verify email

### 1.2 Create New Application

1. Log in to developer console
2. Click "Создать приложение" (Create Application)
3. Fill in basic info:
   - **Название (Name):** Закуп
   - **Описание (Description):** Управление закупками ресторана
   - **Тип (Type):** Web Application

---

## Step 2: OAuth Configuration

### 2.1 Required Settings

In your application settings, configure:

| Setting | Value |
|---------|-------|
| **Redirect URI** | `https://YOUR_DOMAIN/api/poster/oauth/callback` |
| **Application URL** | `https://YOUR_DOMAIN` |
| **Webhook URL** | `https://YOUR_DOMAIN/api/poster/webhook` (optional) |

### 2.2 Required OAuth Scopes

Request these scopes for full functionality:

```
menu.getIngredients      - Read ingredients list
storage.getStorages      - Read storage locations
storage.getStorageLeftovers - Read inventory levels
suppliers.getSuppliers   - Read suppliers list
dash.getTransactionProducts - Read transaction data
```

### 2.3 Get Credentials

After creating the app, you'll receive:
- **Application ID** (POSTER_APP_ID)
- **Application Secret** (POSTER_APP_SECRET)

Add these to your `.env.local`:

```env
POSTER_APP_ID=your_application_id
POSTER_APP_SECRET=your_application_secret
POSTER_REDIRECT_URI=https://your-domain.com/api/poster/oauth/callback
```

---

## Step 3: Store Listing Assets

### 3.1 Required Assets

| Asset | Specification | Status |
|-------|---------------|--------|
| App Icon | 512×512 PNG, transparent background | ⬜ Create |
| Screenshots | 1280×800 or 640×1136 (mobile), 3-5 images | ⬜ Capture |
| Cover Image | 1200×630 PNG (optional) | ⬜ Create |

### 3.2 App Icon Guidelines

- Simple, recognizable design
- Works at small sizes (32×32)
- Suggested: Shopping cart or checklist icon
- Colors: Blue/Green (professional, procurement-themed)

### 3.3 Screenshots to Capture

1. **Checklist View** (Mobile)
   - Show product list with quantity inputs
   - Include section tabs visible

2. **Cart / Order Summary** (Mobile)
   - Products grouped by supplier
   - WhatsApp button visible

3. **Manager Dashboard - Products** (Desktop)
   - Show bulk selection feature
   - Category filter visible

4. **Manager Dashboard - Orders** (Desktop)
   - Order list with statuses
   - Filter pills visible

5. **WhatsApp Message** (Optional)
   - Show generated order message

---

## Step 4: Store Listing Content

### 4.1 App Name
**RU:** Закуп — Управление закупками
**EN:** Zakup — Procurement Manager

### 4.2 Short Description (80 chars max)

**RU:** Автоматизация закупок: чек-листы, заказы поставщикам, отправка в WhatsApp

**EN:** Automate procurement: checklists, supplier orders, WhatsApp integration

### 4.3 Long Description

**RU:**
```
Закуп — приложение для управления закупками ресторана, интегрированное с Poster POS.

🔄 АВТОМАТИЧЕСКАЯ СИНХРОНИЗАЦИЯ
• Импорт ингредиентов и складов из Poster
• Категории товаров с привязкой к поставщикам
• Актуальные данные без ручного ввода

📋 УДОБНЫЕ ЧЕК-ЛИСТЫ
• Разделение по секциям (Бар, Кухня, Кондитерская)
• Быстрый ввод количества с клавиатуры
• Фильтрация по категориям и поиск

📦 ФОРМИРОВАНИЕ ЗАКАЗОВ
• Автоматическая группировка по поставщикам
• Отправка заказов в WhatsApp одним кликом
• История заказов и статусы (ожидает → отправлен → доставлен)

👥 РАЗДЕЛЕНИЕ ПРАВ
• Роли: Менеджер, Бармен, Повар
• Каждый сотрудник видит только свои секции
• Централизованное управление для менеджера

⚡ ЭКОНОМИЯ ВРЕМЕНИ
• Замена бумажных списков на цифровые
• Уменьшение ошибок при заказе
• Прозрачная история закупок

Идеально для: кафе, рестораны, бары, кондитерские, кофейни.
```

**EN:**
```
Zakup — procurement management app integrated with Poster POS.

🔄 AUTOMATIC SYNC
• Import ingredients and storage locations from Poster
• Product categories linked to suppliers
• Up-to-date data without manual entry

📋 SMART CHECKLISTS
• Organized by sections (Bar, Kitchen, Pastry)
• Quick quantity input from keyboard
• Filter by category and search

📦 ORDER MANAGEMENT
• Auto-grouping by supplier
• One-click WhatsApp order sending
• Order history with status tracking

👥 ROLE-BASED ACCESS
• Roles: Manager, Bartender, Chef
• Staff sees only their sections
• Centralized management for managers

⚡ TIME SAVINGS
• Replace paper lists with digital
• Reduce ordering errors
• Transparent procurement history

Perfect for: cafes, restaurants, bars, bakeries, coffee shops.
```

### 4.4 Features List

**RU:**
1. Синхронизация ингредиентов с Poster
2. Чек-листы по секциям
3. Заказы поставщикам с группировкой
4. Отправка в WhatsApp
5. История заказов
6. Разделение прав по ролям
7. Мобильная версия

**EN:**
1. Ingredient sync with Poster
2. Section-based checklists
3. Supplier orders with grouping
4. WhatsApp integration
5. Order history
6. Role-based access control
7. Mobile-friendly

### 4.5 Categories

- Inventory Management
- Procurement
- Ordering

### 4.6 Keywords/Tags

```
закупки, инвентаризация, склад, поставщики, whatsapp, чек-лист, заказы
procurement, inventory, suppliers, ordering, checklist, restaurant
```

---

## Step 5: Support & Legal

### 5.1 Required Links

| Page | URL | Status |
|------|-----|--------|
| Privacy Policy | `/privacy` | ✅ Exists |
| Terms of Service | `/terms` | ✅ Exists |
| Help / Documentation | `/help` | ⬜ Create |
| Support Contact | Email | ⬜ Setup |

### 5.2 Support Email

Create a support email, e.g.:
- support@your-domain.com
- zakup.support@gmail.com

---

## Step 6: Pre-Submission Checklist

### Technical Requirements

- [x] OAuth flow implemented (`/api/poster/oauth/*`)
- [x] Multi-tenant architecture (restaurant_id isolation)
- [x] CSRF protection (middleware + api-client)
- [x] Rate limiting (lib/rate-limit.ts)
- [x] Input validation (Zod schemas)
- [x] Error handling (structured responses)
- [x] HTTPS only (production)

### Legal Requirements

- [x] Privacy Policy page (`/privacy`)
- [x] Terms of Service page (`/terms`)
- [ ] Support email configured
- [ ] Data deletion process documented

### Store Assets

- [ ] App icon (512×512)
- [ ] Screenshots (3-5)
- [ ] Short description (RU/EN)
- [ ] Long description (RU/EN)
- [ ] Feature list

---

## Step 7: Submit for Review

1. Complete all checklist items above
2. In Poster Developer Console:
   - Upload all assets
   - Fill in all description fields
   - Set pricing (Free / Paid)
   - Submit for review
3. Wait for Poster team review (typically 3-7 business days)
4. Address any feedback
5. App goes live in Poster Marketplace!

---

## Environment Variables Summary

```env
# Required for production
DATABASE_URL=postgresql://...
AUTH_SECRET=your-auth-secret-min-32-chars
NEXTAUTH_URL=https://your-domain.com

# Poster OAuth
POSTER_APP_ID=your_app_id
POSTER_APP_SECRET=your_app_secret
POSTER_REDIRECT_URI=https://your-domain.com/api/poster/oauth/callback

# Optional
REDIS_URL=redis://...
SENTRY_DSN=https://...@sentry.io/...
```

---

## Pricing Recommendations

### Free Tier
- 1 restaurant
- Basic features
- Community support

### Pro Tier (suggested: $9.99/month)
- Unlimited restaurants
- Priority support
- Advanced analytics (future)

---

## Timeline Estimate

| Task | Time |
|------|------|
| Developer registration | 30 min |
| OAuth configuration | 1 hour |
| Create app icon | 1-2 hours |
| Take screenshots | 1 hour |
| Fill store listing | 1 hour |
| Review & submit | 30 min |
| **Total** | **~1 day** |

---

## Contact

For Poster Developer Support:
- Documentation: https://dev.joinposter.com/docs
- Support: developers@joinposter.com

---

*Last updated: February 2026*
