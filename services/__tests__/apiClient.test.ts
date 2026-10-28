import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { apiClient, ApiError } from '../apiClient';
import { storage } from '@/lib/storage';

describe('apiClient', () => {
  beforeEach(() => {
    storage.clearAll();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes network errors into ApiError instances', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network connection failed'));

    await expect(apiClient('/test-endpoint')).rejects.toThrow(ApiError);
    await expect(apiClient('/test-endpoint')).rejects.toThrow('Network connection failed');
  });

  it('normalizes HTTP 400/500 responses with status and server error message', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: async () => ({ message: 'Insufficient clinical permission' }),
    } as unknown as Response);

    try {
      await apiClient('/admin/secure');
      expect.fail('Should have thrown an ApiError');
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.status).toBe(403);
      expect(apiErr.message).toBe('Insufficient clinical permission');
    }
  });

  it('automatically attaches Bearer token from storage', async () => {
    storage.setAccessToken('mock_bearer_token_123');

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    } as unknown as Response);

    await apiClient('/admin/metrics');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const headers = fetchSpy.mock.calls[0][1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer mock_bearer_token_123');
  });

  it('handles 401 by attempting token refresh and replaying request', async () => {
    storage.setAccessToken('expired_token');
    storage.setRefreshToken('valid_refresh_token');

    const fetchSpy = vi
      .spyOn(global, 'fetch')
      // First call: 401 Unauthorized
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ message: 'Token expired' }),
      } as unknown as Response)
      // Second call: /auth/refresh-token endpoint returns new tokens
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          tokens: {
            accessToken: 'new_access_token_456',
            refreshToken: 'new_refresh_token_789',
          },
        }),
      } as unknown as Response)
      // Third call: replayed original request succeeds
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'replayed_success' }),
      } as unknown as Response);

    const result = await apiClient<{ data: string }>('/admin/protected');

    expect(result.data).toBe('replayed_success');
    expect(storage.getAccessToken()).toBe('new_access_token_456');
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});
