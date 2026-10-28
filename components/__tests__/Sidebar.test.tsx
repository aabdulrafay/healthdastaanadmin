import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '../layout/Sidebar';
import * as useAuthModule from '@/hooks/useAuth';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
}));

describe('Sidebar Navigation Component', () => {
  it('renders all governance modules for Super Admin', () => {
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

    render(<Sidebar isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByText('Practitioner Verification')).toBeInTheDocument();
    expect(screen.getByText('Feature Flags & APIs')).toBeInTheDocument();
    expect(screen.getByText('Audit Logs')).toBeInTheDocument();
    expect(screen.getByText('Admin Governance')).toBeInTheDocument();
  });

  it('hides Admin Governance module from Verification Admin', () => {
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

    render(<Sidebar isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Practitioner Verification')).toBeInTheDocument();
    expect(screen.queryByText('Admin Governance')).not.toBeInTheDocument();
  });
});
