// Poster API Configuration
// Based on https://dev.joinposter.com/docs/v3/web/index

export const POSTER_CONFIG = {
    // API Base URL
    baseUrl: 'https://joinposter.com/api',
    
    // Access Token (get this from your Poster account)
    // IMPORTANT: Set POSTER_ACCESS_TOKEN in your .env file
    accessToken: process.env.POSTER_ACCESS_TOKEN || import.meta.env.POSTER_ACCESS_TOKEN,
    
    // API Endpoints for Bar Inventory Management
    // ✅ These are the VERIFIED working endpoints
    endpoints: {
        // Settings (✅ WORKING)
        getAllSettings: '/settings.getAllSettings',
        
        // Menu/Products (✅ WORKING)
        getProducts: '/menu.getProducts',
        getCategories: '/menu.getCategories',
        
        // Finance (✅ WORKING)
        getTransactions: '/finance.getTransactions',
        
        // Note: These endpoints were tested but don't exist in your Poster account:
        // - storage.getInventory (Code 30: Unknown API method)
        // - spots.getTables (Code 30: Unknown API method)
        // - dash.* methods (Code 30: Unknown API method)
        // - application.getInfo (Code 20: No access rights)
    },
    
    // Default headers
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

// Poster API Helper Functions
export class PosterAPI {
    constructor(accessToken = null) {
        this.accessToken = accessToken || POSTER_CONFIG.accessToken;
        this.baseUrl = POSTER_CONFIG.baseUrl;
    }
    
    // Set access token
    setAccessToken(token) {
        this.accessToken = token;
    }
    
    // Get authorization headers
    getHeaders() {
        return {
            ...POSTER_CONFIG.headers,
            'Authorization': this.accessToken ? `Bearer ${this.accessToken}` : ''
        };
    }
    
    // Generic API request
    async request(endpoint, params = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        // Add access token to params for Poster API
        const requestParams = {
            ...params,
            token: this.accessToken
        };
        
        const queryString = new URLSearchParams(requestParams).toString();
        const fullUrl = `${url}${queryString ? `?${queryString}` : ''}`;
        
        try {
            console.log('Making request to:', fullUrl);
            
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Response data:', data);
            
            // Check for Poster API error response
            if (data.error) {
                throw new Error(`Poster API Error (Code ${data.error.code}): ${data.error.message}`);
            }
            
            return data;
        } catch (error) {
            console.error('Poster API Request Failed:', error);
            
            // Better error message handling
            let errorMessage = 'Unknown error occurred';
            
            if (error.message) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else if (error && typeof error === 'object') {
                errorMessage = JSON.stringify(error);
            }
            
            throw new Error(`Poster API Error: ${errorMessage}`);
        }
    }
    
    // ✅ WORKING: Get all settings (account info)
    async getAllSettings() {
        return this.request(POSTER_CONFIG.endpoints.getAllSettings);
    }
    
    // ✅ WORKING: Get all products from menu
    async getProducts(params = {}) {
        return this.request(POSTER_CONFIG.endpoints.getProducts, params);
    }
    
    // ✅ WORKING: Get all categories
    async getCategories() {
        return this.request(POSTER_CONFIG.endpoints.getCategories);
    }
    
    // ✅ WORKING: Get financial transactions  
    async getTransactions(params = {}) {
        return this.request(POSTER_CONFIG.endpoints.getTransactions, params);
    }
    
    // Legacy methods (keep for compatibility but may not work)
    async getProduct(productId) {
        // This method structure might not exist, but keeping for reference
        return this.request(`/menu.getProduct`, { product_id: productId });
    }
    
    async getInventory(params = {}) {
        // Note: storage.getInventory doesn't exist in your Poster account
        // You might need to use getProducts for inventory data
        console.warn('getInventory: This method might not be available. Use getProducts instead.');
        return this.getProducts(params);
    }
    
    async updateInventory(productId, quantity) {
        // This method might not exist in your account
        console.warn('updateInventory: This method might not be available in your Poster account.');
        throw new Error('updateInventory method not available. Check Poster account permissions.');
    }
    
    async createPurchaseOrder(orderData) {
        // This method might not exist in your account  
        console.warn('createPurchaseOrder: This method might not be available in your Poster account.');
        throw new Error('createPurchaseOrder method not available. Check Poster account permissions.');
    }
    
    // Helper method to get account information
    async getAccount() {
        const settings = await this.getAllSettings();
        return {
            response: settings.response
        };
    }
    
    // ✅ Get storage leftovers (leftover ingredients in storage)
    async getStorageLeftovers(storageId) {
        return this.request('/storage.getStorageLeftovers', { storage_id: storageId });
    }
}

// Export default instance
export const posterAPI = new PosterAPI(); 