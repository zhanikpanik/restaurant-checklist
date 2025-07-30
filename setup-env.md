# Environment Setup Instructions

## 🚨 **Immediate Fix Needed**

Your `.env` file is not being loaded by Astro. Here's how to fix it:

### **Step 1: Create the .env file**

In your `restaurant-checklist` folder, create a file called `.env` (with the dot) containing:

```env
POSTER_ACCESS_TOKEN=your_actual_access_token_here
```

**Important:** Replace `your_actual_access_token_here` with your real Poster access token.

### **Step 2: Verify the file location**

The `.env` file should be in the same directory as:
- `package.json`
- `astro.config.mjs` 
- `src/` folder

### **Step 3: Restart the development server**

After creating the `.env` file:

```powershell
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### **Step 4: Test again**

1. Go to `http://localhost:4322/test-poster`
2. Click "🐛 Debug Environment & Connection"
3. You should now see:
   ```json
   "environment": {
     "hasToken": true,
     "tokenLength": [your_token_length],
     "tokenPreview": "[first_8_chars]...",
   }
   ```

## 🔧 **File Structure Should Look Like:**

```
restaurant-checklist/
├── .env                 ← CREATE THIS FILE
├── package.json
├── astro.config.mjs
├── src/
└── ...
```

## 📝 **Example .env File Content:**

```env
# Paste your actual Poster access token here
POSTER_ACCESS_TOKEN=abcd1234efgh5678ijkl9012mnop3456
```

**Note:** Your token will be longer and contain different characters.

## 🧪 **How to Get Your Poster Access Token:**

1. Go to [joinposter.com](https://joinposter.com/)
2. Login to your account
3. Go to **Settings** → **API** 
4. Copy your **Access Token**
5. Paste it in the `.env` file

Once you've created the `.env` file and restarted the server, the debug should show that your token is loaded! 