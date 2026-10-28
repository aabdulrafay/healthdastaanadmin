'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { AdminRole, AdminUser, LoginCredentials } from '@/types/auth';
import { authService } from '@/services/authService';
import { storage } from '@/lib/storage';
import { ROLE_CONFIGS } from '@/lib/constants';

interface AuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AdminUser>;
  logout: () => Promise<void>;
  hasRole: (role: AdminRole) => boolean;
  canAccessRoute: (pathname: string) => boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const initAuth = useCallback(() => {
    try {
      const storedUser = storage.getUser<AdminUser>();
      const token = storage.getAccessToken();

      if (storedUser && token) {
        setUser(storedUser);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = async (credentials: LoginCredentials): Promise<AdminUser> => {
    setIsLoading(true);
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      return response.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const hasRole = useCallback(
    (targetRole: AdminRole): boolean => {
      if (!user) return false;
      if (user.role === 'super_admin') return true;
      if (user.role === targetRole) return true;
      if (user.additionalRoles && user.additionalRoles.includes(targetRole)) return true;
      return false;
    },
    [user]
  );

  const canAccessRoute = useCallback(
    (routePath: string): boolean => {
      if (!user) return false;
      if (user.role === 'super_admin') return true;

      // Check current user role config
      const userRoles = [user.role, ...(user.additionalRoles || [])];
      for (const r of userRoles) {
        const config = ROLE_CONFIGS[r];
        if (config) {
          if (
            config.accessibleRoutes.includes(routePath) ||
            config.accessibleRoutes.some((ar) => ar !== '/' && routePath.startsWith(ar))
          ) {
            return true;
          }
        }
      }

      // Root path '/' is accessible to all admins
      if (routePath === '/') return true;

      return false;
    },
    [user]
  );

  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole,
        canAccessRoute,
        isSuperAdmin,
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
