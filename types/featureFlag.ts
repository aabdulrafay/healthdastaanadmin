export type FlagCategory =
  | 'telehealth'
  | 'ai_diagnostics'
  | 'billing'
  | 'onboarding'
  | 'auth'
  | 'infrastructure'
  | 'compliance';

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  category: FlagCategory;
  isEnabled: boolean;
  affectedApis: string[];
  disabledReason?: string;
  lastToggledBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  lastToggledAt: string;
  rolloutPercentage: number;
  environment: 'production' | 'staging';
  criticality: 'low' | 'medium' | 'high' | 'critical';
}

export interface ToggleFlagPayload {
  flagKey: string;
  isEnabled: boolean;
  reason: string;
  adminId: string;
  adminName: string;
}
