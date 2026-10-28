import { storage } from '@/lib/storage';
import { AdminRole, AdminUser, AuthResponse, LoginCredentials } from '@/types/auth';
import { apiClient, ApiError } from './apiClient';

const VALID_ADMIN_ROLES: AdminRole[] = [
  'super_admin',
  'verification_admin',
  'support_admin',
  'compliance_admin',
  'api_control_admin',
];

interface BackendAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    roles?: string[];
    role?: string;
    email?: string | { address?: string };
    phone?: string;
    fullName?: string;
    givenName?: string;
    familyName?: string;
    status?: string;
    department?: string;
    createdAt?: string;
    mustChangePassword?: boolean;
    organizations?: AdminUser['organizations'];
  };
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const emailLower = credentials.email.trim().toLowerCase();

    // Direct authentication via the HealthDastaan Backend API
    try {
      const result = await apiClient<BackendAuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          identifier: emailLower,
          password: credentials.password,
          platform: 'web',
        }),
        skipAuth: true,
      });

      if (result && result.accessToken && result.user) {
        const roles: string[] = Array.isArray(result.user.roles)
          ? result.user.roles
          : result.user.role
            ? [result.user.role]
            : [];

        const hasAdminRole = roles.some((r) => VALID_ADMIN_ROLES.includes(r as AdminRole));
        if (!hasAdminRole) {
          throw new Error(
            'Access Denied: This account lacks administrative credentials for the HealthDastaan Admin Portal.'
          );
        }

        const primaryRole = (roles.find((r) => VALID_ADMIN_ROLES.includes(r as AdminRole)) ||
          'super_admin') as AdminRole;
        const additionalRoles = roles.filter(
          (r) => r !== primaryRole && VALID_ADMIN_ROLES.includes(r as AdminRole)
        ) as AdminRole[];

        const email =
          typeof result.user.email === 'string'
            ? result.user.email
            : typeof result.user.email === 'object' && result.user.email?.address
              ? result.user.email.address
              : emailLower;

        const name =
          typeof result.user.fullName === 'string'
            ? result.user.fullName
            : result.user.givenName
              ? `${result.user.givenName} ${result.user.familyName || ''}`.trim()
              : email;

        const adminUser: AdminUser = {
          id: result.user.id,
          name,
          email,
          role: primaryRole,
          additionalRoles,
          department: result.user.department || 'Clinical Operations',
          createdAt: result.user.createdAt || new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          mustChangePassword: Boolean(result.user.mustChangePassword),
          organizations: result.user.organizations,
        };

        const authResponse: AuthResponse = {
          user: adminUser,
          tokens: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: 86400,
          },
          message: 'Authenticated successfully with HealthDastaan API.',
        };

        storage.setAccessToken(authResponse.tokens.accessToken);
        storage.setRefreshToken(authResponse.tokens.refreshToken);
        storage.setUser(authResponse.user);
        return authResponse;
      }
    } catch (networkOrApiError: unknown) {
      if (
        networkOrApiError instanceof Error &&
        networkOrApiError.message.includes('Access Denied')
      ) {
        throw networkOrApiError;
      }

      // If backend explicitly rejected invalid credentials (401/403)
      if (
        networkOrApiError instanceof ApiError &&
        (networkOrApiError.status === 401 || networkOrApiError.status === 403)
      ) {
        throw new Error(networkOrApiError.message || 'Invalid administrator email or password.');
      }

      // Generic authentication failure
      throw new Error(
        networkOrApiError instanceof Error && networkOrApiError.message !== 'Unknown Network Error'
          ? networkOrApiError.message
          : 'Invalid credentials or administrative user not found.'
      );
    }

    throw new Error('Authentication failed.');
  },

  async getCurrentUser(): Promise<AdminUser | null> {
    try {
      const res = await apiClient<{ user?: AdminUser }>('/auth/me');
      if (res && res.user) {
        storage.setUser(res.user);
        return res.user;
      }
    } catch {
      // Fallback to local storage if offline
    }
    return storage.getUser<AdminUser>();
  },

  async logout(): Promise<void> {
    try {
      const refreshToken = storage.getRefreshToken();
      if (refreshToken) {
        await apiClient('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {});
      }
    } finally {
      storage.clearAll();
    }
  },
};
