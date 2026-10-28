import { PractitionerApplication, ApplicationStatus } from '@/types/verification';
import { INITIAL_VERIFICATIONS } from '@/lib/mockData';
import { apiClient } from './apiClient';

let verificationsCache: PractitionerApplication[] = [...INITIAL_VERIFICATIONS];

export const verificationService = {
  async getApplications(statusFilter?: string): Promise<PractitionerApplication[]> {
    try {
      const endpoint = statusFilter && statusFilter !== 'all'
        ? `/admin/practitioner-verifications?status=${statusFilter}`
        : '/admin/practitioner-verifications';
      const res = await apiClient<{ applications: PractitionerApplication[] }>(endpoint);
      return res.applications;
    } catch {
      if (statusFilter && statusFilter !== 'all') {
        return verificationsCache.filter((app) => app.status === statusFilter);
      }
      return [...verificationsCache];
    }
  },

  async getApplicationById(id: string): Promise<PractitionerApplication | null> {
    try {
      const res = await apiClient<{ application: PractitionerApplication }>(
        `/admin/practitioner-verifications/${id}`
      );
      return res.application;
    } catch {
      return verificationsCache.find((app) => app.id === id) || null;
    }
  },

  async approveApplication(
    id: string,
    adminName: string,
    notes?: string
  ): Promise<PractitionerApplication> {
    try {
      const res = await apiClient<{ application: PractitionerApplication }>(
        `/admin/practitioner-verifications/${id}/approve`,
        {
          method: 'POST',
          body: JSON.stringify({ adminName, notes }),
        }
      );
      return res.application;
    } catch {
      const index = verificationsCache.findIndex((app) => app.id === id);
      if (index === -1) throw new Error('Verification application not found.');

      const updated: PractitionerApplication = {
        ...verificationsCache[index],
        status: 'approved',
        reviewedAt: new Date().toISOString(),
        reviewedByAdminName: adminName,
        notes: notes || verificationsCache[index].notes,
      };

      verificationsCache[index] = updated;
      return updated;
    }
  },

  async rejectApplication(
    id: string,
    reason: string,
    category: 'invalid_pmdc' | 'expired_credentials' | 'name_mismatch' | 'forged_document' | 'other',
    adminName: string
  ): Promise<PractitionerApplication> {
    try {
      const res = await apiClient<{ application: PractitionerApplication }>(
        `/admin/practitioner-verifications/${id}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({ reason, category, adminName }),
        }
      );
      return res.application;
    } catch {
      const index = verificationsCache.findIndex((app) => app.id === id);
      if (index === -1) throw new Error('Verification application not found.');

      const updated: PractitionerApplication = {
        ...verificationsCache[index],
        status: 'rejected',
        reviewedAt: new Date().toISOString(),
        reviewedByAdminName: adminName,
        rejectionReason: reason,
        rejectionCategory: category,
      };

      verificationsCache[index] = updated;
      return updated;
    }
  },
};
