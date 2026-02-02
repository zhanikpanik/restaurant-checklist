/**
 * API client for making requests to the Express backend
 * 
 * Usage:
 *   import { api } from "@/lib/api-client";
 *   
 *   // GET request
 *   const data = await api.get("/api/sections");
 *   
 *   // POST request
 *   const result = await api.post("/api/orders", { items: [...] });
 */

type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  /**
   * Make an API request
   */
  async request<T = unknown>(
    url: string,
    method: RequestMethod,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

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
export type { ApiResponse };
