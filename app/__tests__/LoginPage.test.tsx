import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from '../login/page';
import * as useAuthModule from '@/hooks/useAuth';
import * as useToastModule from '@/hooks/useToast';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/login',
}));

describe('LoginPage Component', () => {
  it('renders login form with clinical branding and inputs', () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
      canAccessRoute: vi.fn(),
      isSuperAdmin: false,
    });

    vi.spyOn(useToastModule, 'useToast').mockReturnValue({
      toasts: [],
      showToast: vi.fn(),
      removeToast: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    });

    render(<LoginPage />);

    expect(screen.getByText('HealthDastaan')).toBeInTheDocument();
    expect(screen.getByText('System Administration Portal')).toBeInTheDocument();
    expect(screen.getByLabelText(/Administrator Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Security Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to Console/i })).toBeInTheDocument();
  });

  it('validates empty input and displays error message', async () => {
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      hasRole: vi.fn(),
      canAccessRoute: vi.fn(),
      isSuperAdmin: false,
    });

    vi.spyOn(useToastModule, 'useToast').mockReturnValue({
      toasts: [],
      showToast: vi.fn(),
      removeToast: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    });

    render(<LoginPage />);

    const submitBtn = screen.getByRole('button', { name: /Sign In to Console/i });
    const form = submitBtn.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText(/Please provide both administrator email and password/i)
      ).toBeInTheDocument();
    });
  });

  it('displays Access Denied when non-admin credentials are rejected', async () => {
    const mockLogin = vi
      .fn()
      .mockRejectedValue(
        new Error(
          'Access Denied: Standard patient and practitioner accounts cannot access the Clinical Operations Admin Portal.'
        )
      );

    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: mockLogin,
      logout: vi.fn(),
      hasRole: vi.fn(),
      canAccessRoute: vi.fn(),
      isSuperAdmin: false,
    });

    const mockToastError = vi.fn();
    vi.spyOn(useToastModule, 'useToast').mockReturnValue({
      toasts: [],
      showToast: vi.fn(),
      removeToast: vi.fn(),
      success: vi.fn(),
      error: mockToastError,
      warning: vi.fn(),
      info: vi.fn(),
    });

    render(<LoginPage />);

    const emailInput = screen.getByLabelText(/Administrator Email/i);
    const passwordInput = screen.getByLabelText(/Security Password/i);
    const submitBtn = screen.getByRole('button', { name: /Sign In to Console/i });

    fireEvent.change(emailInput, { target: { value: 'patient@healthdastaan.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Access Denied')).toBeInTheDocument();
    });
  });
});
