'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { featureFlagService } from '@/services/featureFlagService';
import { auditService } from '@/services/auditService';
import { FeatureFlag } from '@/types/featureFlag';
import { formatDate, formatTimeAgo } from '@/lib/utils';
import { AlertTriangle, History, Terminal } from 'lucide-react';

export default function FeatureFlagsPage() {
  const { user: currentAdmin } = useAuth();
  const { success, error: toastError, warning } = useToast();

  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Toggle Confirm Dialog
  const [toggleDialog, setToggleDialog] = useState<{
    isOpen: boolean;
    flag: FeatureFlag | null;
    targetState: boolean;
  }>({
    isOpen: false,
    flag: null,
    targetState: false,
  });
  const [isToggling, setIsToggling] = useState(false);

  // Inspection Modal
  const [inspectFlag, setInspectFlag] = useState<FeatureFlag | null>(null);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try {
      const data = await featureFlagService.getFeatureFlags();
      setFlags(data);
    } catch {
      toastError('Error', 'Failed to retrieve feature flags from server');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const handleToggleRequest = (flag: FeatureFlag, targetState: boolean) => {
    if (!targetState) {
      // Disabling requires confirmation and reason
      setToggleDialog({
        isOpen: true,
        flag,
        targetState: false,
      });
    } else {
      // Enabling can be executed directly or with light confirm
      executeToggle(flag, true, 'Enabled via administrative console.');
    }
  };

  const executeToggle = async (flag: FeatureFlag, targetState: boolean, reason: string) => {
    setIsToggling(true);
    try {
      const updated = await featureFlagService.toggleFeatureFlag({
        flagKey: flag.key,
        isEnabled: targetState,
        reason,
        adminId: currentAdmin?.id || 'adm_admin',
        adminName: currentAdmin?.name || 'Admin',
      });

      setFlags((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));

      await auditService.logAction({
        actor: {
          id: currentAdmin?.id || 'admin',
          name: currentAdmin?.name || 'Admin',
          email: currentAdmin?.email || 'admin@healthdastaan.com',
          role: currentAdmin?.role || 'api_control_admin',
          ipAddress: '127.0.0.1',
        },
        action: targetState ? 'FEATURE_FLAG_ENABLED' : 'FEATURE_FLAG_DISABLED',
        targetResource: `${flag.key}:${flag.name}`,
        description: targetState
          ? `Enabled API Feature Flag "${flag.name}".`
          : `Disabled API Feature Flag "${flag.name}". Reason: ${reason}`,
        severity: flag.criticality === 'critical' ? 'critical' : 'warning',
        status: targetState ? 'success' : 'warning',
        metadata: {
          flagKey: flag.key,
          previousState: flag.isEnabled,
          newState: targetState,
          reason,
          affectedApis: flag.affectedApis,
        },
      });

      if (targetState) {
        success('Feature Flag Enabled', `${flag.name} is now active across all API gateways.`);
      } else {
        warning(
          'API Endpoint Disabled',
          `${flag.name} has been taken offline. Reason: "${reason}"`
        );
      }

      setToggleDialog({ isOpen: false, flag: null, targetState: false });
    } catch {
      toastError('Error', 'Failed to update feature flag state');
    } finally {
      setIsToggling(false);
    }
  };

  const filteredFlags = flags.filter((flag) => {
    const matchesSearch =
      !searchQuery ||
      flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.affectedApis.some((api) => api.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || flag.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const activeCount = flags.filter((f) => f.isEnabled).length;
  const disabledCount = flags.filter((f) => !f.isEnabled).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#002654] tracking-tight">
              Feature Flags & API Endpoint Control
            </h2>
            <p className="text-xs text-[#737781] mt-0.5">
              Live runtime feature toggles, endpoint kill-switches, and deployment rollout gates
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
              Active: <strong>{activeCount}</strong>
            </span>
            {disabledCount > 0 && (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
                Disabled / Maintenance: <strong>{disabledCount}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(11,60,120,0.05)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search flag by name, key, or affected API endpoint..."
            className="sm:w-96"
          />

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'telehealth', 'ai_diagnostics', 'billing', 'auth', 'infrastructure'].map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#002654] text-white shadow-sm'
                      : 'bg-slate-100 text-[#434750] hover:bg-slate-200'
                  }`}
                >
                  {cat === 'all' ? 'All Services' : cat.replace('_', ' ')}
                </button>
              )
            )}
          </div>
        </div>

        {/* Feature Flags Cards List */}
        <div className="grid grid-cols-1 gap-4">
          {loading ? (
            <div className="py-16 text-center text-xs text-[#737781] bg-white rounded-2xl border border-slate-200">
              Loading API feature flags...
            </div>
          ) : filteredFlags.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#737781] bg-white rounded-2xl border border-slate-200">
              No feature flags matching the query.
            </div>
          ) : (
            filteredFlags.map((flag) => {
              const isEnabled = flag.isEnabled;

              return (
                <div
                  key={flag.id}
                  className={`relative bg-white rounded-2xl p-6 border transition-all duration-200 ${
                    isEnabled
                      ? 'border-slate-200/90 shadow-[0_2px_8px_-2px_rgba(11,60,120,0.05)]'
                      : 'border-amber-300/80 bg-amber-50/20 shadow-sm'
                  }`}
                >
                  {/* Left-hand vertical accent bar */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${
                      isEnabled ? 'bg-[#00A896]' : 'bg-amber-500'
                    }`}
                  />

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pl-2">
                    {/* Flag Details */}
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="text-base font-bold text-[#002654]">{flag.name}</h3>

                        <code className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md bg-[#F7F9FF] border border-slate-200 text-[#0B3C78]">
                          {flag.key}
                        </code>

                        <Badge
                          variant={
                            flag.criticality === 'critical'
                              ? 'red'
                              : flag.criticality === 'high'
                                ? 'amber'
                                : 'blue'
                          }
                          size="sm"
                        >
                          {flag.criticality.toUpperCase()} SLA
                        </Badge>

                        <span className="text-[11px] font-semibold text-[#737781] uppercase tracking-wider">
                          {flag.category.replace('_', ' ')}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-[#434750] leading-relaxed">
                        {flag.description}
                      </p>

                      {/* Affected API Endpoints */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#737781] uppercase tracking-wider">
                          <Terminal className="w-3 h-3 text-[#00A896]" />
                          <span>Affected API Endpoints:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {flag.affectedApis.map((api, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {api}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* If Disabled: Reason & Who Disabled It */}
                      {!isEnabled && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-amber-800">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            <span>Disabled Reason / Operational Hold:</span>
                          </div>
                          <p className="text-amber-800 font-medium">
                            {flag.disabledReason || 'Scheduled Maintenance'}
                          </p>
                          <p className="text-[11px] text-amber-700">
                            Toggled by{' '}
                            <strong className="font-semibold">{flag.lastToggledBy.name}</strong> (
                            {flag.lastToggledBy.role.replace('_', ' ')}) •{' '}
                            {formatTimeAgo(flag.lastToggledAt)} ({formatDate(flag.lastToggledAt)})
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right: Switch Control & Inspection Trigger */}
                    <div className="flex lg:flex-col items-center lg:items-end justify-between gap-4 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xs font-bold text-[#121D27]">
                            {isEnabled ? 'Live / Enabled' : 'Offline / Disabled'}
                          </p>
                          <p className="text-[11px] text-[#737781]">
                            {isEnabled ? 'Serving requests' : 'Returning 503'}
                          </p>
                        </div>

                        <Switch
                          checked={isEnabled}
                          onChange={(target) => handleToggleRequest(flag, target)}
                          aria-label={`Toggle ${flag.name}`}
                        />
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-[#00A896] hover:bg-[#EDF4FF]"
                        onClick={() => setInspectFlag(flag)}
                        leftIcon={<History className="w-3.5 h-3.5" />}
                      >
                        Inspect Flag Metadata
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Dangerous Action Confirm Dialog (for Disabling) */}
        {toggleDialog.flag && (
          <ConfirmDialog
            isOpen={toggleDialog.isOpen}
            onClose={() => setToggleDialog({ isOpen: false, flag: null, targetState: false })}
            onConfirm={(reason) =>
              executeToggle(toggleDialog.flag!, toggleDialog.targetState, reason)
            }
            isLoading={isToggling}
            type="danger"
            title={`Disable API Flag: ${toggleDialog.flag.name}`}
            description={`Disabling this feature flag will immediately stop traffic on ${toggleDialog.flag.affectedApis.join(
              ', '
            )}. Any patient or practitioner calls to these endpoints will be blocked.`}
            confirmLabel="Confirm & Disable Flag"
            requireReason={true}
            reasonPlaceholder="Mandatory reason for disabling (e.g. Upstream provider maintenance, memory leak detected, security patch)..."
          />
        )}

        {/* Inspection Modal */}
        {inspectFlag && (
          <Modal
            isOpen={!!inspectFlag}
            onClose={() => setInspectFlag(null)}
            title="Feature Flag Architecture Context"
            subtitle={inspectFlag.name}
            maxWidth="lg"
            footer={
              <Button variant="outline" size="sm" onClick={() => setInspectFlag(null)}>
                Close
              </Button>
            }
          >
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[#737781] block">Internal Registry Key</span>
                <span className="font-mono font-bold text-[#002654] text-sm">
                  {inspectFlag.key}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[#737781] block">Rollout Allocation</span>
                  <span className="font-bold text-[#00875A] text-sm">
                    {inspectFlag.rolloutPercentage}% of user pool
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[#737781] block">Environment Tier</span>
                  <span className="font-bold text-[#002654] text-sm uppercase">
                    {inspectFlag.environment}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[#737781] block font-semibold">Audit Provenance</span>
                <p className="text-[#121D27]">
                  Last modified on <strong>{formatDate(inspectFlag.lastToggledAt)}</strong>
                </p>
                <p className="text-[#434750]">
                  Modifier:{' '}
                  <strong>
                    {inspectFlag.lastToggledBy.name} ({inspectFlag.lastToggledBy.email})
                  </strong>
                </p>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AdminLayout>
  );
}
