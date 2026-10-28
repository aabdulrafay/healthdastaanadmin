export type AdminRole =
  'super_admin' | 'verification_admin' | 'support_admin' | 'compliance_admin' | 'api_control_admin';

export interface UserOrganizationMembership {
  id: string;
  name: string;
  typeCode: 'hospital' | 'clinic' | 'laboratory' | 'other';
  role: 'owner' | 'admin' | 'staff';
  status: 'pending' | 'verified' | 'rejected' | 'suspended';
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  additionalRoles?: AdminRole[];
  department?: string;
  avatarUrl?: string;
  organizations?: UserOrganizationMembership[];
  mustChangePassword?: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

export interface AuthState {
  user: AdminUser | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  user: AdminUser;
  tokens: AuthTokens;
  message?: string;
}
