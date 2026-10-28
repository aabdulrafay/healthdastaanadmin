import { AuditAction, AuditActor, AuditLog, AuditFilterParams } from '@/types/audit';
import { apiClient } from './apiClient';

interface RawBackendAuditLog {
  id: string;
  createdAt?: string;
  timestamp?: string;
  actionCode?: string;
  action?: string;
  description?: string;
  reason?: string;
  actorUserId?: string;
  actorName?: string;
  actorEmail?: string;
  actor?: AuditActor;
  resourceType?: string;
  targetResource?: string;
  resourceId?: string;
  targetId?: string;
  severity?: 'info' | 'warning' | 'critical';
  status?: 'success' | 'failure' | 'warning';
  ipAddress?: string;
  userAgent?: string;
}

interface BackendAuditResponse {
  items?: RawBackendAuditLog[];
  logs?: AuditLog[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  total?: number;
}

function normalizeAuditLog(raw: RawBackendAuditLog): AuditLog {
  const action: AuditAction =
    (raw.actionCode as AuditAction) || (raw.action as AuditAction) || 'ADMIN_CREATED';

  const actor: AuditActor = raw.actor || {
    id: raw.actorUserId || 'system',
    name: raw.actorName || 'System Admin',
    email: raw.actorEmail || 'admin@healthdastaan.com',
    role: 'admin',
    ipAddress: raw.ipAddress || '127.0.0.1',
    userAgent: raw.userAgent,
  };

  return {
    id: raw.id,
    timestamp: raw.createdAt || raw.timestamp || new Date().toISOString(),
    action,
    description:
      raw.description ||
      raw.reason ||
      `${raw.actionCode || 'Action'} executed on ${raw.resourceType || 'resource'}`,
    actor,
    targetResource: raw.resourceType || raw.targetResource || 'system',
    targetId: raw.resourceId || raw.targetId,
    severity: raw.severity || 'info',
    status: raw.status || 'success',
  };
}

export const auditService = {
  async getAuditLogs(params: AuditFilterParams = {}): Promise<{ logs: AuditLog[]; total: number }> {
    try {
      const query = new URLSearchParams();
      if (params.action && params.action !== 'all') query.set('actionCode', params.action);
      if (params.severity && params.severity !== 'all') query.set('severity', params.severity);
      if (params.status && params.status !== 'all') query.set('status', params.status);
      if (params.actorSearch) query.set('actorUserId', params.actorSearch);

      const res = await apiClient<BackendAuditResponse>(`/admin/audit-logs?${query.toString()}`);

      if (res && Array.isArray(res.items)) {
        const logs = res.items.map(normalizeAuditLog);
        return {
          logs,
          total: res.meta?.total ?? logs.length,
        };
      }

      if (res && Array.isArray(res.logs)) {
        return {
          logs: res.logs,
          total: res.total ?? res.logs.length,
        };
      }

      return { logs: [], total: 0 };
    } catch {
      return { logs: [], total: 0 };
    }
  },

  async logAction(newLog: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    return {
      ...newLog,
      id: `aud_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
  },
};
