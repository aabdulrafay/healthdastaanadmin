import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from '../authService';
import { storage } from '@/lib/storage';
import { DEFAULT_SUPERADMIN } from '@/lib/constants';

describe('authService', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('authenticates Super Admin in fallback/dev mode with valid credentials', async () => {
    const res = await authService.login({
      email: DEFAULT_SUPERADMIN.email,
      password: DEFAULT_SUPERADMIN.password,
    });

    expect(res.user).toBeDefined();
    expect(res.user.role).toBe('super_admin');
    expect(res.tokens.accessToken).toBeDefined();
    expect(storage.getAccessToken()).toBe(res.tokens.accessToken);
    expect(storage.getUser()).toEqual(res.user);
  });

  it('rejects authentication with Access Denied for non-admin roles', async () => {
    await expect(
      authService.login({
        email: 'sana.tariq@gmail.com',
        password: 'anyPatientPassword',
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
