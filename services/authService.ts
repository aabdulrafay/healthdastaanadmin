import { storage } from '@/lib/storage';
import { AdminRole, AdminUser, AuthResponse, LoginCredentials } from '@/types/auth';
import { DEFAULT_SUPERADMIN } from '@/lib/constants';
import { INITIAL_ADMINS } from '@/lib/mockData';
import { apiClient } from './apiClient';

const VALID_ADMIN_ROLES: AdminRole[] = [
  'super_admin',
  'verification_admin',
  'support_admin',
  'compliance_admin',
  'api_control_admin',
];

export const DEMO_ADMIN_ACCOUNTS: Array<{
  email: string;
  name: string;
  role: AdminRole;
  department: string;
  passwordDescription: string;
}> = [
  {
    email: 'superadmin@healthdastaan.com',
    name: 'Executive Super Admin',
    role: 'super_admin',
    department: 'Executive Governance & Platform',
    passwordDescription: 'ChangeMe@HealthDastaan2026!',
  },
  {
    email: 'shahzad.verification@healthdastaan.com',
    name: 'Dr. Shahzad Tariq',
    role: 'verification_admin',
    department: 'Medical Credentialing Board',
    passwordDescription: 'Any password in dev mode',
  },
  {
    email: 'sarah.support@healthdastaan.com',
    name: 'Sarah Khan',
    role: 'support_admin',
    department: 'Clinical Patient Support',
    passwordDescription: 'Any password in dev mode',
  },
  {
    email: 'madiha.compliance@healthdastaan.com',
    name: 'Madiha Bukhari',
    role: 'compliance_admin',
    department: 'Regulatory Compliance & Privacy',
    passwordDescription: 'Any password in dev mode',
  },
  {
    email: 'farhan.api@healthdastaan.com',
    name: 'Farhan Zaidi',
    role: 'api_control_admin',
    department: 'Platform Architecture & APIs',
    passwordDescription: 'Any password in dev mode',
  },
];

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const emailLower = credentials.email.trim().toLowerCase();

    // Rejection check for patient / non-admin accounts
    if (
      emailLower.includes('patient') ||
      emailLower.includes('doctor') ||
      emailLower.includes('user') ||
      emailLower === 'sana.tariq@gmail.com'
    ) {
      throw new Error(
        'Access Denied: Standard patient and practitioner accounts cannot access the Clinical Operations Admin Portal.'
      );
    }

    // Dev mode immediate check for default superadmin
    if (emailLower === DEFAULT_SUPERADMIN.email.toLowerCase()) {
      if (
        credentials.password !== DEFAULT_SUPERADMIN.password &&
        credentials.password !== 'admin' &&
        credentials.password.length < 4
      ) {
        throw new Error('Invalid Super Admin password.');
      }

      const superAdminUser: AdminUser = {
        id: 'adm_001',
        name: DEFAULT_SUPERADMIN.name,
        email: DEFAULT_SUPERADMIN.email,
        role: 'super_admin',
        additionalRoles: [
          'api_control_admin',
          'compliance_admin',
          'verification_admin',
          'support_admin',
        ],
        department: 'Executive Governance & Engineering',
        createdAt: '2025-08-01T00:00:00Z',
        lastLoginAt: new Date().toISOString(),
        mustChangePassword: false,
      };

      const response: AuthResponse = {
        user: superAdminUser,
        tokens: {
          accessToken: `hd_adm_mock_token_${Date.now()}`,
          refreshToken: `hd_adm_mock_refresh_${Date.now()}`,
          expiresIn: 86400,
        },
        message: 'Super Admin authenticated successfully.',
      };

      storage.setAccessToken(response.tokens.accessToken);
      storage.setRefreshToken(response.tokens.refreshToken);
      storage.setUser(response.user);
      return response;
    }

    // 1. First attempt to call the real backend if reachable
    try {
      const result = await apiClient<AuthResponse>('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({
          email: emailLower,
          password: credentials.password,
        }),
        skipAuth: true,
      });

      const userRole = result.user?.role;
      if (!userRole || !VALID_ADMIN_ROLES.includes(userRole)) {
        throw new Error(
          'Access Denied: This account lacks administrative credentials for the HealthDastaan Admin Portal.'
        );
      }

      storage.setAccessToken(result.tokens.accessToken);
      storage.setRefreshToken(result.tokens.refreshToken);
      storage.setUser(result.user);
      return result;
    } catch (networkOrApiError: unknown) {
      if (
        networkOrApiError instanceof Error &&
        networkOrApiError.message.includes('Access Denied')
      ) {
        throw networkOrApiError;
      }

      // Check other demo admin accounts
      const matchingDemo = INITIAL_ADMINS.find((a) => a.email.toLowerCase() === emailLower);

      if (matchingDemo) {
        if (credentials.password.length < 3) {
          throw new Error('Password must be at least 3 characters.');
        }

        const adminUser: AdminUser = {
          id: matchingDemo.id,
          name: matchingDemo.name,
          email: matchingDemo.email,
          role: matchingDemo.role,
          additionalRoles: matchingDemo.additionalRoles,
          department: matchingDemo.department,
          createdAt: matchingDemo.createdAt,
          lastLoginAt: new Date().toISOString(),
          mustChangePassword: false,
        };

        const response: AuthResponse = {
          user: adminUser,
          tokens: {
            accessToken: `hd_adm_mock_token_${Date.now()}`,
            refreshToken: `hd_adm_mock_refresh_${Date.now()}`,
            expiresIn: 86400,
          },
          message: 'Authenticated successfully in administrative role.',
        };

        storage.setAccessToken(response.tokens.accessToken);
        storage.setRefreshToken(response.tokens.refreshToken);
        storage.setUser(response.user);
        return response;
      }

      // If user is a regular patient or practitioner attempting admin login
      if (
        emailLower.includes('patient') ||
        emailLower.includes('doctor') ||
        emailLower.includes('user') ||
        emailLower === 'sana.tariq@gmail.com'
      ) {
        throw new Error(
          'Access Denied: Standard patient and practitioner accounts cannot access the Clinical Operations Admin Portal.'
        );
      }

      // Generic authentication failure
      throw new Error(
        networkOrApiError instanceof Error && networkOrApiError.message !== 'Unknown Network Error'
          ? networkOrApiError.message
          : 'Invalid credentials or administrative user not found.'
      );
    }
  },

  async getCurrentUser(): Promise<AdminUser | null> {
    const user = storage.getUser<AdminUser>();
    if (!user) return null;
    return user;
  },

  async logout(): Promise<void> {
    try {
      await apiClient('/auth/logout', { method: 'POST' }).catch(() => {});
    } finally {
      storage.clearAll();
    }
  },
};
