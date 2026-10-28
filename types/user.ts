export type UserRole = 'patient' | 'practitioner' | 'both';

export type UserStatus = 'active' | 'suspended' | 'blocked';

export type VerificationStatus = 'verified' | 'pending' | 'rejected' | 'unverified';

export interface UserSession {
  id: string;
  device: string;
  browser: string;
  ipAddress: string;
  location: string;
  lastActiveAt: string;
  isCurrent: boolean;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  verificationStatus: VerificationStatus;
  pmdcNumber?: string;
  specialization?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  avatarUrl?: string;
  activeSessionsCount: number;
  createdAt: string;
  lastActiveAt: string;
  blockedReason?: string;
  blockedAt?: string;
  suspendedUntil?: string;
  suspensionReason?: string;
  metadata?: {
    totalAppointments?: number;
    prescriptionsCount?: number;
    dualRoleActivatedAt?: string;
  };
}

export interface UserFilterParams {
  search?: string;
  role?: string;
  status?: string;
  verificationStatus?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
