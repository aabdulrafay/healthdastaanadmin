import { storage } from '@/lib/storage';
import { API_BASE_URL } from '@/lib/constants';

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];
const inFlightGetRequests = new Map<string, Promise<unknown>>();

async function parseResponseBody(response: Response): Promise<unknown> {
  try {
    if (typeof response.clone === 'function') {
      try {
        const cloned = response.clone();
        if (typeof cloned.text === 'function') {
          const raw = await cloned.text();
          try {
            return raw ? JSON.parse(raw) : null;
          } catch {
            return raw;
          }
        }
      } catch {
        // Fall back to direct read
      }
    }

    if (typeof response.json === 'function') {
      return await response.json();
    }

    if (typeof response.text === 'function') {
      const raw = await response.text();
      try {
        return raw ? JSON.parse(raw) : null;
      } catch {
        return raw;
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function handleTokenRefresh(): Promise<string | null> {
  const refreshToken = storage.getRefreshToken();
  if (!refreshToken) {
    storage.clearAll();
    return null;
  }

  if (isRefreshing) {
    return new Promise((resolve) => {
      refreshQueue.push((token) => resolve(token));
    });
  }

  isRefreshing = true;

  try {
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch (networkError) {
      if (typeof window !== 'undefined') {
        res = await fetch('/api/proxy/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });
      } else {
        throw networkError;
      }
    }

    const parsed = (await parseResponseBody(res)) as Record<string, unknown> | null;
    const data = parsed && typeof parsed === 'object' ? parsed : {};

    if (!res.ok) {
      throw new Error(String(data.message || 'Refresh failed'));
    }

    const tokens =
      typeof data.tokens === 'object' && data.tokens !== null
        ? (data.tokens as Record<string, string>)
        : null;
    const newAccessToken = (tokens?.accessToken || data.accessToken) as string | undefined;
    const newRefreshToken = (tokens?.refreshToken || data.refreshToken) as string | undefined;

    if (newAccessToken) {
      storage.setAccessToken(newAccessToken);
      if (newRefreshToken) storage.setRefreshToken(newRefreshToken);

      refreshQueue.forEach((callback) => callback(newAccessToken));
      refreshQueue = [];
      return newAccessToken;
    }

    throw new Error('No access token returned');
  } catch {
    storage.clearAll();
    refreshQueue.forEach((callback) => callback(null));
    refreshQueue = [];
    if (typeof window !== 'undefined') {
      window.location.replace('/login?expired=1');
    }
    return null;
  } finally {
    isRefreshing = false;
  }
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth = false, headers = {}, ...rest } = options;
  const method = (rest.method || 'GET').toUpperCase();
  const isGet = method === 'GET';

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const token = !skipAuth ? storage.getAccessToken() : null;
  const cacheKey = isGet ? `${token || 'anon'}:${url}` : null;

  if (cacheKey && inFlightGetRequests.has(cacheKey)) {
    return inFlightGetRequests.get(cacheKey) as Promise<T>;
  }

  const executeRequest = async (): Promise<T> => {
    const requestHeaders = new Headers(headers);

    if (!requestHeaders.has('Content-Type') && !(rest.body instanceof FormData)) {
      requestHeaders.set('Content-Type', 'application/json');
    }

    if (!skipAuth && token) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }

    const executeFetch = async (targetUrl: string): Promise<Response> => {
      return fetch(targetUrl, {
        ...rest,
        headers: requestHeaders,
      });
    };

    try {
      let response: Response;
      try {
        response = await executeFetch(url);
      } catch (networkError) {
        // If direct cross-origin access failed in browser, retry via same-origin proxy
        if (
          typeof window !== 'undefined' &&
          url.startsWith('http') &&
          !url.includes('/api/proxy')
        ) {
          const proxyUrl = `/api/proxy${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
          response = await executeFetch(proxyUrl);
        } else {
          throw networkError;
        }
      }

      // 401 Unauthorized: Attempt token refresh
      if (response.status === 401 && !skipAuth) {
        const newToken = await handleTokenRefresh();
        if (newToken) {
          requestHeaders.set('Authorization', `Bearer ${newToken}`);
          try {
            response = await executeFetch(url);
          } catch {
            if (
              typeof window !== 'undefined' &&
              url.startsWith('http') &&
              !url.includes('/api/proxy')
            ) {
              const proxyUrl = `/api/proxy${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
              response = await executeFetch(proxyUrl);
            }
          }
        }
      }

      const data = await parseResponseBody(response);

      if (!response.ok) {
        let message = `HTTP ${response.status}: ${response.statusText}`;
        if (typeof data === 'object' && data !== null) {
          if ('message' in data) {
            const msg = (data as { message: unknown }).message;
            message = Array.isArray(msg) ? msg.join(', ') : String(msg);
          } else if ('error' in data) {
            message = String((data as { error: unknown }).error);
          }
        } else if (typeof data === 'string' && data.trim()) {
          message = data;
        }

        throw new ApiError(message, response.status, data);
      }

      return (data ?? {}) as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(error instanceof Error ? error.message : 'Unknown Network Error', 0);
    }
  };

  const promise = executeRequest();

  if (cacheKey) {
    inFlightGetRequests.set(cacheKey, promise);
    promise
      .catch(() => {})
      .finally(() => {
        inFlightGetRequests.delete(cacheKey);
      });
  }

  return promise;
}
