// Poster API types
export interface PosterToken {
  access_token: string;
  refresh_token?: string;
  expires_at?: Date;
}

export interface PosterStorage {
  storage_id: string;
  storage_name: string;
}

export interface PosterIngredient {
  ingredient_id: string;
  ingredient_name: string;
  ingredient_unit: string;
}

export interface PosterSupplier {
  supplier_id: string;
  supplier_name: string;
}

interface PosterConfig {
  baseUrl: string;
  accessToken?: string;
  endpoints: Record<string, string>;
  headers: Record<string, string>;
}

interface PosterApiError {
  code: number;
  message: string;
}

interface PosterApiResponse<T = any> {
  response?: T;
  error?: PosterApiError | number;
  message?: string;
}

// Poster API Configuration
export const POSTER_CONFIG: PosterConfig = {
  // API Base URL
  baseUrl: 'https://joinposter.com/api',

  // Access Token from environment
  accessToken: process.env.POSTER_ACCESS_TOKEN,

  // API Endpoints
  endpoints: {
    // Settings
    getAllSettings: '/settings.getAllSettings',

    // Menu/Products
    getProducts: '/menu.getProducts',
    getCategories: '/menu.getCategories',
    getIngredients: '/menu.getIngredients',

    // Storage
    getStorages: '/storage.getStorages',
    getStorageLeftovers: '/storage.getStorageLeftovers',

    // Suppliers
    getSuppliers: '/storage.getSuppliers',
    createSupplyOrder: '/storage.createSupply',

    // Finance
    getTransactions: '/finance.getTransactions',
  },

  // Default headers
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// Poster API Client Class
export class PosterAPI {
  private accessToken: string | undefined;
  private baseUrl: string;

  constructor(accessToken?: string) {
    this.accessToken = accessToken || POSTER_CONFIG.accessToken;
    this.baseUrl = POSTER_CONFIG.baseUrl;
  }

  // Set access token
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  // Get headers
  getHeaders(): Record<string, string> {
    return {
      ...POSTER_CONFIG.headers,
      'Authorization': this.accessToken ? `Bearer ${this.accessToken}` : ''
    };
  }

  // Generic API request
  async request<T = any>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    // Add access token to params for Poster API
    const requestParams: Record<string, string> = {
      ...Object.fromEntries(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ),
      ...(this.accessToken ? { token: this.accessToken } : {})
    };

    const queryString = new URLSearchParams(requestParams).toString();
    const fullUrl = `${url}${queryString ? `?${queryString}` : ''}`;

    try {
      console.log('Making request to:', fullUrl.replace(this.accessToken || '', '***'));

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

      const data: PosterApiResponse<T> = await response.json();

      // Check for Poster API error response
      if (data.error) {
        const code = typeof data.error === 'object' ? data.error.code : data.error;
        const message = typeof data.error === 'object' ? data.error.message : data.message;
        throw new Error(`Poster API Error (Code ${code}): ${message}`);
      }

      return data.response as T;
    } catch (error) {
      console.error('Poster API Request Failed:', error);

      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      throw new Error(`Poster API Error: ${errorMessage}`);
    }
  }

  // Post request for write operations
  async postRequest<T = any>(endpoint: string, data: Record<string, any> = {}): Promise<T> {
    // Add token to URL query string
    const queryParams = new URLSearchParams();
    if (this.accessToken) {
      queryParams.append('token', this.accessToken);
    }
    const queryString = queryParams.toString();
    const url = `${this.baseUrl}${endpoint}${queryString ? `?${queryString}` : ''}`;

    console.log("Poster POST request (JSON):", { url, data });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      console.log(`Poster Response Headers:`, Object.fromEntries(response.headers.entries()));
      console.log(`Poster Response Status: ${response.status} ${response.statusText} (Redirected: ${response.redirected})`);

      const text = await response.text();
      console.log(`Poster raw response (${text.length} chars):`, text);

      if (!text) {
         console.warn(`Poster returned ${response.status} with empty body`);
         return { empty: true, status: response.status, headers: Object.fromEntries(response.headers.entries()) } as unknown as T;
      }

      let result: PosterApiResponse<T>;
      try {
        result = JSON.parse(text);
      } catch (e) {
        throw new Error(`Failed to parse Poster response: ${text.substring(0, 100)}...`);
      }

      if (result.error) {
        const code = typeof result.error === 'object' ? result.error.code : result.error;
        const message = typeof result.error === 'object' ? result.error.message : result.message;
        throw new Error(`Poster API Error (Code ${code}): ${message}`);
      }

      return result.response as T;
    } catch (error) {
      console.error('Poster API POST Request Failed:', error);
      throw error;
    }
  }

  // Get all settings (account info)
  async getAllSettings(): Promise<any> {
    return this.request(POSTER_CONFIG.endpoints.getAllSettings);
  }

  // Get all products from menu
  async getProducts(params: Record<string, any> = {}): Promise<any> {
    return this.request(POSTER_CONFIG.endpoints.getProducts, params);
  }

  // Get all categories
  async getCategories(): Promise<any> {
    return this.request(POSTER_CONFIG.endpoints.getCategories);
  }

  // Get storages
  async getStorages(): Promise<PosterStorage[]> {
    return this.request(POSTER_CONFIG.endpoints.getStorages);
  }

  // Get storage leftovers
  async getStorageLeftovers(storageId: number): Promise<any> {
    return this.request(POSTER_CONFIG.endpoints.getStorageLeftovers, { storage_id: storageId });
  }

  // Get ingredients
  async getIngredients(storageId?: number): Promise<PosterIngredient[]> {
    const params = storageId ? { storage_id: storageId } : {};
    return this.request(POSTER_CONFIG.endpoints.getIngredients, params);
  }

  // Get suppliers
  async getSuppliers(): Promise<PosterSupplier[]> {
    return this.request(POSTER_CONFIG.endpoints.getSuppliers);
  }

  // Create supply order
  async createSupplyOrder(orderData: {
    supplier_id: number;
    storage_id: number;
    ingredients: Array<{
      ingredient_id: string;
      quantity: number;
      price?: number;
    }>;
    comment?: string;
    date?: string; // Allow passing date explicitly
  }): Promise<any> {
    const now = new Date();
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0')
    ].join('-');

    const payload: Record<string, any> = {
      supplier_id: Number(orderData.supplier_id),
      storage_id: Number(orderData.storage_id),
      date: orderData.date || today,
      supply: orderData.ingredients.map(ing => ({
        product_id: Number(ing.ingredient_id),
        count: Number(ing.quantity),
        price: Number(ing.price || 0)
      }))
    };
    
    if (orderData.comment) {
      payload.comment = orderData.comment;
    }
    
    console.log("createSupplyOrder payload:", JSON.stringify(payload, null, 2));
    
    return this.postRequest(POSTER_CONFIG.endpoints.createSupplyOrder, payload);
  }

  // Get financial transactions
  async getTransactions(params: Record<string, any> = {}): Promise<any> {
    return this.request(POSTER_CONFIG.endpoints.getTransactions, params);
  }

  // Helper method to get account information
  async getAccount(): Promise<any> {
    const settings = await this.getAllSettings();
    return settings;
  }
}

// Export default instance
export const posterAPI = new PosterAPI();

// OAuth helper functions
export function getPosterOAuthUrl(restaurantId: string): string {
  const appId = process.env.POSTER_APP_ID;
  const redirectUri = process.env.POSTER_REDIRECT_URI;

  if (!appId || !redirectUri) {
    throw new Error('Poster OAuth configuration missing');
  }

  const params = new URLSearchParams({
    application_id: appId,
    redirect_uri: redirectUri,
    state: restaurantId,
    response_type: 'code'
  });

  return `https://joinposter.com/api/v2/auth?${params.toString()}`;
}

export async function exchangePosterCode(code: string): Promise<PosterToken> {
  const appId = process.env.POSTER_APP_ID;
  const appSecret = process.env.POSTER_APP_SECRET;
  const redirectUri = process.env.POSTER_REDIRECT_URI;

  if (!appId || !appSecret || !redirectUri) {
    throw new Error('Poster OAuth configuration missing');
  }

  const response = await fetch('https://joinposter.com/api/v2/auth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      application_id: appId,
      application_secret: appSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    }).toString()
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange code: ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`OAuth Error: ${data.error_description || data.error}`);
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(Date.now() + (data.expires_in * 1000))
  };
}
