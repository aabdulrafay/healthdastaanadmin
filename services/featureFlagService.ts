import { FeatureFlag, ToggleFlagPayload } from '@/types/featureFlag';
import { INITIAL_FEATURE_FLAGS } from '@/lib/mockData';
import { apiClient } from './apiClient';

const flagsCache: FeatureFlag[] = [...INITIAL_FEATURE_FLAGS];

export const featureFlagService = {
  async getFeatureFlags(): Promise<FeatureFlag[]> {
    try {
      const res = await apiClient<{ flags: FeatureFlag[] }>('/admin/feature-flags');
      return res.flags;
    } catch {
      return [...flagsCache];
    }
  },

  async toggleFeatureFlag(payload: ToggleFlagPayload): Promise<FeatureFlag> {
    try {
      const res = await apiClient<{ flag: FeatureFlag }>(
        `/admin/feature-flags/${payload.flagKey}/toggle`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      return res.flag;
    } catch {
      const index = flagsCache.findIndex((f) => f.key === payload.flagKey);
      if (index === -1) throw new Error('Feature flag not found');

      const updated: FeatureFlag = {
        ...flagsCache[index],
        isEnabled: payload.isEnabled,
        disabledReason: payload.isEnabled ? undefined : payload.reason,
        lastToggledAt: new Date().toISOString(),
        lastToggledBy: {
          id: payload.adminId,
          name: payload.adminName,
          email: payload.adminName.toLowerCase().replace(/\s+/g, '.') + '@healthdastaan.com',
          role: 'admin',
        },
      };

      flagsCache[index] = updated;
      return updated;
    }
  },
};
