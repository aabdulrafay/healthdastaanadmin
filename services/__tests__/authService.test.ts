import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from '../authService';
import { storage } from '@/lib/storage';
import * as apiClientModule from '../apiClient';

describe('authService', () => {
  beforeEach(() => {
    storage.clearAll();
    vi.restoreAllMocks();
  });

  it('authenticates Super Admin with valid credentials via API', async () => {
    vi.spyOn(apiClientModule, 'apiClient').mockResolvedValueOnce({
      accessToken: 'test_access_token_123',
      refreshToken: 'test_refresh_token_123',
      user: {
        id: 'adm_001',
        fullName: 'Super Administrator',
        email: 'admin@healthdastaan.com',
        roles: ['super_admin'],
        department: 'Operations',
      },
    });

    const res = await authService.login({
      email: 'admin@healthdastaan.com',
      password: 'validSecurePassword123!',
    });

    expect(res.user).toBeDefined();
    expect(res.user.role).toBe('super_admin');
    expect(res.tokens.accessToken).toBe('test_access_token_123');
    expect(storage.getAccessToken()).toBe('test_access_token_123');
    expect(storage.getUser()).toEqual(res.user);
  });

  it('rejects authentication with Access Denied for non-admin accounts', async () => {
    vi.spyOn(apiClientModule, 'apiClient').mockResolvedValueOnce({
      accessToken: 'patient_token_456',
      refreshToken: 'patient_refresh_456',
      user: {
        id: 'usr_pat_001',
        fullName: 'Standard Patient',
        email: 'patient@example.com',
        roles: ['patient'],
      },
    });

    await expect(
      authService.login({
        email: 'patient@example.com',
        password: 'patientPassword123!',
      })
    ).rejects.toThrow(/Access Denied/i);

    expect(storage.getAccessToken()).toBeNull();
  });

  it('clears storage and session tokens upon logout', async () => {
    storage.setAccessToken('active_session_token');
    storage.setUser({ id: 'adm_01', name: 'Admin', role: 'super_admin' });

    await authService.logout();

    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getUser()).toBeNull();
  });
});
