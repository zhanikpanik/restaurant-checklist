"use client";

/**
 * Secure API client that automatically includes CSRF tokens
 * 
 * Usage:
 *   import { api } from "@/lib/api-client";
 *   
 *   // GET request (no CSRF needed)
 *   const data = await api.get("/api/sections");
 *   
 *   // POST request (CSRF token automatically included)
 *   const result = await api.post("/api/orders", { items: [...] });
 */

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiClient {
  private csrfToken: string | null = null;
  private csrfPromise: Promise<string> | null = null;

  /**
   * Get CSRF token, fetching if necessary
   */
  private async getCSRFToken(): Promise<string> {
    if (this.csrfToken) {
      return this.csrfToken;
    }

    // If already fetching, wait for that promise
    if (this.csrfPromise) {
      return this.csrfPromise;
    }

    // Fetch new token
    this.csrfPromise = this.fetchCSRFToken();
    
    try {
      this.csrfToken = await this.csrfPromise;
      return this.csrfToken;
    } finally {
      this.csrfPromise = null;
    }
  }

  private async fetchCSRFToken(): Promise<string> {
    const response = await fetch("/api/csrf", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch CSRF token");
    }

    const data = await response.json();
    
    if (!data.success || !data.data?.csrfToken) {
      throw new Error("Invalid CSRF response");
    }

    return data.data.csrfToken;
  }

  /**
   * Clear cached CSRF token (call after logout or on 403 CSRF errors)
   */
  clearToken(): void {
    this.csrfToken = null;
  }

  /**
   * Refresh CSRF token
   */
  async refreshToken(): Promise<void> {
    this.csrfToken = null;
    await this.getCSRFToken();
  }

  /**
   * Make an API request with automatic CSRF handling
   */
  async request<T = unknown>(
    url: string,
    method: RequestMethod,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // Add CSRF token for mutating requests
    if (method !== "GET") {
      try {
        const token = await this.getCSRFToken();
        headers["X-CSRF-Token"] = token;
      } catch (error) {
        console.error("Failed to get CSRF token:", error);
        return { success: false, error: "Failed to get CSRF token" };
      }
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        credentials: "include",
        body: body ? JSON.stringify(body) : undefined,
      });

      // Check if response is JSON before parsing
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        // Likely an HTML redirect (auth redirect) or server error page
        if (response.status === 401 || response.status === 403) {
          return { success: false, error: "Сессия истекла. Пожалуйста, войдите снова." };
        }
        return { success: false, error: "Ошибка сервера. Попробуйте обновить страницу." };
      }

      const data = await response.json();

      // If CSRF error, refresh token and retry once
      if (response.status === 403 && data.error?.includes("CSRF")) {
        this.csrfToken = null;
        const newToken = await this.getCSRFToken();
        headers["X-CSRF-Token"] = newToken;

        const retryResponse = await fetch(url, {
          method,
          headers,
          credentials: "include",
          body: body ? JSON.stringify(body) : undefined,
        });

        const retryContentType = retryResponse.headers.get("content-type");
        if (!retryContentType || !retryContentType.includes("application/json")) {
          return { success: false, error: "Ошибка сервера после повторной попытки" };
        }

        return await retryResponse.json();
      }

      return data;
    } catch (error) {
      console.error("API request failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Request failed",
      };
    }
  }

  // Convenience methods
  async get<T = unknown>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>(url, "GET");
  }

  async post<T = unknown>(url: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(url, "POST", body);
  }

  async put<T = unknown>(url: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(url, "PUT", body);
  }

  async patch<T = unknown>(url: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(url, "PATCH", body);
  }

  async delete<T = unknown>(url: string): Promise<ApiResponse<T>> {
    return this.request<T>(url, "DELETE");
  }
}

// Export singleton instance
export const api = new ApiClient();

// Export class for testing or custom instances
export { ApiClient };
