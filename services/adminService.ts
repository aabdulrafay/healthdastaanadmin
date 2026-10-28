import { AdminAccount, CreateAdminPayload, UpdateAdminPayload } from '@/types/admin';
import { apiClient } from './apiClient';

interface RawBackendAdmin {
  id: string;
  email: string;
  fullName?: string;
  name?: string;
  roles?: string[];
  role?: string;
  additionalRoles?: string[];
  isSuperAdmin?: boolean;
  department?: string;
  status?: 'active' | 'deactivated';
  createdAt?: string;
  phoneNumber?: string;
  phone?: string;
}

function normalizeAdmin(raw: RawBackendAdmin): AdminAccount {
  const primaryRole =
    raw.roles && raw.roles.length > 0
      ? (raw.roles[0] as AdminAccount['role'])
      : raw.role
        ? (raw.role as AdminAccount['role'])
        : raw.isSuperAdmin
          ? 'super_admin'
          : 'support_admin';

  const additionalRoles =
    raw.roles && raw.roles.length > 1
      ? (raw.roles.slice(1) as AdminAccount['role'][])
      : (raw.additionalRoles as AdminAccount['role'][]) || [];

  return {
    id: raw.id,
    name: raw.fullName || raw.name || raw.email,
    email: raw.email,
    role: primaryRole,
    additionalRoles,
    department: raw.department || 'Governance',
    status: raw.status || 'active',
    privileges: raw.roles || [primaryRole, ...additionalRoles],
    createdAt: raw.createdAt || new Date().toISOString(),
    phoneNumber: raw.phone || raw.phoneNumber,
  };
}

export const adminService = {
  async getAdmins(): Promise<AdminAccount[]> {
    try {
      const res = await apiClient<
        RawBackendAdmin[] | { admins?: RawBackendAdmin[]; items?: RawBackendAdmin[] }
      >('/admin/admins');

      if (Array.isArray(res)) {
        return res.map(normalizeAdmin);
      }
      if (res && Array.isArray(res.admins)) {
        return res.admins.map(normalizeAdmin);
      }
      if (res && Array.isArray(res.items)) {
        return res.items.map(normalizeAdmin);
      }
      return [];
    } catch {
      return [];
    }
  },

  async createAdmin(
    payload: CreateAdminPayload,
    _creatorName = 'Super Admin'
  ): Promise<AdminAccount> {
    const roles =
      payload.additionalRoles && payload.additionalRoles.length > 0
        ? [payload.role, ...payload.additionalRoles]
        : [payload.role];

    const res = await apiClient<RawBackendAdmin | { admin?: RawBackendAdmin }>('/admin/admins', {
      method: 'POST',
      body: JSON.stringify({
        email: payload.email,
        password: payload.temporaryPassword,
        fullName: payload.name,
        roles,
        isSuperAdmin: payload.role === 'super_admin' || roles.includes('super_admin'),
        department: payload.department,
        phone: payload.phoneNumber,
      }),
    });

    const raw = 'admin' in res && res.admin ? res.admin : (res as RawBackendAdmin);
    return normalizeAdmin(raw);
  },

  async updateAdmin(id: string, payload: UpdateAdminPayload): Promise<AdminAccount> {
    const roles = payload.role
      ? payload.additionalRoles
        ? [payload.role, ...payload.additionalRoles]
        : [payload.role]
      : undefined;

    const res = await apiClient<RawBackendAdmin | { admin?: RawBackendAdmin }>(
      `/admin/admins/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: payload.name,
          roles,
          isSuperAdmin: payload.role === 'super_admin',
          department: payload.department,
        }),
      }
    );

    const raw = 'admin' in res && res.admin ? res.admin : (res as RawBackendAdmin);
    return normalizeAdmin(raw);
  },

  async deleteAdmin(id: string): Promise<void> {
    await apiClient(`/admin/admins/${id}`, { method: 'DELETE' });
  },

  async deactivateAdmin(id: string): Promise<AdminAccount> {
    return this.updateAdmin(id, { status: 'deactivated' });
  },

  async activateAdmin(id: string): Promise<AdminAccount> {
    return this.updateAdmin(id, { status: 'active' });
  },
};
