import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import { EmployeeDto, ActivePerformerDto, UserRole } from '@pharmacy/shared';

interface AuthContextType {
  user: EmployeeDto | null;
  activePerformers: ActivePerformerDto[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshPerformers: () => Promise<void>;
  verifyPin: (employeeId: string, pin: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<EmployeeDto | null>(() => {
    const saved = localStorage.getItem('pharmacy_auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activePerformers, setActivePerformers] = useState<ActivePerformerDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshPerformers = async () => {
    try {
      const res = await api.get<ActivePerformerDto[]>('/auth/active-performers');
      setActivePerformers(res.data);
    } catch (e) {
      console.error('Failed to load active performers', e);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('pharmacy_auth_token');
      if (token) {
        try {
          const res = await api.get<{ employee: EmployeeDto }>('/auth/me');
          setUser(res.data.employee);
          localStorage.setItem('pharmacy_auth_user', JSON.stringify(res.data.employee));
          await refreshPerformers();
        } catch (e) {
          localStorage.removeItem('pharmacy_auth_token');
          localStorage.removeItem('pharmacy_auth_user');
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const res = await api.post<{ token: string; employee: EmployeeDto }>('/auth/login', {
        username,
        password,
        workstationName: 'Workstation-Client',
      });

      localStorage.setItem('pharmacy_auth_token', res.data.token);
      localStorage.setItem('pharmacy_auth_user', JSON.stringify(res.data.employee));
      setUser(res.data.employee);
      await refreshPerformers();
      return { success: true };
    } catch (error: any) {
      const msg = error.response?.data?.error || 'فشل تسجيل الدخول، تأكد من صحة البيانات';
      return { success: false, error: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('pharmacy_auth_token');
    localStorage.removeItem('pharmacy_auth_user');
    setUser(null);
  };

  const verifyPin = async (employeeId: string, pin: string): Promise<boolean> => {
    try {
      const res = await api.post<{ valid: boolean }>('/auth/verify-pin', {
        employeeId,
        pin,
      });
      return res.data.valid;
    } catch (e) {
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activePerformers,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshPerformers,
        verifyPin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
