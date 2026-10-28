import { User, UserFilterParams, UserStatus } from '@/types/user';
import { INITIAL_USERS } from '@/lib/mockData';
import { apiClient } from './apiClient';

let usersCache: User[] = [...INITIAL_USERS];

export const userService = {
  async getUsers(params: UserFilterParams = {}): Promise<{ users: User[]; total: number }> {
    try {
      const query = new URLSearchParams();
      if (params.search) query.set('search', params.search);
      if (params.role) query.set('role', params.role);
      if (params.status) query.set('status', params.status);
      if (params.verificationStatus) query.set('verificationStatus', params.verificationStatus);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));

      const res = await apiClient<{ users: User[]; total: number }>(`/admin/users?${query.toString()}`);
      return res;
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
      const res = await apiClient<{ user: User }>(`/admin/users/${id}`);
      return res.user;
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
      const res = await apiClient<{ user: User }>(`/admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason, suspendedUntil }),
      });
      return res.user;
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
      return await apiClient<{ success: boolean; revokedCount: number }>(
        `/admin/users/${id}/revoke-sessions`,
        { method: 'POST' }
      );
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
