import {
  Organization,
  OrganizationFilterParams,
  OrganizationMember,
  OrganizationApiClient,
  OrganizationStatus,
  OrganizationType,
  StaffRole,
  UpdateOrganizationStatusPayload,
} from '@/types/organization';
import { apiClient } from './apiClient';

interface RawBackendMember {
  id: string;
  organizationId?: string;
  organization_id?: string;
  userId?: string;
  user_id?: string;
  staffRole?: string;
  staff_role?: string;
  role?: string;
  status?: string;
  createdAt?: string;
  created_at?: string;
  user?: {
    id?: string;
    fullName?: string;
    givenName?: string;
    familyName?: string;
    email?: string;
    phone?: string;
  };
}

interface RawBackendApiClient {
  id: string;
  organizationId?: string;
  organization_id?: string;
  name: string;
  clientId?: string;
  client_id?: string;
  isRevoked?: boolean;
  is_revoked?: boolean;
  revokedAt?: string | null;
  revoked_at?: string | null;
  createdAt?: string;
  created_at?: string;
}

interface RawBackendOrganization {
  id: string;
  name: string;
  typeCode?: OrganizationType;
  type_code?: OrganizationType;
  status: OrganizationStatus;
  officialEmail?: string;
  official_email?: string;
  email?: string;
  phone?: string;
  address?: string;
  registrationNumber?: string;
  registration_number?: string;
  isIndividual?: boolean;
  is_individual?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  rejectionReason?: string;
  rejection_reason?: string;
  members?: RawBackendMember[];
  organization_members?: RawBackendMember[];
  apiClients?: RawBackendApiClient[];
  api_clients?: RawBackendApiClient[];
  _count?: {
    members?: number;
    apiClients?: number;
    api_clients?: number;
  };
}

interface BackendOrganizationListResponse {
  items?: RawBackendOrganization[];
  organizations?: RawBackendOrganization[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  total?: number;
}

function normalizeMember(raw: RawBackendMember): OrganizationMember {
  const user = raw.user;
  const fullName =
    user?.fullName ||
    (user?.givenName && user?.familyName ? `${user.givenName} ${user.familyName}`.trim() : '') ||
    user?.email ||
    'Member';

  const staffRole: StaffRole =
    raw.staffRole === 'owner' || raw.staff_role === 'owner' || raw.role === 'owner'
      ? 'owner'
      : raw.staffRole === 'admin' || raw.staff_role === 'admin' || raw.role === 'admin'
        ? 'admin'
        : 'staff';

  return {
    id: raw.id,
    organizationId: raw.organizationId || raw.organization_id || '',
    userId: raw.userId || raw.user_id || user?.id || '',
    fullName,
    email: user?.email,
    phone: user?.phone,
    staffRole,
    status: raw.status === 'inactive' ? 'inactive' : 'active',
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
  };
}

function normalizeApiClient(raw: RawBackendApiClient): OrganizationApiClient {
  return {
    id: raw.id,
    organizationId: raw.organizationId || raw.organization_id || '',
    name: raw.name || 'System API Client',
    clientId: raw.clientId || raw.client_id || raw.id,
    isRevoked: Boolean(raw.isRevoked || raw.is_revoked || raw.revokedAt || raw.revoked_at),
    revokedAt: raw.revokedAt || raw.revoked_at || null,
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
  };
}

function normalizeOrganization(raw: RawBackendOrganization): Organization {
  const typeCode: OrganizationType =
    raw.typeCode ||
    raw.type_code ||
    (raw.isIndividual || raw.is_individual ? 'clinic' : 'hospital');

  const membersRaw = raw.members || raw.organization_members || [];
  const members = membersRaw.map(normalizeMember);

  const apiClientsRaw = raw.apiClients || raw.api_clients || [];
  const apiClients = apiClientsRaw.map(normalizeApiClient);

  return {
    id: raw.id,
    name: raw.name,
    typeCode,
    status: raw.status || 'pending',
    officialEmail: raw.officialEmail || raw.official_email || raw.email || '',
    phone: raw.phone || '',
    address: raw.address || '',
    registrationNumber: raw.registrationNumber || raw.registration_number || '',
    isIndividual: Boolean(raw.isIndividual || raw.is_individual),
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.updated_at,
    rejectionReason: raw.rejectionReason || raw.rejection_reason,
    members,
    apiClients,
    membersCount: raw._count?.members ?? members.length,
    apiClientsCount: raw._count?.apiClients ?? raw._count?.api_clients ?? apiClients.length,
  };
}

export const organizationService = {
  async getOrganizations(
    params: OrganizationFilterParams = {}
  ): Promise<{ organizations: Organization[]; total: number }> {
    try {
      const query = new URLSearchParams();
      if (params.search) query.set('search', params.search);
      if (params.type && params.type !== 'all') query.set('type', params.type);
      if (params.status && params.status !== 'all') query.set('status', params.status);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));

      const res = await apiClient<BackendOrganizationListResponse | RawBackendOrganization[]>(
        `/admin/organizations?${query.toString()}`
      );

      if (Array.isArray(res)) {
        const organizations = res.map(normalizeOrganization);
        return {
          organizations,
          total: organizations.length,
        };
      }

      if (res && Array.isArray(res.items)) {
        const organizations = res.items.map(normalizeOrganization);
        return {
          organizations,
          total: res.meta?.total ?? organizations.length,
        };
      }

      if (res && Array.isArray(res.organizations)) {
        const organizations = res.organizations.map(normalizeOrganization);
        return {
          organizations,
          total: res.total ?? organizations.length,
        };
      }

      return { organizations: [], total: 0 };
    } catch {
      return { organizations: [], total: 0 };
    }
  },

  async getOrganizationById(id: string): Promise<Organization | null> {
    try {
      const res = await apiClient<
        RawBackendOrganization | { organization: RawBackendOrganization }
      >(`/admin/organizations/${id}`);

      const raw =
        'organization' in res && res.organization
          ? res.organization
          : (res as RawBackendOrganization);

      return normalizeOrganization(raw);
    } catch {
      return null;
    }
  },

  async updateOrganizationStatus(
    id: string,
    payload: UpdateOrganizationStatusPayload
  ): Promise<Organization> {
    const res = await apiClient<RawBackendOrganization | { organization: RawBackendOrganization }>(
      `/admin/organizations/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status: payload.status,
          reason: payload.reason,
        }),
      }
    );

    const raw =
      'organization' in res && res.organization
        ? res.organization
        : (res as RawBackendOrganization);

    return normalizeOrganization(raw);
  },
};
