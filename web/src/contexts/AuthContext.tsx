import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, LoginRequest, RegisterRequest } from '../types';
import { apiService } from '../services/api';
import { handleResp, handleRespWithoutNotify } from '../utils/handleResp';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Skip token validation for public auth pages
      const publicPaths = ['/login', '/register', '/oauth/callback', '/auth/'];
      const isPublicPath = publicPaths.some(path => window.location.pathname.startsWith(path));

      if (isPublicPath) {
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (token) {
        try {
          const resp = await apiService.getCurrentUser();
          handleRespWithoutNotify(resp, (userData) => {
            setUser(userData);
          });
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    const resp = await apiService.login(credentials);
    return new Promise<void>((resolve, reject) => {
      handleResp(
        resp,
        (data) => {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
          resolve();
        },
        (message) => reject(new Error(message))
      );
    });
  };

  const register = async (data: RegisterRequest) => {
    const resp = await apiService.register(data);
    return new Promise<void>((resolve, reject) => {
      handleResp(
        resp,
        (data) => {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setUser(data.user);
          resolve();
        },
        (message) => reject(new Error(message))
      );
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const refreshUser = async () => {
    const resp = await apiService.getCurrentUser();
    handleRespWithoutNotify(resp, (userData) => {
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
