# Бар - Инвентарь (Bar Inventory)

A modern, responsive web application for managing bar inventory and creating purchase orders. Built with Astro and Tailwind CSS, designed to integrate with the Poster POS system.

## Features

### Current Features (with Mock Data)
- 🍹 **Bar Products**: Complete inventory of bar items including juices, coffee, tea, syrups, and more
- ➕➖ **Quantity Controls**: Plus/minus buttons for easy inventory adjustment
- 📊 **Real-time Updates**: Instant quantity updates with visual feedback
- 🛒 **Purchase Orders**: Generate purchase orders for low stock items
- 🎨 **Clean Design**: Minimalist, mobile-first interface matching your design
- 📱 **Mobile Friendly**: Optimized for mobile devices and tablets

### Product Categories
- **Juices**: Rich Orange and Apple juices
- **Hot Beverages**: Coffee, Black Tea, Green Tea
- **Dairy**: Milk, Cocoa
- **Ingredients**: Lemon, Sugar
- **Syrups**: Vanilla and Caramel syrups

## Technology Stack

- **Frontend**: Astro + Tailwind CSS
- **Styling**: Tailwind CSS v4
- **JavaScript**: Vanilla JS (no framework dependencies)
- **Backend Integration**: Poster API (ready for implementation)
- **Data Storage**: localStorage (temporary, will be replaced with Poster API)

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Poster API credentials (for full integration)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd restaurant-checklist
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:4322`

## Poster API Integration

This application is designed to integrate with the [Poster POS system API](https://dev.joinposter.com/docs/v3/start/index). The integration includes:

### Authentication
- OAuth 2.0 flow with Poster
- Secure token management
- Automatic token refresh

### API Endpoints Used
- `GET /products` - Fetch bar products from Poster
- `POST /inventory/update` - Update product quantities
- `POST /purchase-orders` - Create purchase orders
- `GET /categories` - Fetch product categories
- `GET /reports/inventory` - Generate inventory reports

### Environment Variables
Create a `.env` file in the root directory:

```env
POSTER_CLIENT_ID=your_client_id
POSTER_CLIENT_SECRET=your_client_secret
POSTER_REDIRECT_URI=http://localhost:4322/auth/callback
```

### Setup Poster API Integration

1. **Register your application** with Poster:
   - Go to [Poster Developer Portal](https://dev.joinposter.com/)
   - Create a new application
   - Get your Client ID and Client Secret

2. **Configure OAuth**:
   - Set redirect URI to `http://localhost:4322/auth/callback`
   - Request permissions for: `inventory`, `products`, `orders`

3. **Enable API integration**:
   - Uncomment the Poster API calls in `public/scripts/checklist.js`
   - Set up environment variables
   - Test the OAuth flow

## Project Structure

```
restaurant-checklist/
├── src/
│   ├── layouts/
│   │   └── Layout.astro          # Base layout component
│   ├── pages/
│   │   └── index.astro           # Main bar inventory page
│   ├── config/
│   │   └── poster.js             # Poster API configuration
│   └── styles/                   # Global styles
├── public/
│   └── scripts/
│       └── checklist.js          # Main application logic
├── package.json
└── README.md
```

## Usage

### Managing Inventory
1. **View Products**: All bar products are displayed with current quantities
2. **Adjust Quantities**: Use + and - buttons to update inventory levels
3. **Real-time Updates**: Changes are reflected immediately in the interface

### Creating Purchase Orders
1. **Check Stock Levels**: Products with low stock are automatically detected
2. **Generate Order**: Click "Написать закуп" to create a purchase order
3. **Review Order**: The system generates a list of items that need restocking

### Poster Integration Features
- **Automatic Sync**: Inventory changes sync with Poster in real-time
- **Purchase Orders**: Orders are created directly in Poster system
- **Reports**: Generate inventory reports and analytics
- **Multi-location**: Support for multiple bar locations

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Adding New Products

To add new bar products, edit the `barProducts` array in `src/pages/index.astro`:

```javascript
{
  id: 12,
  name: "Новый продукт",
  quantity: 0,
  unit: "л",
  minQuantity: 5,
  checked: false
}
```

### API Development

The Poster API integration is ready for development:

1. **Test API calls** using the `PosterAPI` class in `src/config/poster.js`
2. **Implement OAuth flow** using the `PosterOAuth` class
3. **Add error handling** for API failures
4. **Implement caching** for better performance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with Poster API
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions about Poster API integration, please refer to:
- [Poster API Documentation](https://dev.joinposter.com/docs/v3/start/index)
- [Poster Developer Portal](https://dev.joinposter.com/)
- [Poster Support](https://joinposter.com/support)
