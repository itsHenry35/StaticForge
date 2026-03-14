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

function getCachedUser(): User | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cached = getCachedUser();
  const [user, setUserState] = useState<User | null>(cached);
  const [loading, setLoading] = useState(!cached);

  const setUser = (userData: User) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUserState(userData);
  };

  const clearUser = () => {
    localStorage.removeItem('user');
    setUserState(null);
  };

  useEffect(() => {
    const verify = async () => {
      try {
        const resp = await apiService.getCurrentUser();
        handleRespWithoutNotify(resp, (userData) => {
          setUser(userData);
        });
      } catch {
        // Server error, keep cached user
      }
      setLoading(false);
    };

    verify();
  }, []);

  const logout = async () => {
    await apiService.logout();
    clearUser();
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
