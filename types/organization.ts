export type OrganizationType = 'hospital' | 'clinic' | 'laboratory' | 'other';

export type OrganizationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';

export type StaffRole = 'owner' | 'admin' | 'staff';

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  fullName?: string;
  email?: string;
  phone?: string;
  staffRole: StaffRole;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface OrganizationApiClient {
  id: string;
  organizationId: string;
  name: string;
  clientId: string;
  isRevoked: boolean;
  revokedAt?: string | null;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  typeCode: OrganizationType;
  status: OrganizationStatus;
  officialEmail: string;
  phone: string;
  address?: string;
  registrationNumber?: string;
  isIndividual: boolean;
  createdAt: string;
  updatedAt?: string;
  rejectionReason?: string;
  members?: OrganizationMember[];
  apiClients?: OrganizationApiClient[];
  membersCount?: number;
  apiClientsCount?: number;
}

export interface OrganizationFilterParams {
  search?: string;
  type?: OrganizationType | 'all';
  status?: OrganizationStatus | 'all';
  page?: number;
  limit?: number;
}

export interface UpdateOrganizationStatusPayload {
  status: OrganizationStatus;
  reason?: string;
}
