import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleGuard } from '../layout/RoleGuard';
import * as useAuthModule from '@/hooks/useAuth';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));

describe('RoleGuard Component', () => {
  it('renders children when the user has an allowed role', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        id: 'adm_02',
        name: 'Dr. Shahzad',
        email: 'shahzad.verification@healthdastaan.com',
        role: 'verification_admin',
        createdAt: '2026-01-01',
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
      canAccessRoute: vi.fn(),
      isSuperAdmin: false,
    });

    render(
      <RoleGuard allowedRoles={['verification_admin']}>
        <div>Verified Doctors Area</div>
      </RoleGuard>
    );

    expect(screen.getByText('Verified Doctors Area')).toBeInTheDocument();
  });

  it('renders Access Restricted when the user lacks the required role', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        id: 'adm_03',
        name: 'Sarah Khan',
        email: 'sarah.support@healthdastaan.com',
        role: 'support_admin',
        createdAt: '2026-01-01',
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
      canAccessRoute: vi.fn(),
      isSuperAdmin: false,
    });

    render(
      <RoleGuard allowedRoles={['api_control_admin']}>
        <div>API Controls Area</div>
      </RoleGuard>
    );

    expect(screen.queryByText('API Controls Area')).not.toBeInTheDocument();
    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
  });

  it('unconditionally grants access to Super Admin', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: {
        id: 'adm_01',
        name: 'Super Admin',
        email: 'superadmin@healthdastaan.com',
        role: 'super_admin',
        createdAt: '2025-08-01',
      },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
      canAccessRoute: vi.fn(),
      isSuperAdmin: true,
    });

    render(
      <RoleGuard allowedRoles={['compliance_admin']}>
        <div>Confidential Compliance Logs</div>
      </RoleGuard>
    );

    expect(screen.getByText('Confidential Compliance Logs')).toBeInTheDocument();
  });
});
