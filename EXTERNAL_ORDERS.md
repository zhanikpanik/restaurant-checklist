# 📥 External Orders Integration

## 🎯 Overview
Your restaurant system now supports **receiving orders from external sources** through a webhook API! This allows suppliers, delivery services, or other systems to send orders directly to your app.

## 🚀 How It Works

### **Webhook Endpoint**
```
POST https://your-domain.com/api/receive-external-order
```

### **Request Format**
```json
{
  "department": "kitchen",
  "items": [
    {
      "name": "Milk",
      "quantity": 5,
      "unit": "л"
    },
    {
      "name": "Bread",
      "quantity": 10,
      "unit": "шт"
    }
  ],
  "supplier": "External Supplier Name (optional)",
  "notes": "Any additional notes (optional)",
  "orderId": "EXT-123 (optional)"
}
```

### **Response Format**
```json
{
  "success": true,
  "message": "External order received for Кухня",
  "orderData": {
    "timestamp": "2025-01-10T15:00:00.000Z",
    "department": "kitchen",
    "departmentName": "Кухня",
    "items": [...],
    "status": "sent",
    "source": "external"
  },
  "autoSaveScript": "// JavaScript code to save order",
  "instructions": {
    "message": "Order received successfully!",
    "automatic": "To automatically save the order, execute the 'autoSaveScript' in browser console",
    "manual": [
      "Or manually check /delivery page",
      "Order will appear with 'External Supplier' label"
    ]
  }
}
```

## 📋 Usage Examples

### **Example 1: Kitchen Order**
```bash
curl -X POST https://your-domain.com/api/receive-external-order \
  -H "Content-Type: application/json" \
  -d '{
    "department": "kitchen",
    "items": [
      {"name": "Tomatoes", "quantity": 3, "unit": "кг"},
      {"name": "Onions", "quantity": 2, "unit": "кг"}
    ],
    "supplier": "Fresh Vegetables Co",
    "notes": "Urgent delivery needed"
  }'
```

### **Example 2: Bar Order**
```bash
curl -X POST https://your-domain.com/api/receive-external-order \
  -H "Content-Type: application/json" \
  -d '{
    "department": "bar",
    "items": [
      {"name": "Vodka", "quantity": 2, "unit": "л"},
      {"name": "Orange Juice", "quantity": 5, "unit": "л"}
    ],
    "supplier": "Beverage Distributor",
    "orderId": "BD-2025-001"
  }'
```

### **Example 3: JavaScript Integration**
```javascript
// For supplier websites or forms
async function sendOrderToRestaurant(orderData) {
  try {
    const response = await fetch('https://your-domain.com/api/receive-external-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Order sent successfully!');
      console.log('Save script:', result.autoSaveScript);
    } else {
      console.error('❌ Failed to send order:', result.error);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

// Usage
sendOrderToRestaurant({
  department: "kitchen",
  items: [
    {name: "Chicken", quantity: 5, unit: "кг"},
    {name: "Rice", quantity: 10, unit: "кг"}
  ],
  supplier: "My Supplier"
});
```

## 🔧 Integration Steps

### **For External Suppliers:**

1. **Create a form** on your website
2. **Collect order data** (department, items, quantities)
3. **Send POST request** to the webhook endpoint
4. **Handle the response** (success/error)

### **For Restaurant Staff:**

1. **External order arrives** via webhook
2. **Check /delivery page** to see new orders
3. **Orders appear** with "External Supplier" label
4. **Process normally** - mark as delivered, sync with Poster

## 📱 Order Visibility

### **Where Orders Appear:**
- ✅ **`/delivery` page** - All orders including external ones
- ✅ **`/restaurant/procurement` page** - After marked as delivered
- ✅ **Marked with source** - "External Supplier" label

### **Order Status Flow:**
```
External System → Webhook → Your App → Delivery Page → Delivered → Poster Sync
```

## ⚠️ Validation Rules

### **Required Fields:**
- `department` - Must be "kitchen" or "bar"
- `items` - Array with at least one item
- Each item must have: `name`, `quantity`, `unit`

### **Optional Fields:**
- `supplier` - Supplier name (defaults to "External Supplier")
- `notes` - Additional notes
- `orderId` - External order reference ID

### **Error Examples:**
```json
// Missing department
{
  "success": false,
  "error": "Invalid order data: department and items array are required"
}

// Invalid department
{
  "success": false,
  "error": "Invalid department: must be \"bar\" or \"kitchen\""
}

// Missing item fields
{
  "success": false,
  "error": "Each item must have name, quantity, and unit"
}
```

## 🔐 Security Notes

### **CORS Enabled:**
- Cross-origin requests are allowed
- Any website can send orders to your webhook

### **Future Security Enhancements:**
- Add API key authentication
- Rate limiting
- IP whitelisting
- Request signing/verification

## 🧪 Testing

### **Test with cURL:**
```bash
# Test successful order
curl -X POST http://localhost:4321/api/receive-external-order \
  -H "Content-Type: application/json" \
  -d '{
    "department": "kitchen",
    "items": [{"name": "Test Item", "quantity": 1, "unit": "шт"}]
  }'

# Test validation error
curl -X POST http://localhost:4321/api/receive-external-order \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'
```

### **Test Response:**
- ✅ Success: Status 200, success: true
- ❌ Error: Status 400, success: false, error message

## 🎉 Benefits

### **For Restaurant:**
- ✅ **Centralized orders** - All orders in one place
- ✅ **No manual entry** - Automatic order import
- ✅ **Same workflow** - Process like internal orders
- ✅ **Full tracking** - From receipt to Poster sync

### **For Suppliers:**
- ✅ **Easy integration** - Simple POST request
- ✅ **Real-time delivery** - Instant order submission
- ✅ **Standardized format** - Consistent data structure
- ✅ **Error handling** - Clear validation messages

## 🚀 Next Steps

1. **Deploy the webhook** to your production server
2. **Share the endpoint** with your suppliers
3. **Test with real orders** from external systems
4. **Monitor** the `/delivery` page for incoming orders

Your restaurant can now receive orders from anywhere! 🎉
