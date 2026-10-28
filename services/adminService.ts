import { AdminAccount, CreateAdminPayload, UpdateAdminPayload } from '@/types/admin';
import { INITIAL_ADMINS } from '@/lib/mockData';
import { apiClient } from './apiClient';

const adminsCache: AdminAccount[] = [...INITIAL_ADMINS];

export const adminService = {
  async getAdmins(): Promise<AdminAccount[]> {
    try {
      const res = await apiClient<{ admins: AdminAccount[] }>('/admin/governance/admins');
      return res.admins;
    } catch {
      return [...adminsCache];
    }
  },

  async createAdmin(
    payload: CreateAdminPayload,
    creatorName = 'Super Admin'
  ): Promise<AdminAccount> {
    try {
      const res = await apiClient<{ admin: AdminAccount }>('/admin/governance/admins', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return res.admin;
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
      const res = await apiClient<{ admin: AdminAccount }>(`/admin/governance/admins/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return res.admin;
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

  async deactivateAdmin(id: string): Promise<AdminAccount> {
    return this.updateAdmin(id, { status: 'deactivated' });
  },

  async activateAdmin(id: string): Promise<AdminAccount> {
    return this.updateAdmin(id, { status: 'active' });
  },
};
