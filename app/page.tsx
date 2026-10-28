'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { userService } from '@/services/userService';
import { verificationService } from '@/services/verificationService';
import { featureFlagService } from '@/services/featureFlagService';
import { auditService } from '@/services/auditService';
import { User } from '@/types/user';
import { PractitionerApplication } from '@/types/verification';
import { FeatureFlag } from '@/types/featureFlag';
import { AuditLog } from '@/types/audit';
import { useAuth } from '@/hooks/useAuth';
import { formatTimeAgo } from '@/lib/utils';
import {
  Users,
  Stethoscope,
  ShieldAlert,
  Sliders,
  ArrowRight,
  Activity,
  Server,
  Clock,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [verifications, setVerifications] = useState<PractitionerApplication[]>([]);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [usersRes, verifsRes, flagsRes, auditRes] = await Promise.all([
          userService.getUsers(),
          verificationService.getApplications(),
          featureFlagService.getFeatureFlags(),
          auditService.getAuditLogs({ limit: 6 }),
        ]);

        setUsers(usersRes.users);
        setVerifications(verifsRes);
        setFlags(flagsRes);
        setAuditLogs(auditRes.logs);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // Compute metrics
  const totalUsers = users.length;
  const patientCount = users.filter((u) => u.role === 'patient' || u.role === 'both').length;
  const doctorCount = users.filter((u) => u.role === 'practitioner' || u.role === 'both').length;
  const dualRoleCount = users.filter((u) => u.role === 'both').length;
  const pendingVerifications = verifications.filter((v) => v.status === 'pending');
  const blockedCount = users.filter(
    (u) => u.status === 'blocked' || u.status === 'suspended'
  ).length;
  const activeFlagsCount = flags.filter((f) => f.isEnabled).length;

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Welcome & System Status Banner */}
        <div className="relative bg-gradient-to-r from-[#002654] via-[#0B3C78] to-[#006B5F] rounded-2xl p-6 sm:p-8 text-white shadow-xl shadow-[#002654]/10 overflow-hidden">
          {/* Subtle luminous glass orb */}
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#0ED2B0]/20 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-[#8EF3E2] border border-white/15">
                <span className="w-2 h-2 rounded-full bg-[#0ED2B0] animate-pulse" />
                <span>HealthDastaan Clinical Mesh: Operational</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Welcome, {user?.name || 'Administrator'}
              </h2>
              <p className="text-xs sm:text-sm text-[#CADBF9] max-w-xl leading-relaxed">
                Platform operations are running in high-availability mode. You have{' '}
                <strong className="text-white underline font-semibold">
                  {pendingVerifications.length} doctor credential application
                  {pendingVerifications.length === 1 ? '' : 's'}
                </strong>{' '}
                awaiting PMDC verification and clinical review.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/verification">
                <Button
                  variant="secondary"
                  size="md"
                  className="bg-white text-[#002654] border-transparent hover:bg-[#EDF4FF] shadow-md font-bold"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Review Verifications ({pendingVerifications.length})
                </Button>
              </Link>
              <Link href="/feature-flags">
                <Button
                  variant="outline"
                  size="md"
                  className="bg-white/10 text-white border-white/30 hover:bg-white/20"
                  leftIcon={<Sliders className="w-4 h-4" />}
                >
                  API Control
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Core Overview Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Total Registered Users"
            value={totalUsers}
            subtitle={`${doctorCount} Doctors • ${patientCount} Patients • ${dualRoleCount} Dual-Role`}
            icon={<Users className="w-6 h-6" />}
            accent="blue"
            trend={{ value: '+14% this week', isPositive: true }}
          />

          <StatCard
            title="Pending Doctor Verifications"
            value={pendingVerifications.length}
            subtitle="Requires PMDC license check"
            icon={<Stethoscope className="w-6 h-6" />}
            accent="cyan"
            trend={{ value: 'Urgent queue', isPositive: false }}
          />

          <StatCard
            title="Blocked / Suspended"
            value={blockedCount}
            subtitle="Violations & fraudulent attempts"
            icon={<ShieldAlert className="w-6 h-6" />}
            accent="red"
            trend={{ value: 'Safety enforced', isPositive: true }}
          />

          <StatCard
            title="Active Feature Flags"
            value={`${activeFlagsCount} / ${flags.length}`}
            subtitle="API endpoints enabled"
            icon={<Sliders className="w-6 h-6" />}
            accent="emerald"
            trend={{ value: '1 maintenance flag', isPositive: true }}
          />
        </div>

        {/* Two-Column Telemetry & Operational Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Pending Verifications Queue & Telemetry */}
          <div className="lg:col-span-2 space-y-8">
            {/* Pending Doctor Applications Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(11,60,120,0.05)] overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-[#F7F9FF]/40">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#00A896]/15 text-[#006B5F]">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#002654]">
                      Pending Practitioner Verifications
                    </h3>
                    <p className="text-xs text-[#737781]">
                      Clinicians awaiting identity and medical degree authorization
                    </p>
                  </div>
                </div>
                <Link
                  href="/verification"
                  className="text-xs font-bold text-[#00A896] hover:text-[#006B5F] flex items-center gap-1 hover:underline"
                >
                  <span>View All Queue</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {pendingVerifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-[#737781]">
                    No pending practitioner applications in queue.
                  </div>
                ) : (
                  pendingVerifications.slice(0, 3).map((app) => (
                    <div
                      key={app.id}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-[#121D27]">{app.fullName}</p>
                          <Badge variant="pending" size="sm" dot>
                            Awaiting Review
                          </Badge>
                        </div>
                        <p className="text-xs text-[#434750]">
                          <strong className="text-[#002654]">PMDC #:</strong> {app.pmdcNumber} •{' '}
                          <span className="font-medium text-[#00A896]">{app.specialization}</span>
                        </p>
                        <p className="text-xs text-[#737781]">
                          {app.clinicHospitalName} • Submitted {formatTimeAgo(app.submittedAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link href="/verification">
                          <Button variant="outline" size="sm" className="text-xs font-semibold">
                            Inspect Documents ({app.documents.length})
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Clinical Telemetry & Health Tracker */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_2px_8px_-2px_rgba(11,60,120,0.05)] space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#00875A]/10 text-[#00875A]">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#002654]">
                      System Health & API Telemetry
                    </h3>
                    <p className="text-xs text-[#737781]">
                      Real-time response latencies across health data services
                    </p>
                  </div>
                </div>
                <Badge variant="emerald" size="sm" dot>
                  Healthy (99.98% SLA)
                </Badge>
              </div>

              <div className="space-y-4">
                {/* Telemetry Item 1 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#121D27]">
                      WebRTC Encrypted Teleconsultation Relay
                    </span>
                    <span className="text-[#00875A] font-bold">18ms • Optimal</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#002654] via-[#00A896] to-[#00875A] w-[95%]" />
                  </div>
                </div>

                {/* Telemetry Item 2 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#121D27]">
                      Prescription AI OCR Neural Parser
                    </span>
                    <span className="text-[#00A896] font-bold">42ms • Stable</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#002654] to-[#00A896] w-[82%]" />
                  </div>
                </div>

                {/* Telemetry Item 3 */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#121D27]">
                      JazzCash / EasyPaisa Payment Rails
                    </span>
                    <span className="text-amber-600 font-bold">Maintenance Hold</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-amber-500 w-[20%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Recent Audit Stream & Admin Shortcuts */}
          <div className="space-y-8">
            {/* Audit Stream */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(11,60,120,0.05)] p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#002654]" />
                  <h3 className="text-sm font-bold text-[#002654]">Recent Audit Activity</h3>
                </div>
                <Link
                  href="/audit-logs"
                  className="text-xs font-semibold text-[#00A896] hover:underline"
                >
                  Logs
                </Link>
              </div>

              <div className="space-y-3.5">
                {auditLogs.slice(0, 5).map((log) => (
                  <div
                    key={log.id}
                    className="text-xs space-y-1 border-b border-slate-50 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#121D27]">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-[#737781]">
                        {formatTimeAgo(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-[#434750] line-clamp-2 leading-relaxed">{log.description}</p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[10px] text-slate-500">
                        Actor: <strong className="text-[#002654]">{log.actor.name}</strong>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Administrative Shortcuts */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(11,60,120,0.05)] p-5 space-y-3">
              <h3 className="text-sm font-bold text-[#002654]">Quick Operations</h3>
              <div className="space-y-2">
                <Link
                  href="/users"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-[#002654] hover:bg-[#EDF4FF] transition-all text-xs font-semibold text-[#121D27]"
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#002654]" />
                    <span>Manage User Accounts & Block Lists</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>

                <Link
                  href="/feature-flags"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-[#00A896] hover:bg-slate-50 transition-all text-xs font-semibold text-[#121D27]"
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#00A896]" />
                    <span>Control API Switches & Feature Flags</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>

                <Link
                  href="/audit-logs"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:border-[#00875A] hover:bg-slate-50 transition-all text-xs font-semibold text-[#121D27]"
                >
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-[#00875A]" />
                    <span>Export Compliance & Audit Reports</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
