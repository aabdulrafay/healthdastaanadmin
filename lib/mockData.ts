import { User } from '@/types/user';
import { PractitionerApplication } from '@/types/verification';
import { FeatureFlag } from '@/types/featureFlag';
import { AuditLog } from '@/types/audit';
import { AdminAccount } from '@/types/admin';

/**
 * Empty schema datasets.
 * All application modules now query live data directly via backend APIs.
 */
export const INITIAL_USERS: User[] = [];
export const INITIAL_VERIFICATIONS: PractitionerApplication[] = [];
export const INITIAL_FEATURE_FLAGS: FeatureFlag[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
export const INITIAL_ADMINS: AdminAccount[] = [];
