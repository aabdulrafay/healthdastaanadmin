export type AuditSeverity = 'info' | 'warning' | 'critical';

export type AuditAction =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_FAILED'
  | 'USER_BLOCKED'
  | 'USER_UNBLOCKED'
  | 'USER_SUSPENDED'
  | 'SESSION_REVOKED'
  | 'ALL_SESSIONS_REVOKED'
  | 'VERIFICATION_APPROVED'
  | 'VERIFICATION_REJECTED'
  | 'FEATURE_FLAG_ENABLED'
  | 'FEATURE_FLAG_DISABLED'
  | 'ADMIN_CREATED'
  | 'ADMIN_UPDATED'
  | 'ADMIN_DEACTIVATED'
  | 'ROLE_PERMISSIONS_MODIFIED'
  | 'EXPORT_SENSITIVE_DATA';

export interface AuditActor {
  id: string;
  name: string;
  email: string;
  role: string;
  ipAddress: string;
  userAgent?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: AuditActor;
  action: AuditAction;
  targetResource: string;
  targetId?: string;
  description: string;
  severity: AuditSeverity;
  status: 'success' | 'failure' | 'warning';
  metadata?: Record<string, unknown>;
}

export interface AuditFilterParams {
  action?: string;
  severity?: string;
  actorSearch?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  page?: number;
  limit?: number;
}
