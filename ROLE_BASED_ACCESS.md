# 👥 Role-Based Access System

## 🎯 Overview
Simple role-based access without login system - just different URLs for different users.

## 🔗 Access URLs

### **Main Entry Point**
- **`/`** - Role selector page with statistics

### **Staff Access**
- **`/bar`** - Bar staff (🍷)
  - Manage bar inventory 
  - Create orders for beverages
  - Add custom items

- **`/kitchen`** - Kitchen staff (🍳)
  - Manage kitchen inventory
  - Create orders for food items
  - Add custom items

- **`/delivery`** - Delivery person (🚚)
  - View all orders from bar & kitchen
  - Mark orders as delivered
  - Filter by status (pending/delivered)

### **Management Access**
- **`/restaurant/procurement`** - Order management (📋)
  - View order history
  - Export/manage purchases

## 🎨 Visual Differences

### **Color Coding**
- **Bar**: Blue theme (🍷)
- **Kitchen**: Orange theme (🍳) 
- **Delivery**: Green theme (🚚)
- **Management**: Purple accents (📋)

### **Role Headers**
Each page shows:
- Role icon and name
- Department context
- "← Главная" link to return to role selector

## 📱 How Users Access

### **Setup Method 1: Bookmarks**
Give each user their direct bookmark:
- Bar staff: `https://your-domain.com/bar`
- Kitchen staff: `https://your-domain.com/kitchen`
- Delivery: `https://your-domain.com/delivery`

### **Setup Method 2: Home Screen Apps**
Create separate "app" bookmarks on mobile:
- **"Бар"** → `/bar`
- **"Кухня"** → `/kitchen`
- **"Доставка"** → `/delivery`

### **Setup Method 3: QR Codes**
Print QR codes for each workstation:
```
[QR Code] → /bar     (at bar counter)
[QR Code] → /kitchen (at kitchen station)
[QR Code] → /delivery (for delivery person)
```

## 🔄 Data Separation

### **Storage Isolation**
- **Bar**: Uses Poster storage_id=2
- **Kitchen**: Uses Poster storage_id=1
- **Orders**: Saved separately by department

### **Local Storage Keys**
- `barOrderHistory` - Bar order history
- `kitchenOrderHistory` - Kitchen order history
- `barOrderDraft` - Current bar draft
- `kitchenOrderDraft` - Current kitchen draft

## 🎯 Benefits

### **✅ Advantages**
- **No login complexity** - Just different URLs
- **Easy access** - Bookmark or QR codes
- **Visual separation** - Color coding prevents mistakes
- **Mobile friendly** - Each role optimized for workflow
- **Simple training** - "Use your link"

### **⚠️ Limitations**
- No access control (anyone with URL can access)
- Relies on user discipline
- No user tracking/analytics

## 🚀 Usage Instructions

### **For Restaurant Owner**
1. Give each staff member their specific URL
2. Tell them to bookmark it
3. Optional: Print QR codes for workstations

### **For Staff**
1. **Bar staff**: Use `/bar` link
2. **Kitchen staff**: Use `/kitchen` link  
3. **Delivery person**: Use `/delivery` link
4. **Managers**: Use `/` for overview, `/restaurant/procurement` for detailed management

### **Training Script**
> "Each department has its own link. Bar staff use the bar link, kitchen staff use the kitchen link. Bookmark your link on your phone. If you're lost, go to the main page and choose your department."

## 📊 Role Capabilities

| Role | Create Orders | View Inventory | Mark Delivered | View All Orders |
|------|---------------|----------------|----------------|-----------------|
| Bar | ✅ Bar only | ✅ Bar only | ❌ | ❌ |
| Kitchen | ✅ Kitchen only | ✅ Kitchen only | ❌ | ❌ |
| Delivery | ❌ | ❌ | ✅ | ✅ |
| Management | ✅ Via procurement | ✅ All | ✅ | ✅ |

This system provides clean separation without the complexity of login systems - perfect for restaurant workflows!