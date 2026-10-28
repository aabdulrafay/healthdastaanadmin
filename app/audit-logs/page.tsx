'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { auditService } from '@/services/auditService';
import { AuditLog, AuditSeverity } from '@/types/audit';
import { formatDate, formatTimeAgo } from '@/lib/utils';
import {
  ShieldCheck,
  Download,
  Filter,
  Eye,
  Terminal,
  FileSpreadsheet,
  AlertTriangle,
  Info,
  Calendar,
  UserCheck,
} from 'lucide-react';

export default function AuditLogsPage() {
  const { success, error: toastError } = useToast();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [actionFilter, setActionFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected for payload inspection
  const [inspectLog, setInspectLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditService.getAuditLogs({
        action: actionFilter,
        severity: severityFilter,
        actorSearch: searchQuery,
      });
      setLogs(res.logs);
      setTotalCount(res.total);
    } catch {
      toastError('Error', 'Failed to retrieve system audit logs');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, severityFilter, searchQuery, toastError]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExportCsv = () => {
    if (logs.length === 0) return;

    const headers = ['ID', 'Timestamp', 'Actor Name', 'Actor Email', 'Action', 'Target Resource', 'Severity', 'Description'];
    const rows = logs.map((l) => [
      l.id,
      l.timestamp,
      `"${l.actor.name}"`,
      l.actor.email,
      l.action,
      `"${l.targetResource}"`,
      l.severity,
      `"${l.description.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HealthDastaan_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    success('Audit Export Generated', 'Downloaded compliance CSV report successfully.');
  };

  const getActionBadgeVariant = (action: string, severity: AuditSeverity) => {
    if (severity === 'critical' || action.includes('BLOCKED') || action.includes('REJECTED')) {
      return 'red';
    }
    if (severity === 'warning' || action.includes('DISABLED') || action.includes('SUSPENDED')) {
      return 'amber';
    }
    if (action.includes('APPROVED') || action.includes('ENABLED')) {
      return 'emerald';
    }
    return 'blue';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#002654] tracking-tight">
              Regulatory Audit Logs & Event Trace
            </h2>
            <p className="text-xs text-[#737781] mt-0.5">
              Cryptographically timestamped compliance records for clinical security and HIPAA/GDPR governance
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              leftIcon={<Download className="w-4 h-4 text-[#002654]" />}
              className="bg-white"
            >
              Export CSV Report
            </Button>
          </div>
        </div>

        {/* Filter Surface */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(11,60,120,0.05)] space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search by actor, target resource, or event description..."
            />

            <Select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              options={[
                { label: 'All Action Types', value: 'all' },
                { label: 'AUTH_LOGIN (Admin Logins)', value: 'AUTH_LOGIN' },
                { label: 'USER_BLOCKED (Account Blocks)', value: 'USER_BLOCKED' },
                { label: 'USER_SUSPENDED', value: 'USER_SUSPENDED' },
                { label: 'VERIFICATION_APPROVED (Doctor Clearances)', value: 'VERIFICATION_APPROVED' },
                { label: 'VERIFICATION_REJECTED', value: 'VERIFICATION_REJECTED' },
                { label: 'FEATURE_FLAG_DISABLED (API Outages)', value: 'FEATURE_FLAG_DISABLED' },
                { label: 'ALL_SESSIONS_REVOKED (Session Resets)', value: 'ALL_SESSIONS_REVOKED' },
                { label: 'ADMIN_CREATED', value: 'ADMIN_CREATED' },
              ]}
            />

            <Select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              options={[
                { label: 'All Severity Levels', value: 'all' },
                { label: 'Critical (High Risk & Dangerous Actions)', value: 'critical' },
                { label: 'Warning (Status changes & Disables)', value: 'warning' },
                { label: 'Info (Operational routine)', value: 'info' },
              ]}
            />
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(11,60,120,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F7F9FF] border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-[#434750]">
                  <th className="py-3.5 px-5">Timestamp</th>
                  <th className="py-3.5 px-4">Action Type</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Target Resource</th>
                  <th className="py-3.5 px-4">Severity</th>
                  <th className="py-3.5 px-4">Event Description</th>
                  <th className="py-3.5 px-5 text-right">Details</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#737781]">
                      Loading audit log trail...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#737781]">
                      No audit records found matching the filter parameters.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const variant = getActionBadgeVariant(log.action, log.severity);

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-[#F7F9FF]/80 transition-colors group"
                      >
                        {/* Timestamp */}
                        <td className="py-3 px-5 whitespace-nowrap">
                          <p className="font-semibold text-[#121D27]">{formatDate(log.timestamp)}</p>
                          <p className="text-[10px] text-[#737781]">{formatTimeAgo(log.timestamp)}</p>
                        </td>

                        {/* Action Badge */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge variant={variant as any} size="sm">
                            {log.action}
                          </Badge>
                        </td>

                        {/* Actor */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="font-bold text-[#121D27]">{log.actor.name}</p>
                          <p className="text-[10px] text-[#737781]">{log.actor.email}</p>
                          <p className="text-[10px] font-mono text-slate-400">IP: {log.actor.ipAddress}</p>
                        </td>

                        {/* Target Resource */}
                        <td className="py-3 px-4">
                          <code className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-[#002654] border border-slate-200">
                            {log.targetResource}
                          </code>
                        </td>

                        {/* Severity */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider ${
                              log.severity === 'critical'
                                ? 'text-[#BA1A1A]'
                                : log.severity === 'warning'
                                ? 'text-amber-700'
                                : 'text-[#00875A]'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                log.severity === 'critical'
                                  ? 'bg-[#BA1A1A]'
                                  : log.severity === 'warning'
                                  ? 'bg-amber-500'
                                  : 'bg-[#00875A]'
                              }`}
                            />
                            {log.severity}
                          </span>
                        </td>

                        {/* Description */}
                        <td className="py-3 px-4 max-w-xs truncate text-[#434750]">
                          {log.description}
                        </td>

                        {/* Details Modal Trigger */}
                        <td className="py-3 px-5 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[#002654] hover:bg-slate-100"
                            onClick={() => setInspectLog(log)}
                            title="Inspect Raw JSON Metadata"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Details Modal */}
        {inspectLog && (
          <Modal
            isOpen={!!inspectLog}
            onClose={() => setInspectLog(null)}
            title="Audit Event Cryptographic Record"
            subtitle={`Event ID: ${inspectLog.id}`}
            maxWidth="xl"
            footer={
              <Button variant="outline" size="sm" onClick={() => setInspectLog(null)}>
                Dismiss
              </Button>
            }
          >
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#F7F9FF] border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#002654]">{inspectLog.action}</span>
                  <Badge variant={getActionBadgeVariant(inspectLog.action, inspectLog.severity) as any}>
                    {inspectLog.severity.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-[#121D27] leading-relaxed">{inspectLog.description}</p>
                <div className="text-[11px] text-[#737781] pt-1">
                  Recorded at: <strong>{formatDate(inspectLog.timestamp)}</strong>
                </div>
              </div>

              {/* Actor & Host details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[#737781] block">Actor Identity</span>
                  <p className="font-bold text-[#121D27]">{inspectLog.actor.name}</p>
                  <p className="text-[11px] text-slate-500">{inspectLog.actor.email}</p>
                  <p className="text-[11px] text-[#006B5F] font-semibold">{inspectLog.actor.role}</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[#737781] block">Network Origin</span>
                  <p className="font-mono font-bold text-[#002654]">IP: {inspectLog.actor.ipAddress}</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    UA: {inspectLog.actor.userAgent || 'Clinical Client Console'}
                  </p>
                </div>
              </div>

              {/* Raw JSON Payload */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#737781]">
                  <Terminal className="w-3.5 h-3.5 text-[#00A896]" />
                  <span>Metadata JSON Payload</span>
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800">
                  {JSON.stringify(
                    {
                      id: inspectLog.id,
                      action: inspectLog.action,
                      actor: inspectLog.actor,
                      targetResource: inspectLog.targetResource,
                      metadata: inspectLog.metadata || {},
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AdminLayout>
  );
}
