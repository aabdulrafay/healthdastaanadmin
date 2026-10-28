import { AdminAccount, CreateAdminPayload, UpdateAdminPayload } from '@/types/admin';
import { INITIAL_ADMINS } from '@/lib/mockData';
import { apiClient } from './apiClient';

const adminsCache: AdminAccount[] = [...INITIAL_ADMINS];

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
      return [...adminsCache];
    } catch {
      return [...adminsCache];
    }
  },

  async createAdmin(
    payload: CreateAdminPayload,
    creatorName = 'Super Admin'
  ): Promise<AdminAccount> {
    try {
      const roles =
        payload.additionalRoles && payload.additionalRoles.length > 0
          ? [payload.role, ...payload.additionalRoles]
          : [payload.role];

      const res = await apiClient<RawBackendAdmin | { admin?: RawBackendAdmin }>('/admin/admins', {
        method: 'POST',
        body: JSON.stringify({
          email: payload.email,
          password: 'Password123!',
          fullName: payload.name,
          roles,
          isSuperAdmin: payload.role === 'super_admin' || roles.includes('super_admin'),
          department: payload.department,
          phone: payload.phoneNumber,
        }),
      });

      const raw = 'admin' in res && res.admin ? res.admin : (res as RawBackendAdmin);
      return normalizeAdmin(raw);
    } catch {
      const newAdmin: AdminAccount = {
        id: `adm_00${adminsCache.length + 1}`,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        additionalRoles: payload.additionalRoles || [],
        department: payload.department,
        status: 'active',
        privileges: payload.privileges,
        createdAt: new Date().toISOString(),
        createdByAdminName: creatorName,
        phoneNumber: payload.phoneNumber,
      };

      adminsCache.push(newAdmin);
      return newAdmin;
    }
  },

  async updateAdmin(id: string, payload: UpdateAdminPayload): Promise<AdminAccount> {
    try {
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
    } catch {
      const index = adminsCache.findIndex((a) => a.id === id);
      if (index === -1) throw new Error('Admin not found');

      const updated: AdminAccount = {
        ...adminsCache[index],
        ...payload,
      };

      adminsCache[index] = updated;
      return updated;
    }
  },

  async deleteAdmin(id: string): Promise<void> {
    try {
      await apiClient(`/admin/admins/${id}`, { method: 'DELETE' });
    } catch {
      const index = adminsCache.findIndex((a) => a.id === id);
      if (index !== -1) {
        adminsCache.splice(index, 1);
      }
    }
  },

  async deactivateAdmin(id: string): Promise<AdminAccount> {
    return this.updateAdmin(id, { status: 'deactivated' });
  },

  async activateAdmin(id: string): Promise<AdminAccount> {
    return this.updateAdmin(id, { status: 'active' });
  },
};
