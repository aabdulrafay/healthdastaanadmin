import { User, UserFilterParams, UserRole, UserStatus, VerificationStatus } from '@/types/user';
import { INITIAL_USERS } from '@/lib/mockData';
import { apiClient } from './apiClient';

const usersCache: User[] = [...INITIAL_USERS];

interface RawUserItem {
  id: string;
  email?: string;
  phone?: string;
  role: 'patient' | 'practitioner' | 'admin' | 'both';
  status: UserStatus;
  nationalityCode?: string;
  blockedReason?: string | null;
  blockedAt?: string | null;
  createdAt?: string;
  lastLoginAt?: string;
  patient?: {
    id?: string;
    givenName?: string;
    familyName?: string;
  } | null;
  practitioner?: {
    id?: string;
    givenName?: string;
    familyName?: string;
    registrationNumber?: string;
    category?: string;
  } | null;
  fullName?: string;
  activeSessionsCount?: number;
}

interface BackendUserListResponse {
  items?: RawUserItem[];
  users?: User[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  total?: number;
}

function normalizeUser(item: RawUserItem): User {
  const firstName =
    item.patient?.givenName ||
    item.practitioner?.givenName ||
    item.fullName?.split(' ')[0] ||
    'User';
  const lastName =
    item.patient?.familyName ||
    item.practitioner?.familyName ||
    item.fullName?.split(' ').slice(1).join(' ') ||
    '';
  const fullName = item.fullName || `${firstName} ${lastName}`.trim() || item.email || item.id;
  const role: UserRole = item.role === 'practitioner' ? 'practitioner' : 'patient';
  const verificationStatus: VerificationStatus =
    role === 'practitioner' ? (item.status === 'active' ? 'verified' : 'pending') : 'unverified';

  return {
    id: item.id,
    firstName,
    lastName,
    fullName,
    email: item.email || '',
    phone: item.phone || '',
    role,
    status: item.status,
    verificationStatus,
    pmdcNumber: item.practitioner?.registrationNumber,
    specialization: item.practitioner?.category,
    activeSessionsCount: item.activeSessionsCount ?? 1,
    createdAt: item.createdAt || new Date().toISOString(),
    lastActiveAt: item.lastLoginAt || new Date().toISOString(),
    blockedReason: item.blockedReason || undefined,
    blockedAt: item.blockedAt || undefined,
  };
}

export const userService = {
  async getUsers(params: UserFilterParams = {}): Promise<{ users: User[]; total: number }> {
    try {
      const query = new URLSearchParams();
      if (params.search) query.set('search', params.search);
      if (params.role && params.role !== 'all') query.set('role', params.role);
      if (params.status && params.status !== 'all') query.set('status', params.status);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));

      const res = await apiClient<BackendUserListResponse>(`/admin/users?${query.toString()}`);

      if (res && Array.isArray(res.items)) {
        const users = res.items.map(normalizeUser);
        return {
          users,
          total: res.meta?.total ?? users.length,
        };
      }

      if (res && Array.isArray(res.users)) {
        return {
          users: res.users,
          total: res.total ?? res.users.length,
        };
      }

      return { users: [], total: 0 };
    } catch {
      // Mock Fallback
      let filtered = [...usersCache];

      if (params.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.fullName.toLowerCase().includes(q) ||
            u.email.toLowerCase().includes(q) ||
            u.phone.includes(q) ||
            (u.pmdcNumber && u.pmdcNumber.toLowerCase().includes(q))
        );
      }

      if (params.role && params.role !== 'all') {
        filtered = filtered.filter((u) => u.role === params.role);
      }

      if (params.status && params.status !== 'all') {
        filtered = filtered.filter((u) => u.status === params.status);
      }

      if (params.verificationStatus && params.verificationStatus !== 'all') {
        filtered = filtered.filter((u) => u.verificationStatus === params.verificationStatus);
      }

      return {
        users: filtered,
        total: filtered.length,
      };
    }
  },

  async getUserById(id: string): Promise<User | null> {
    try {
      const res = await apiClient<{ user?: RawUserItem } | RawUserItem>(`/admin/users/${id}`);
      const raw = 'user' in res && res.user ? res.user : (res as RawUserItem);
      return normalizeUser(raw);
    } catch {
      const user = usersCache.find((u) => u.id === id);
      return user || null;
    }
  },

  async updateUserStatus(
    id: string,
    status: UserStatus,
    reason?: string,
    suspendedUntil?: string
  ): Promise<User> {
    try {
      const res = await apiClient<{ user?: RawUserItem } | RawUserItem>(
        `/admin/users/${id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status, reason }),
        }
      );
      const raw = 'user' in res && res.user ? res.user : (res as RawUserItem);
      return normalizeUser(raw);
    } catch {
      const index = usersCache.findIndex((u) => u.id === id);
      if (index === -1) throw new Error('User not found.');

      const updated: User = {
        ...usersCache[index],
        status,
        blockedReason: status === 'blocked' ? reason : undefined,
        blockedAt: status === 'blocked' ? new Date().toISOString() : undefined,
        suspendedUntil: status === 'suspended' ? suspendedUntil : undefined,
        suspensionReason: status === 'suspended' ? reason : undefined,
      };

      usersCache[index] = updated;
      return updated;
    }
  },

  async revokeAllUserSessions(id: string): Promise<{ success: boolean; revokedCount: number }> {
    try {
      const res = await apiClient<{ message: string; revokedCount: number }>(
        `/admin/users/${id}/revoke-tokens`,
        { method: 'POST' }
      );
      return { success: true, revokedCount: res.revokedCount ?? 1 };
    } catch {
      const index = usersCache.findIndex((u) => u.id === id);
      if (index !== -1) {
        const revokedCount = usersCache[index].activeSessionsCount;
        usersCache[index] = {
          ...usersCache[index],
          activeSessionsCount: 0,
        };
        return { success: true, revokedCount };
      }
      return { success: true, revokedCount: 1 };
    }
  },
};
