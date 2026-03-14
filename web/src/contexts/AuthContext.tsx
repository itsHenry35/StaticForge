import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { apiService } from '../services/api';
import { handleRespWithoutNotify } from '../utils/handleResp';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Skip validation for public auth pages
      const publicPaths = ['/login', '/register', '/auth/'];
      const isPublicPath = publicPaths.some(path => window.location.pathname.startsWith(path));

      if (isPublicPath) {
        setLoading(false);
        return;
      }

      const resp = await apiService.getCurrentUser();
      handleRespWithoutNotify(resp, (userData) => {
        setUser(userData);
      });
      setLoading(false);
    };

    initAuth();
  }, []);

  const logout = async () => {
    await apiService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    const resp = await apiService.getCurrentUser();
    handleRespWithoutNotify(resp, (userData) => {
      setUser(userData);
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser, setUser }}>
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
