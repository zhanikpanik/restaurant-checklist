# Poster API Setup Guide

## 🚀 Quick Start

### 1. Get Your Poster Access Token

1. Go to your [Poster account](https://joinposter.com/)
2. Sign in with your Poster account
3. Navigate to **Settings** → **API**
4. Generate or copy your **Access Token**

### 2. Configure Environment Variables

Create a `.env` file in the project root (`restaurant-checklist/.env`):

```env
POSTER_ACCESS_TOKEN=your_access_token_here
```

### 3. Test Your Setup

1. Start the development server: `npm run dev`
2. Go to: `http://localhost:4322/test-poster`
3. Click "Test Poster Connection" to verify your setup

## 🔧 API Endpoints We'll Use

Based on the [Poster Web API Documentation](https://dev.joinposter.com/docs/v3/web/index):

### Menu/Products
- `GET /menu.getProducts` - Get all products
- `GET /menu.getProduct` - Get specific product
- `GET /menu.getCategories` - Get product categories

### Inventory/Stock
- `GET /dash.getInventory` - Get inventory levels
- `POST /dash.updateInventory` - Update product quantity

### Dashboard
- `GET /dash.getAccount` - Get account information
- `GET /dash.getPurchaseOrders` - Get purchase orders
- `POST /dash.createPurchaseOrder` - Create purchase order

### Transactions
- `GET /dash.getTransactions` - Get transactions

## 🔐 Authentication Method

Poster uses **Access Token Authentication**:
1. **Get Access Token**: From your Poster account settings
2. **Include in Requests**: Add `token=your_access_token` as a query parameter
3. **No OAuth Flow**: Direct API access with your token

## 📋 What We'll Integrate

### Current Features (Mock Data)
- ✅ Display product inventory
- ✅ Shopping list creation
- ✅ Quantity management

### Planned Poster Integration
- 🔄 Fetch real products from Poster (`/menu.getProducts`)
- 🔄 Get inventory levels (`/dash.getInventory`)
- 🔄 Update inventory in Poster (`/dash.updateInventory`)
- 🔄 Create purchase orders in Poster (`/dash.createPurchaseOrder`)
- 🔄 Sync categories (`/menu.getCategories`)

## 🧪 Testing Your Setup

Visit `http://localhost:4322/test-poster` to:

1. **Check Configuration**: Verify your access token is loaded
2. **Test Connection**: Ensure Poster API is accessible
3. **Test API Calls**: Fetch real data from your Poster account
4. **Test Products**: Get your actual product list
5. **Test Inventory**: Get current inventory levels
6. **Test Categories**: Get product categories

## 🆘 Troubleshooting

### Common Issues:

1. **"Access Token Missing"**
   - Check your `.env` file exists
   - Verify `POSTER_ACCESS_TOKEN` is set correctly
   - Restart the development server after adding the token

2. **"API Connection Failed"**
   - Check your internet connection
   - Verify Poster API is accessible
   - Check if your access token is valid

3. **"Authentication Error"**
   - Verify your access token is correct
   - Check if token has expired
   - Generate a new token if needed

### How to Get Your Access Token:

1. **Login to Poster**: Go to [joinposter.com](https://joinposter.com/)
2. **Go to Settings**: Click on your account settings
3. **Find API Section**: Look for "API" or "Developer" settings
4. **Generate Token**: Create a new access token
5. **Copy Token**: Copy the generated token to your `.env` file

### Need Help?
- [Poster Web API Documentation](https://dev.joinposter.com/docs/v3/web/index)
- [Poster Support](https://joinposter.com/support)

## 📝 Example API Calls

Once configured, you can test these endpoints:

```javascript
// Get all products
GET https://joinposter.com/api/menu.getProducts?token=YOUR_TOKEN

// Get inventory
GET https://joinposter.com/api/dash.getInventory?token=YOUR_TOKEN

// Get categories
GET https://joinposter.com/api/menu.getCategories?token=YOUR_TOKEN

// Get account info
GET https://joinposter.com/api/dash.getAccount?token=YOUR_TOKEN
``` 