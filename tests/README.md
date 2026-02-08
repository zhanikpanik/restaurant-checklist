# 🧪 Restaurant App Autotester

A comprehensive automated testing suite for the Restaurant Checklist application.

## 🚀 Features

### 📋 Test Coverage
- **Page Load Tests**: Validates all main pages load correctly
- **API Endpoint Tests**: Tests all REST API endpoints
- **UI Interaction Tests**: Tests button clicks, form submissions, navigation
- **Database Operations**: Tests CRUD operations (when DB is connected)
- **Responsive Design**: Tests mobile/desktop layouts
- **Search Functionality**: Tests product search features

### 🎯 Pages Tested
- **Main Page** (`/`): Sections navigation
- **Kitchen Page** (`/kitchen`): Product list, add buttons, quantity controls
- **Bar Page** (`/bar`): Product list, add buttons, quantity controls  
- **Custom Page** (`/custom`): Custom products, add functionality
- **Manager Page** (`/manager`): All tabs, category management, supplier management

### 🔧 API Endpoints Tested
- `/api/departments` - Department management
- `/api/suppliers` - Supplier management
- `/api/get-categories` - Category retrieval
- `/api/kitchen-inventory` - Kitchen products
- `/api/bar-inventory` - Bar products
- `/api/orders-by-category` - Order management

## 📖 How to Use

### Option 1: Web Interface (Recommended)
1. Make sure your app is running on `http://localhost:4321`
2. Open `tests/index.html` in your browser
3. Click **"🚀 Run All Tests"** for comprehensive testing
4. Click **"⚡ Quick Test"** for essential tests only

### Option 2: Browser Console
1. Open your app in the browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Load the tester:
   ```javascript
   // Load the autotester script
   const script = document.createElement('script');
   script.src = '/tests/autotester.js';
   document.head.appendChild(script);
   
   // Run tests after loading
   script.onload = () => {
       runRestaurantTests();
   };
   ```

### Option 3: Direct JavaScript
```javascript
// Create and run tester
const tester = new RestaurantAppTester();
const report = await tester.runAllTests();
console.log(report);
```

## 📊 Test Results

The autotester provides detailed reports including:

- **Summary Statistics**: Total, passed, failed tests and success rate
- **Individual Test Results**: Each test with pass/fail status and details
- **Console Output**: Complete log of all test execution
- **Export Functionality**: Download reports as text files

### Example Output
```
🧪 RESTAURANT APP TEST REPORT
==================================================
📊 Total Tests: 25
✅ Passed: 23
❌ Failed: 2
📈 Success Rate: 92%
==================================================

❌ FAILED TESTS:
  • Database - Create test supplier: Cannot read properties of null (reading 'connect')
  • API Test - Orders by category: HTTP 500: Internal Server Error

✅ PASSED TESTS:
  • Page Load - Main sections page: Page loaded successfully
  • Page Load - Kitchen page: Page loaded successfully
  • Kitchen Page - Add button functionality: Add button correctly switches to quantity controls
  ...
```

## 🔧 Configuration

### Base URL
The autotester defaults to `http://localhost:4321`. To change this:

```javascript
const tester = new RestaurantAppTester();
tester.baseUrl = 'https://your-app-url.com';
```

### Custom Tests
Add your own tests by extending the `RestaurantAppTester` class:

```javascript
class CustomTester extends RestaurantAppTester {
    async testMyFeature() {
        this.startTest('My Custom Feature');
        try {
            // Your test logic here
            this.passTest('Feature works correctly');
        } catch (error) {
            this.failTest(error);
        }
    }
    
    async runAllTests() {
        await super.runAllTests();
        await this.testMyFeature();
    }
}
```

## 🐛 Troubleshooting

### Common Issues

**Database Connection Errors**
- Tests will still pass if database is not connected
- API endpoints return graceful error responses
- This is expected for local development

**Page Load Timeouts**
- Increase timeout values in the tester configuration
- Ensure your development server is running
- Check browser console for JavaScript errors

**Element Not Found Errors**
- UI tests depend on specific element IDs and classes
- If you've modified the HTML structure, update the test selectors

### Debug Mode
Enable detailed logging:
```javascript
const tester = new RestaurantAppTester();
tester.debugMode = true; // Add this property for extra logging
```

## 🚦 Test Categories

### 🟢 Critical Tests (Must Pass)
- Page loads without errors
- Basic navigation works
- Add button functionality
- API endpoints respond

### 🟡 Important Tests (Should Pass)
- Database operations
- Search functionality  
- Responsive design
- Tab navigation

### 🔵 Optional Tests (Nice to Pass)
- Performance tests
- Advanced UI interactions
- Edge cases

## 📈 Continuous Integration

To integrate with CI/CD pipelines, run the autotester in headless mode:

```bash
# Using Puppeteer or similar
node ci-test-runner.js
```

## 🤝 Contributing

To add new tests:
1. Add test methods to `RestaurantAppTester` class
2. Follow the naming convention: `test[FeatureName]()`
3. Use `this.startTest()`, `this.passTest()`, and `this.failTest()`
4. Update this README with new test descriptions

## 📄 License

Part of the Restaurant Checklist application.
