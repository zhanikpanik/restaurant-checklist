"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";

interface CSRFContextValue {
  csrfToken: string | null;
  isLoading: boolean;
  error: string | null;
  refreshToken: () => Promise<void>;
  fetchWithCSRF: (url: string, options?: RequestInit) => Promise<Response>;
}

const CSRFContext = createContext<CSRFContextValue | null>(null);

export function CSRFProvider({ children }: { children: ReactNode }) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCSRFToken = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch("/api/csrf", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch CSRF token");
      }

      const data = await response.json();
      
      if (data.success && data.data?.csrfToken) {
        setCsrfToken(data.data.csrfToken);
      } else {
        throw new Error(data.error || "Invalid CSRF response");
      }
    } catch (err) {
      console.error("CSRF token fetch error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch token on mount
  useEffect(() => {
    fetchCSRFToken();
  }, [fetchCSRFToken]);

  // Refresh token periodically (every 50 minutes, before 1 hour expiry)
  useEffect(() => {
    const interval = setInterval(fetchCSRFToken, 50 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchCSRFToken]);

  // Helper function to make fetch requests with CSRF token
  const fetchWithCSRF = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(options.headers);
      
      if (csrfToken) {
        headers.set("X-CSRF-Token", csrfToken);
      }

      return fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });
    },
    [csrfToken]
  );

  return (
    <CSRFContext.Provider
      value={{
        csrfToken,
        isLoading,
        error,
        refreshToken: fetchCSRFToken,
        fetchWithCSRF,
      }}
    >
      {children}
    </CSRFContext.Provider>
  );
}

export function useCSRF() {
  const context = useContext(CSRFContext);
  
  if (!context) {
    throw new Error("useCSRF must be used within a CSRFProvider");
  }
  
  return context;
}

/**
 * Simple hook to get just the fetch function with CSRF
 * Use this in components that just need to make API calls
 */
export function useSecureFetch() {
  const { fetchWithCSRF, csrfToken, isLoading } = useCSRF();
  
  return {
    fetch: fetchWithCSRF,
    isReady: !isLoading && !!csrfToken,
  };
}
