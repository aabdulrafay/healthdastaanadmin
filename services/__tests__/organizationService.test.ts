import { describe, it, expect, beforeEach, vi } from 'vitest';
import { organizationService } from '../organizationService';
import * as apiClientModule from '../apiClient';

describe('organizationService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('normalizes backend organization list and counts correctly', async () => {
    vi.spyOn(apiClientModule, 'apiClient').mockResolvedValueOnce({
      items: [
        {
          id: 'org_001',
          name: 'Shifa International Hospital',
          type_code: 'hospital',
          status: 'verified',
          official_email: 'info@shifa.com',
          phone: '+92518463000',
          registration_number: 'PMDC-HOSP-098',
          is_individual: false,
          created_at: '2026-01-15T08:00:00Z',
          _count: { members: 12, apiClients: 3 },
        },
        {
          id: 'org_002',
          name: 'Dr. Tariq Mahmood Practice',
          typeCode: 'clinic',
          status: 'pending',
          officialEmail: 'dr.tariq@example.com',
          phone: '+923001234567',
          isIndividual: true,
          createdAt: '2026-02-01T10:00:00Z',
        },
      ],
      meta: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });

    const res = await organizationService.getOrganizations();

    expect(res.total).toBe(2);
    expect(res.organizations).toHaveLength(2);

    const hospital = res.organizations[0];
    expect(hospital.name).toBe('Shifa International Hospital');
    expect(hospital.typeCode).toBe('hospital');
    expect(hospital.status).toBe('verified');
    expect(hospital.isIndividual).toBe(false);
    expect(hospital.membersCount).toBe(12);
    expect(hospital.apiClientsCount).toBe(3);

    const clinic = res.organizations[1];
    expect(clinic.isIndividual).toBe(true);
    expect(clinic.typeCode).toBe('clinic');
    expect(clinic.status).toBe('pending');
  });

  it('retrieves detailed organization with members and OAuth2 API clients', async () => {
    vi.spyOn(apiClientModule, 'apiClient').mockResolvedValueOnce({
      id: 'org_001',
      name: 'National Telehealth Hospital',
      typeCode: 'hospital',
      status: 'verified',
      members: [
        {
          id: 'mem_01',
          userId: 'usr_01',
          staffRole: 'owner',
          status: 'active',
          user: {
            fullName: 'Dr. Ali Raza',
            email: 'ali.raza@hospital.com',
          },
        },
      ],
      apiClients: [
        {
          id: 'cli_01',
          name: 'Epic EHR Connector',
          clientId: 'hd_client_epic_999',
          isRevoked: false,
          createdAt: '2026-02-10T12:00:00Z',
        },
      ],
    });

    const org = await organizationService.getOrganizationById('org_001');

    expect(org).not.toBeNull();
    expect(org?.name).toBe('National Telehealth Hospital');
    expect(org?.members).toHaveLength(1);
    expect(org?.members?.[0].staffRole).toBe('owner');
    expect(org?.members?.[0].fullName).toBe('Dr. Ali Raza');
    expect(org?.apiClients).toHaveLength(1);
    expect(org?.apiClients?.[0].clientId).toBe('hd_client_epic_999');
  });

  it('updates organization status with administrative reason', async () => {
    const patchSpy = vi.spyOn(apiClientModule, 'apiClient').mockResolvedValueOnce({
      id: 'org_002',
      name: 'Dr. Tariq Mahmood Practice',
      typeCode: 'clinic',
      status: 'verified',
    });

    const updated = await organizationService.updateOrganizationStatus('org_002', {
      status: 'verified',
      reason: 'Valid PMDC license and physical practice verified',
    });

    expect(patchSpy).toHaveBeenCalledWith('/admin/organizations/org_002/status', {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'verified',
        reason: 'Valid PMDC license and physical practice verified',
      }),
    });
    expect(updated.status).toBe('verified');
  });
});
