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
      // Seamlessly fallback to same-origin proxy if browser CORS failed
      if (typeof window !== 'undefined') {
        res = await fetch('/api/v1/auth/refresh', {
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

    if (!res.ok) {
      throw new Error('Refresh failed');
    }

    const data = await res.json();
    const newAccessToken = data.tokens?.accessToken || data.accessToken;
    const newRefreshToken = data.tokens?.refreshToken || data.refreshToken;

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

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const requestHeaders = new Headers(headers);

  if (!requestHeaders.has('Content-Type') && !(rest.body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (!skipAuth) {
    const token = storage.getAccessToken();
    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }
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
      // If browser CORS blocked direct access ('Failed to fetch'), seamlessly fallback to internal Next.js proxy
      if (typeof window !== 'undefined' && url.startsWith('http') && !url.includes('/api/v1')) {
        const proxyUrl = `/api/v1${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
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
          if (typeof window !== 'undefined' && url.startsWith('http') && !url.includes('/api/v1')) {
            const proxyUrl = `/api/v1${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
            response = await executeFetch(proxyUrl);
          }
        }
      }
    }

    if (!response.ok) {
      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }
      const message =
        typeof errorData === 'object' && errorData !== null && 'message' in errorData
          ? String((errorData as { message: unknown }).message)
          : `HTTP ${response.status}: ${response.statusText}`;

      throw new ApiError(message, response.status, errorData);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error instanceof Error ? error.message : 'Unknown Network Error', 0);
  }
}
