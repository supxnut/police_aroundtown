import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  loginWithDiscordId: (discordId: string) => Promise<{ success: boolean; isAdmin?: boolean; message?: string }>;
  devLogin: (discordId: string) => Promise<{ success: boolean; isAdmin?: boolean; message?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const res = await api.get('/auth/me');
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
        setIsAdmin(res.data.user.isAdmin);
      } else {
        localStorage.removeItem('auth_token');
        setUser(null);
        setIsAdmin(false);
      }
    } catch {
      localStorage.removeItem('auth_token');
      setUser(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const loginWithDiscordId = async (discordId: string) => {
    try {
      const res = await api.post('/auth/discord/callback', { discord_id: discordId });
      if (res.data.success) {
        if (res.data.token) {
          localStorage.setItem('auth_token', res.data.token);
        }
        setUser(res.data.user);
        setIsAdmin(res.data.isAdmin);
        return { success: true, isAdmin: res.data.isAdmin };
      }
      return { success: false, message: res.data.message };
    } catch (err: any) {
      const msg = err.response?.data?.message || 'You do not have permission to access this system.';
      return { success: false, message: msg };
    }
  };

  const devLogin = async (discordId: string) => {
    try {
      const res = await api.post('/auth/dev-login', { discord_id: discordId });
      if (res.data.success) {
        if (res.data.token) {
          localStorage.setItem('auth_token', res.data.token);
        }
        setUser(res.data.user);
        setIsAdmin(res.data.isAdmin);
        return { success: true, isAdmin: res.data.isAdmin };
      }
      return { success: false, message: res.data.message };
    } catch (err: any) {
      const msg = err.response?.data?.message || 'You do not have permission to access this system.';
      return { success: false, message: msg };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
      setIsAdmin(false);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        loading,
        loginWithDiscordId,
        devLogin,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
