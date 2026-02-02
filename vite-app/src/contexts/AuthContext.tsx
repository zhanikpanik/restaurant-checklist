import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '@/lib/api-client';

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'staff' | 'delivery';
  restaurant_id: string;
  restaurant_name?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await api.get<{ user: User | null }>('/api/auth/session');
      if (response.success && response.data?.user) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to refresh session:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await api.post<{ user: User }>('/api/auth/login', { email, password });
      if (response.success && response.data?.user) {
        setUser(response.data.user);
        return { success: true };
      }
      return { success: false, error: response.error || 'Ошибка входа' };
    } catch (error) {
      return { success: false, error: 'Ошибка подключения к серверу' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Compatibility hook for existing code that used NextAuth's useSession
export function useSession() {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  return {
    data: user ? { user } : null,
    status: isLoading ? 'loading' : isAuthenticated ? 'authenticated' : 'unauthenticated',
  };
}
