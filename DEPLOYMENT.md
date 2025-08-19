# 🚀 Restaurant Checklist - Deployment Guide

## 📋 Overview
This is a production-ready restaurant inventory management system with Poster POS integration, WhatsApp ordering, and real-time inventory tracking.

## 🎯 Features
- ✅ **Dual Department Management**: Separate Bar and Kitchen inventories
- ✅ **Real-time Poster POS Integration**: Live inventory data
- ✅ **Smart Search**: Find products quickly while creating orders
- ✅ **WhatsApp Integration**: Send shopping lists directly to suppliers
- ✅ **Mobile-Friendly**: Responsive design for phones and tablets
- ✅ **Low Stock Alerts**: Visual warnings for items running low

## 🔧 Requirements

### System Requirements
- **Node.js**: 18.0.0 or higher
- **RAM**: Minimum 512MB (recommended 1GB)
- **Storage**: ~50MB for application files

### Environment Setup
1. **Poster POS Token**: Get from your Poster account settings
2. **WhatsApp Buyer Phone**: Update phone number in code

## 🛠️ Installation & Deployment

### Option 1: Production Server (Recommended)

```bash
# 1. Clone and setup
git clone <your-repo-url>
cd restaurant-checklist

# 2. Install dependencies
npm install

# 3. Build for production
npm run build

# 4. Start production server
npm start
```

**Server will run on**: http://localhost:3000

### Option 2: Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t restaurant-checklist .
docker run -p 3000:3000 restaurant-checklist
```

### Option 3: Cloud Platforms

#### Vercel (Easiest)
```bash
npm install -g vercel
vercel
```

#### Netlify
```bash
# Build command: npm run build
# Publish directory: dist
```

#### Railway/Render
- Connect your GitHub repository
- Set build command: `npm run build`
- Set start command: `npm start`

## 🔑 Configuration

### 1. Poster POS Token
Update your token in: `src/config/poster.js`

```javascript
export const posterConfig = {
    accessToken: 'YOUR_POSTER_TOKEN_HERE', // Update this!
    baseUrl: 'https://joinposter.com/api'
};
```

### 2. WhatsApp Buyer Phone
Update in: `public/scripts/checklist.js`

```javascript
// Line ~397
const buyerPhone = "996708083303"; // Update with your buyer's phone
```

### 3. Storage IDs (Auto-configured)
- **Kitchen**: Storage ID 1
- **Bar**: Storage ID 2

*Note: These are automatically detected from your Poster account*

## 📱 Usage

### For Restaurant Staff
1. **View Inventory**: Open app → see current stock levels
2. **Create Order**: Click floating "Создать заказ" button
3. **Search Products**: Use search bar to find items quickly
4. **Set Quantities**: Adjust quantities with +/- or direct input
5. **Send to WhatsApp**: Click WhatsApp button → opens with pre-filled list

### Department Access
- **Bar Inventory**: `https://your-domain.com/`
- **Kitchen Inventory**: `https://your-domain.com/restaurant/kitchen`


## 🔍 Health Check
Visit: `https://your-domain.com/api/test-poster-connection`

Should return:
```json
{
  "success": true,
  "message": "Connected to Poster successfully"
}
```

## 📊 API Endpoints

### Production Endpoints
- `GET /api/get-bar-inventory` - Bar products from Poster storage
- `GET /api/get-kitchen-inventory` - Kitchen products from Poster storage  
- `POST /api/update-poster-inventory` - Update inventory after purchases
- `GET /api/test-poster-connection` - Health check

### Data Flow
1. **App loads** → Fetches real inventory from Poster POS
2. **User creates order** → Adds items to shopping list
3. **WhatsApp integration** → Sends formatted list to buyer
4. **After purchase** → Updates Poster inventory (optional)

## 🛡️ Security

### Production Considerations
- **HTTPS Required**: Use SSL certificate in production
- **Token Security**: Keep Poster token secure, never expose in client
- **Rate Limiting**: Consider implementing API rate limits
- **Backup**: Regular database/config backups

### Environment Variables (Optional)
```bash
# .env (if you want to use env vars instead of hardcoded)
POSTER_ACCESS_TOKEN=your_token_here
BUYER_PHONE=996557957457
NODE_ENV=production
```

## 🐛 Troubleshooting

### Common Issues

#### "0 items loaded" Error
- ✅ Check Poster token validity
- ✅ Verify storage IDs (Kitchen=1, Bar=2)
- ✅ Ensure Poster account has inventory data

#### WhatsApp Not Opening
- ✅ Check phone number format (no + sign)
- ✅ Test on different devices (mobile vs desktop)
- ✅ Verify WhatsApp is installed

#### Build Errors
```bash
# Clear cache and rebuild
rm -rf node_modules .astro dist
npm install
npm run build
```

### Debug Mode
Enable console logging in browser DevTools:
- Press F12 → Console tab
- Look for messages starting with ✅, ❌, 🔄

## 📈 Performance

### Optimization
- **Static Generation**: App pre-builds for fast loading
- **Minimal Dependencies**: Only essential packages included
- **Mobile-First**: Optimized for restaurant staff mobile usage
- **Efficient API**: Direct Poster integration, no unnecessary calls

### Scaling
- **Multi-location**: Easy to duplicate for multiple restaurants
- **Department Expansion**: Add more storage locations in Poster
- **Integration**: Can integrate with other POS systems

## 📞 Support

### Getting Help
1. **Check Logs**: Browser console for frontend, server logs for backend
2. **Test Connection**: Use health check endpoint
3. **Poster Documentation**: https://docs.joinposter.com/
4. **WhatsApp API**: https://faq.whatsapp.com/general/chats/how-to-use-click-to-chat

---

## 🎉 Ready for Production!

Your restaurant inventory system is now clean, optimized, and ready for deployment. The app includes:

- ✅ **Clean codebase** - All debug/test files removed
- ✅ **Production scripts** - Optimized build and start commands  
- ✅ **Mobile-ready** - Works perfectly on phones and tablets
- ✅ **Consistent UI** - Bar and Kitchen pages look identical
- ✅ **Real integration** - Connected to live Poster data
- ✅ **WhatsApp ready** - Mobile and desktop compatible

**Deploy with confidence!** 🚀 