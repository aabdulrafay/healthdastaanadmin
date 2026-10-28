import { FeatureFlag, FlagCategory, ToggleFlagPayload } from '@/types/featureFlag';
import { apiClient } from './apiClient';

interface RawBackendFeatureFlag {
  id?: string;
  key: string;
  name?: string;
  description?: string;
  isEnabled: boolean;
  disabledReason?: string | null;
  disabledAt?: string | null;
  category?: FlagCategory;
  affectedApis?: string[];
  lastToggledAt?: string;
  lastToggledBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  rolloutPercentage?: number;
  environment?: 'production' | 'staging';
  criticality?: 'low' | 'medium' | 'high' | 'critical';
}

function normalizeFeatureFlag(raw: RawBackendFeatureFlag): FeatureFlag {
  let category: FlagCategory = 'infrastructure';
  if (raw.key.startsWith('auth')) category = 'auth';
  else if (raw.key.startsWith('phr')) category = 'compliance';
  else if (raw.key.startsWith('billing')) category = 'billing';
  else if (raw.category) category = raw.category;

  return {
    id: raw.id || raw.key,
    key: raw.key,
    name: raw.name || raw.key.replace(/[._]/g, ' ').toUpperCase(),
    description: raw.description || `Controls access to ${raw.key} feature`,
    category,
    isEnabled: Boolean(raw.isEnabled),
    affectedApis: raw.affectedApis || [`/v1/${raw.key.replace('.', '/')}`],
    disabledReason: raw.disabledReason || undefined,
    lastToggledAt: raw.disabledAt || raw.lastToggledAt || new Date().toISOString(),
    lastToggledBy: raw.lastToggledBy || {
      id: 'adm_system',
      name: 'System Admin',
      email: 'admin@healthdastaan.com',
      role: 'api_control_admin',
    },
    rolloutPercentage: raw.rolloutPercentage ?? 100,
    environment: raw.environment || 'production',
    criticality: raw.criticality || 'high',
  };
}

export const featureFlagService = {
  async getFeatureFlags(): Promise<FeatureFlag[]> {
    try {
      const res = await apiClient<
        | RawBackendFeatureFlag[]
        | { flags?: RawBackendFeatureFlag[]; items?: RawBackendFeatureFlag[] }
      >('/admin/feature-flags');

      if (Array.isArray(res)) {
        return res.map(normalizeFeatureFlag);
      }
      if (res && Array.isArray(res.flags)) {
        return res.flags.map(normalizeFeatureFlag);
      }
      if (res && Array.isArray(res.items)) {
        return res.items.map(normalizeFeatureFlag);
      }
      return [];
    } catch {
      return [];
    }
  },

  async toggleFeatureFlag(payload: ToggleFlagPayload): Promise<FeatureFlag> {
    const res = await apiClient<RawBackendFeatureFlag | { flag?: RawBackendFeatureFlag }>(
      `/admin/feature-flags/${encodeURIComponent(payload.flagKey)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          isEnabled: payload.isEnabled,
          reason: payload.reason || 'Admin console update',
        }),
      }
    );

    const raw = 'flag' in res && res.flag ? res.flag : (res as RawBackendFeatureFlag);
    return normalizeFeatureFlag(raw);
  },
};
