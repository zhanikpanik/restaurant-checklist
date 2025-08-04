# 📦 Poster Inventory Update Feature

## 🎯 Overview
Your app now supports **manual inventory updates** to Poster after deliveries are confirmed! This gives you control over when inventory is updated in your POS system.

## 🔄 How It Works

### **Complete Workflow:**
```
1. Create Order (Bar/Kitchen) → 2. Send to Supplier → 3. Mark Delivered → 4. Manual Poster Update
```

### **📋 Manual Update Process:**

#### **Step 1: Mark Orders as Delivered**
- **Where**: `/delivery` page (Delivery person)
- **What**: Enter actual quantities received
- **Result**: Orders marked as "delivered" in local system

#### **Step 2: Update Poster Inventory**
- **Where**: `/restaurant/procurement` page (Admin/Manager)
- **When**: When ready to update inventory
- **What**: Batch update all delivered orders to Poster
- **Result**: Inventory added to Poster storage

## 🛠️ Technical Implementation

### **API Endpoint: `/api/update-poster-inventory`**
```javascript
POST /api/update-poster-inventory
{
  "purchasedItems": [
    {
      "id": "item_id",
      "name": "Product Name",
      "quantity": 5.0,        // Original ordered
      "actualQuantity": 4.5,  // Actually delivered
      "unit": "кг"
    }
  ],
  "department": "bar" // or "kitchen"
}
```

### **Poster API Methods Used:**
1. **Primary**: `storage.writeOffIngredients` with negative quantity
2. **Fallback**: `storage.addInventoryTransaction` 
3. **Storage Mapping**: Kitchen = Storage ID 1, Bar = Storage ID 2

## 📱 User Experience

### **For Delivery Person:**
1. **Receive Order** → See ordered quantities
2. **Adjust Actuals** → Enter what was actually bought
3. **Mark Delivered** → Order saved as "delivered" locally
4. **Get Notification** → Instructions to update Poster manually

```
Example:
Заказано: 5 кг
Куплено: [4.5] кг  ← User enters actual amount
↓
"Заказ доставлен! Для обновления склада Poster: 
 Перейдите в 'Закупки' → 'Обновить склад Poster'"
```

### **For Admin (Procurement):**
1. **View Delivered Orders** → See all completed deliveries
2. **Click "📦 Обновить склад Poster"** → Batch update all delivered items
3. **Confirm Update** → Review items before sending to Poster
4. **Clean History** → Remove synced orders from local storage

## 🔧 Configuration

### **Poster Token**
Update in both files:
- `src/config/poster.js`
- `src/pages/api/update-poster-inventory.js`

```javascript
const token = 'YOUR_POSTER_TOKEN_HERE';
```

### **Storage IDs**
Current mapping:
- **Kitchen**: Storage ID 1
- **Bar**: Storage ID 2

## 🎯 Benefits

### **✅ Advantages:**
- **Manual control** - Update inventory when you're ready
- **Accurate quantities** - Uses actual delivered amounts
- **Flexible delivery** - Handle supplier substitutions
- **Complete tracking** - From order to inventory
- **Batch processing** - Update multiple orders at once
- **Error handling** - Can retry failed updates manually

### **📊 Data Flow:**
```
Order Created → Sent to Supplier → Delivered → Manual Poster Update
     ↓              ↓                ↓                ↓
  Local Storage → WhatsApp/Copy → Actual Qty → Admin Control → Poster
```

## 🚨 Error Handling

### **If Poster Update Fails:**
- ✅ **Delivery still confirmed** (delivery tracking works)
- ⚠️ **User notified** of Poster sync failure  
- 🔄 **Manual retry** available in procurement page
- 📝 **Detailed logging** for troubleshooting

### **Common Issues:**
1. **Invalid Poster Token** → Check configuration
2. **Wrong Storage ID** → Verify department mapping
3. **Item Not Found** → Check item IDs match Poster
4. **Network Issues** → Retry manually later

## 📈 Usage Analytics

### **Track in Console:**
- `✅ Order marked as delivered with actual quantities`
- `📦 Poster inventory updated successfully`
- `❌ Failed to update Poster inventory`

### **Confirmation Messages:**
- **Success**: `"📦 Poster обновлен: X товаров добавлено в склад"`
- **Error**: `"⚠️ Заказ доставлен, но не удалось обновить Poster"`

## 🔍 Testing

### **Test Workflow:**
1. **Create test order** in bar/kitchen
2. **Send via WhatsApp** (saves to delivery queue)
3. **Go to `/delivery`** and adjust quantities
4. **Mark as delivered** and check console
5. **Verify in Poster** that inventory increased

### **Debug Mode:**
Check browser console for detailed logs:
- Order creation
- Delivery confirmation  
- Poster API calls
- Success/error messages

## 🚀 Future Enhancements

### **Potential Additions:**
- **Toast notifications** instead of alerts
- **Inventory reports** showing sync history
- **Multi-supplier support** with different Poster accounts
- **Cost tracking** with price updates
- **Automatic reorder** when stock is low

This feature bridges the gap between your ordering system and Poster inventory management, creating a seamless supply chain workflow! 🎉