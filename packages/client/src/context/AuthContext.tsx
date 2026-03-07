import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { AuthUser } from '@ludi/shared';

const AUTH_TOKEN_KEY = 'ludi-auth-token';
const API_BASE = import.meta.env.VITE_SERVER_URL || '';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ error?: string }>;
  register: (username: string, password: string, displayName: string, email?: string) => Promise<{ error?: string }>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<{ error?: string; message?: string }>;
  resetPassword: (token: string, password: string) => Promise<{ error?: string; message?: string }>;
  updateUserEmail: (email: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY));
  const [loading, setLoading] = useState(!!localStorage.getItem(AUTH_TOKEN_KEY));

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        setUser(data.user);
      })
      .catch(() => {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback(async (username: string, password: string): Promise<{ error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Login failed' };

      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return {};
    } catch {
      return { error: 'Network error' };
    }
  }, []);

  const register = useCallback(async (username: string, password: string, displayName: string, email?: string): Promise<{ error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, displayName, email: email || undefined }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Registration failed' };

      localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return {};
    } catch {
      return { error: 'Network error' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const forgotPassword = useCallback(async (email: string): Promise<{ error?: string; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Request failed' };
      return { message: data.message };
    } catch {
      return { error: 'Network error' };
    }
  }, []);

  const resetPassword = useCallback(async (resetToken: string, password: string): Promise<{ error?: string; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Reset failed' };
      return { message: data.message };
    } catch {
      return { error: 'Network error' };
    }
  }, []);

  const updateUserEmail = useCallback(async (email: string): Promise<{ error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/update-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Update failed' };
      setUser(data.user);
      return {};
    } catch {
      return { error: 'Network error' };
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, forgotPassword, resetPassword, updateUserEmail }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
