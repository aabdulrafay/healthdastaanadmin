import { AdminRole } from './auth';

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  additionalRoles: AdminRole[];
  department: string;
  status: 'active' | 'suspended' | 'deactivated';
  privileges: string[];
  createdAt: string;
  lastLoginAt?: string;
  createdByAdminName?: string;
  phoneNumber?: string;
}

export interface CreateAdminPayload {
  name: string;
  email: string;
  role: AdminRole;
  additionalRoles?: AdminRole[];
  department: string;
  temporaryPassword?: string;
  privileges: string[];
  phoneNumber?: string;
}

export interface UpdateAdminPayload {
  name?: string;
  role?: AdminRole;
  additionalRoles?: AdminRole[];
  department?: string;
  status?: 'active' | 'suspended' | 'deactivated';
  privileges?: string[];
  phoneNumber?: string;
}
