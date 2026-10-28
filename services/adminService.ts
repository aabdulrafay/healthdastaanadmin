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
  adminProfile?: {
    id?: string;
    roles?: string[];
    isSuperAdmin?: boolean;
    department?: string;
  };
}

function normalizeAdmin(raw: RawBackendAdmin): AdminAccount {
  const profile = raw.adminProfile;
  const roles =
    profile?.roles && profile.roles.length > 0
      ? profile.roles
      : raw.roles && raw.roles.length > 0
        ? raw.roles
        : raw.role
          ? [raw.role]
          : [];

  const isSuper = profile?.isSuperAdmin ?? raw.isSuperAdmin ?? roles.includes('super_admin');

  const primaryRole = (roles.find((r) => r !== 'admin') ||
    (isSuper ? 'super_admin' : 'support_admin')) as AdminAccount['role'];

  const additionalRoles = roles.filter(
    (r) => r !== primaryRole && r !== 'admin'
  ) as AdminAccount['role'][];

  return {
    id: raw.id,
    name: raw.fullName || raw.name || raw.email,
    email: raw.email,
    role: primaryRole,
    additionalRoles,
    department: profile?.department || raw.department || 'Governance',
    status: raw.status || 'active',
    privileges: roles.length > 0 ? roles : [primaryRole, ...additionalRoles],
    createdAt: raw.createdAt || new Date().toISOString(),
    phoneNumber: raw.phone || raw.phoneNumber,
  };
}

export const adminService = {
  async getAdmins(): Promise<AdminAccount[]> {
    try {
      const res = await apiClient<
        | RawBackendAdmin[]
        | { admins?: RawBackendAdmin[]; items?: RawBackendAdmin[] }
        | RawBackendAdmin
      >('/admin/admins');

      if (Array.isArray(res)) {
        return res.map(normalizeAdmin);
      }
      if (res && typeof res === 'object') {
        if ('admins' in res && Array.isArray(res.admins)) {
          return res.admins.map(normalizeAdmin);
        }
        if ('items' in res && Array.isArray(res.items)) {
          return res.items.map(normalizeAdmin);
        }
        if ('id' in res) {
          return [normalizeAdmin(res as RawBackendAdmin)];
        }
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

    const bodyPayload: Record<string, unknown> = {
      email: payload.email.trim().toLowerCase(),
      password: payload.temporaryPassword,
      fullName: payload.name.trim(),
      roles,
      isSuperAdmin: payload.role === 'super_admin' || roles.includes('super_admin'),
      department: payload.department.trim(),
    };

    if (payload.phoneNumber && payload.phoneNumber.trim()) {
      bodyPayload.phone = payload.phoneNumber.trim();
    }

    const res = await apiClient<RawBackendAdmin | { admin?: RawBackendAdmin }>('/admin/admins', {
      method: 'POST',
      body: JSON.stringify(bodyPayload),
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
