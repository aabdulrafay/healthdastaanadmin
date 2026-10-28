const ACCESS_TOKEN_KEY = 'hd_admin_access_token';
const REFRESH_TOKEN_KEY = 'hd_admin_refresh_token';
const USER_KEY = 'hd_admin_user_data';

export const storage = {
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  setAccessToken: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    // Also set document cookie for middleware or SSR checking
    document.cookie = `hd_admin_token=${encodeURIComponent(token)}; path=/; max-age=86400; SameSite=Strict`;
  },

  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken: (token: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
    document.cookie = `hd_admin_refresh=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Strict`;
  },

  getUser: <T>(): T | null => {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(USER_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  },

  setUser: (user: unknown): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearAll: (): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    document.cookie = 'hd_admin_token=; path=/; max-age=0';
    document.cookie = 'hd_admin_refresh=; path=/; max-age=0';
  },
};
