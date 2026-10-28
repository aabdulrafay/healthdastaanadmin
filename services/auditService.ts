import { AuditLog, AuditFilterParams } from '@/types/audit';
import { INITIAL_AUDIT_LOGS } from '@/lib/mockData';
import { apiClient } from './apiClient';

let auditLogsCache: AuditLog[] = [...INITIAL_AUDIT_LOGS];

export const auditService = {
  async getAuditLogs(params: AuditFilterParams = {}): Promise<{ logs: AuditLog[]; total: number }> {
    try {
      const query = new URLSearchParams();
      if (params.action) query.set('action', params.action);
      if (params.severity) query.set('severity', params.severity);
      if (params.actorSearch) query.set('actorSearch', params.actorSearch);
      if (params.status) query.set('status', params.status);

      const res = await apiClient<{ logs: AuditLog[]; total: number }>(`/admin/audit-logs?${query.toString()}`);
      return res;
    } catch {
      let filtered = [...auditLogsCache];

      if (params.action && params.action !== 'all') {
        filtered = filtered.filter((log) => log.action === params.action);
      }

      if (params.severity && params.severity !== 'all') {
        filtered = filtered.filter((log) => log.severity === params.severity);
      }

      if (params.actorSearch) {
        const q = params.actorSearch.toLowerCase();
        filtered = filtered.filter(
          (log) =>
            log.actor.name.toLowerCase().includes(q) ||
            log.actor.email.toLowerCase().includes(q) ||
            log.description.toLowerCase().includes(q) ||
            log.targetResource.toLowerCase().includes(q)
        );
      }

      return {
        logs: filtered,
        total: filtered.length,
      };
    }
  },

  async logAction(newLog: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> {
    const entry: AuditLog = {
      ...newLog,
      id: `aud_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    auditLogsCache.unshift(entry);
    return entry;
  },
};
