'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { organizationService } from '@/services/organizationService';
import { auditService } from '@/services/auditService';
import { Organization, OrganizationStatus, OrganizationType } from '@/types/organization';
import { formatDate, formatTimeAgo } from '@/lib/utils';
import {
  Building2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Eye,
  Users,
  Key,
  Mail,
  Phone,
  MapPin,
  RefreshCw,
  Ban,
  ShieldAlert,
} from 'lucide-react';

export default function OrganizationsPage() {
  const { user: currentAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<OrganizationStatus | 'all'>('pending');
  const [typeFilter, setTypeFilter] = useState<OrganizationType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected organization for inspection / review
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'apiClients'>('overview');

  // Status Change Dialog (Approve / Reject / Suspend)
  const [statusChangeModalOpen, setStatusChangeModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<OrganizationStatus>('verified');
  const [statusReason, setStatusReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await organizationService.getOrganizations({
        status: statusTab,
        type: typeFilter,
        search: searchQuery || undefined,
      });
      setOrganizations(res.organizations);
    } catch (err) {
      console.error('Failed to load organizations', err);
      toastError('Load Failed', 'Could not retrieve healthcare organizations.');
    } finally {
      setLoading(false);
    }
  }, [statusTab, typeFilter, searchQuery, toastError]);

  useEffect(() => {
    void fetchOrganizations();
  }, [fetchOrganizations]);

  // Compute metric stats
  const totalCount = organizations.length;
  const pendingCount = organizations.filter((o) => o.status === 'pending').length;
  const verifiedCount = organizations.filter((o) => o.status === 'verified').length;
  const suspendedCount = organizations.filter(
    (o) => o.status === 'suspended' || o.status === 'rejected'
  ).length;

  const handleOpenStatusModal = (org: Organization, status: OrganizationStatus) => {
    setSelectedOrg(org);
    setTargetStatus(status);
    setStatusReason('');
    setStatusChangeModalOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!selectedOrg) return;

    if (
      (targetStatus === 'rejected' || targetStatus === 'suspended') &&
      statusReason.trim().length < 5
    ) {
      toastError(
        'Reason Required',
        'Please provide an explanatory reason of at least 5 characters.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await organizationService.updateOrganizationStatus(selectedOrg.id, {
        status: targetStatus,
        reason: statusReason.trim() || undefined,
      });

      setOrganizations((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));

      if (selectedOrg.id === updated.id) {
        setSelectedOrg((prev) => (prev ? { ...prev, ...updated } : null));
      }

      await auditService.logAction({
        actor: {
          id: currentAdmin?.id || 'admin',
          name: currentAdmin?.name || 'Administrator',
          email: currentAdmin?.email || '',
          role: currentAdmin?.role || 'verification_admin',
          ipAddress: '127.0.0.1',
        },
        action:
          targetStatus === 'verified'
            ? 'VERIFICATION_APPROVED'
            : targetStatus === 'rejected'
              ? 'VERIFICATION_REJECTED'
              : 'USER_SUSPENDED',
        targetResource: `organization:${selectedOrg.id}:${selectedOrg.name}`,
        targetId: selectedOrg.id,
        description: `Set organization status for "${selectedOrg.name}" to ${targetStatus}${
          statusReason ? `: ${statusReason}` : ''
        }`,
        severity: targetStatus === 'verified' ? 'info' : 'warning',
        status: 'success',
        metadata: {
          organizationId: selectedOrg.id,
          targetStatus,
          reason: statusReason,
        },
      });

      success(
        'Status Updated',
        `Facility "${selectedOrg.name}" is now marked as ${targetStatus.toUpperCase()}.`
      );
      setStatusChangeModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update organization status';
      toastError('Update Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInspectDetails = async (org: Organization) => {
    setSelectedOrg(org);
    setActiveTab('overview');
    setDetailModalOpen(true);

    // Fetch full organization with members and api clients
    try {
      const fullOrg = await organizationService.getOrganizationById(org.id);
      if (fullOrg) {
        setSelectedOrg(fullOrg);
        setOrganizations((prev) =>
          prev.map((o) => (o.id === fullOrg.id ? { ...o, ...fullOrg } : o))
        );
      }
    } catch (err) {
      console.error('Failed to load full organization details', err);
    }
  };

  const getTypeBadge = (typeCode: OrganizationType, isIndividual: boolean) => {
    if (isIndividual) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#006b5f]/15 text-[#006b5f] border border-[#006b5f]/30">
          Individual Practice
        </span>
      );
    }
    switch (typeCode) {
      case 'hospital':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#002654]/10 text-[#002654] border border-[#002654]/20">
            Hospital
          </span>
        );
      case 'clinic':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#00a896]/15 text-[#008375] border border-[#00a896]/30">
            Clinic
          </span>
        );
      case 'laboratory':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#1b4531]/15 text-[#00875a] border border-[#00875a]/30">
            Laboratory
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            Healthcare Facility
          </span>
        );
    }
  };

  const getStatusBadge = (status: OrganizationStatus) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#bfedd1] text-[#002113] border border-[#00875a]/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#00875a]" />
            Verified & Licensed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#9cefdf] text-[#0b6f63] border border-[#00a896]/30">
            <Clock className="w-3.5 h-3.5 text-[#006b5f] animate-pulse" />
            Pending Review
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Suspended
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-900 border border-red-300">
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            Rejected
          </span>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <AdminLayout pendingOrganizationsCount={pendingCount}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002654] tracking-tight">
              Healthcare Organizations & Facilities
            </h1>
            <p className="text-sm text-[#434750] mt-1">
              Verify hospitals, clinics, diagnostic centers, individual practices, and review EHR
              API clients.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchOrganizations()}
            isLoading={loading}
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>
        </div>

        {/* Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[rgba(11,60,120,0.08)] shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#434750] uppercase tracking-wider">
                  Total Facilities
                </p>
                <p className="text-2xl font-extrabold text-[#002654] mt-1">{totalCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#002654]/5 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-[#002654]" />
              </div>
            </div>
            <p className="text-xs text-[#737781] mt-3">Multi-tenant clinical facilities</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[rgba(11,60,120,0.08)] shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#006b5f] uppercase tracking-wider">
                  Pending Review
                </p>
                <p className="text-2xl font-extrabold text-[#006b5f] mt-1">{pendingCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#00a896]/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-[#006b5f] animate-pulse" />
              </div>
            </div>
            <p className="text-xs text-[#737781] mt-3">Awaiting license verification</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[rgba(11,60,120,0.08)] shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#00875a] uppercase tracking-wider">
                  Verified & Licensed
                </p>
                <p className="text-2xl font-extrabold text-[#00875a] mt-1">{verifiedCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-[#00875a]/10 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-[#00875a]" />
              </div>
            </div>
            <p className="text-xs text-[#737781] mt-3">Operational in clinical network</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[rgba(11,60,120,0.08)] shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#ba1a1a] uppercase tracking-wider">
                  Suspended / Rejected
                </p>
                <p className="text-2xl font-extrabold text-[#ba1a1a] mt-1">{suspendedCount}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[#ba1a1a]" />
              </div>
            </div>
            <p className="text-xs text-[#737781] mt-3">Access restricted or revoked</p>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="bg-white p-4 rounded-2xl border border-[rgba(11,60,120,0.08)] shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
          {/* Status Tab Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#f7f9ff] rounded-xl border border-slate-200 text-xs w-full md:w-auto">
            <button
              onClick={() => setStatusTab('pending')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                statusTab === 'pending'
                  ? 'bg-white text-[#002654] shadow-sm'
                  : 'text-[#434750] hover:text-[#002654]'
              }`}
            >
              Pending Review
              {pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-[#00a896] text-white text-[10px]">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setStatusTab('verified')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                statusTab === 'verified'
                  ? 'bg-white text-[#002654] shadow-sm'
                  : 'text-[#434750] hover:text-[#002654]'
              }`}
            >
              Verified
            </button>
            <button
              onClick={() => setStatusTab('suspended')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                statusTab === 'suspended'
                  ? 'bg-white text-[#002654] shadow-sm'
                  : 'text-[#434750] hover:text-[#002654]'
              }`}
            >
              Suspended
            </button>
            <button
              onClick={() => setStatusTab('rejected')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                statusTab === 'rejected'
                  ? 'bg-white text-[#002654] shadow-sm'
                  : 'text-[#434750] hover:text-[#002654]'
              }`}
            >
              Rejected
            </button>
            <button
              onClick={() => setStatusTab('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                statusTab === 'all'
                  ? 'bg-white text-[#002654] shadow-sm'
                  : 'text-[#434750] hover:text-[#002654]'
              }`}
            >
              All Facilities
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Type selector */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as OrganizationType | 'all')}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-[#002654] bg-white focus:outline-none focus:ring-2 focus:ring-[#00a896]"
            >
              <option value="all">All Facility Types</option>
              <option value="hospital">Hospitals</option>
              <option value="clinic">Clinics</option>
              <option value="laboratory">Laboratories</option>
              <option value="other">Other Facilities</option>
            </select>

            {/* Search Input */}
            <div className="w-full sm:w-64">
              <SearchInput
                placeholder="Search facility name, reg #..."
                value={searchQuery}
                onChange={setSearchQuery}
              />
            </div>
          </div>
        </div>

        {/* Organizations Table */}
        <div className="bg-white rounded-2xl border border-[rgba(11,60,120,0.08)] shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-[#434750] space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#00a896]" />
              <p className="text-sm font-medium">Loading organization directory...</p>
            </div>
          ) : organizations.length === 0 ? (
            <div className="p-12 text-center text-[#737781] space-y-3">
              <Building2 className="w-12 h-12 mx-auto text-slate-300" />
              <p className="text-base font-bold text-[#002654]">No Organizations Found</p>
              <p className="text-xs max-w-sm mx-auto text-[#434750]">
                No healthcare organizations match the current filter criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-[#f7f9ff] text-xs font-bold text-[#002654] uppercase tracking-wider">
                    <th className="py-3.5 px-4 sm:px-6">Facility Details</th>
                    <th className="py-3.5 px-4">Type & Registration</th>
                    <th className="py-3.5 px-4">Contact & Location</th>
                    <th className="py-3.5 px-4 text-center">Members / APIs</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {organizations.map((org) => (
                    <tr key={org.id} className="hover:bg-[#f7f9ff]/70 transition-colors">
                      <td className="py-4 px-4 sm:px-6">
                        <div className="font-bold text-[#002654]">{org.name}</div>
                        <div className="text-xs text-[#737781] mt-0.5">
                          Registered {formatTimeAgo(org.createdAt)}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div>{getTypeBadge(org.typeCode, org.isIndividual)}</div>
                          {org.registrationNumber && (
                            <div className="text-xs font-mono text-[#434750]">
                              Reg: {org.registrationNumber}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-0.5 text-xs text-[#434750]">
                          {org.officialEmail && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[180px]">{org.officialEmail}</span>
                            </div>
                          )}
                          {org.phone && (
                            <div className="flex items-center gap-1.5 font-mono">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{org.phone}</span>
                            </div>
                          )}
                          {org.address && (
                            <div className="flex items-center gap-1.5 text-slate-400 truncate max-w-[200px]">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{org.address}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-3 text-xs font-semibold text-[#434750]">
                          <span
                            className="inline-flex items-center gap-1"
                            title="Organization Staff Members"
                          >
                            <Users className="w-3.5 h-3.5 text-[#006b5f]" />
                            {org.membersCount ?? org.members?.length ?? 0}
                          </span>
                          <span
                            className="inline-flex items-center gap-1"
                            title="OAuth2 API Clients"
                          >
                            <Key className="w-3.5 h-3.5 text-[#002654]" />
                            {org.apiClientsCount ?? org.apiClients?.length ?? 0}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4">{getStatusBadge(org.status)}</td>

                      <td className="py-4 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void handleInspectDetails(org)}
                            title="Inspect Details"
                          >
                            <Eye className="w-4 h-4 text-[#002654]" />
                          </Button>

                          {org.status === 'pending' && (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleOpenStatusModal(org, 'verified')}
                                className="bg-[#00875a] hover:bg-[#00875a]/90 text-white font-bold"
                              >
                                Approve
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleOpenStatusModal(org, 'rejected')}
                              >
                                Reject
                              </Button>
                            </>
                          )}

                          {org.status === 'verified' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-amber-700 hover:bg-amber-50"
                              onClick={() => handleOpenStatusModal(org, 'suspended')}
                              title="Suspend Facility"
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}

                          {org.status === 'suspended' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenStatusModal(org, 'verified')}
                              className="text-[#00875a] border-[#00875a]/30"
                            >
                              Re-activate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detailed Organization Inspection Modal */}
        {selectedOrg && (
          <Modal
            isOpen={detailModalOpen}
            onClose={() => setDetailModalOpen(false)}
            title={selectedOrg.name}
            maxWidth="lg"
          >
            <div className="space-y-6">
              {/* Top Banner with Type and Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#f7f9ff] border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#002654] text-white flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-[#0ed2b0]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#002654]">{selectedOrg.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getTypeBadge(selectedOrg.typeCode, selectedOrg.isIndividual)}
                      <span className="text-xs text-[#737781]">
                        ID: <span className="font-mono">{selectedOrg.id}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div>{getStatusBadge(selectedOrg.status)}</div>
              </div>

              {/* Tab Navigation */}
              <div className="flex border-b border-slate-200 text-xs font-bold text-[#434750]">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`pb-2.5 px-4 border-b-2 transition-colors ${
                    activeTab === 'overview'
                      ? 'border-[#002654] text-[#002654]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Facility Overview
                </button>
                <button
                  onClick={() => setActiveTab('members')}
                  className={`pb-2.5 px-4 border-b-2 transition-colors ${
                    activeTab === 'members'
                      ? 'border-[#002654] text-[#002654]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Staff Members ({selectedOrg.members?.length ?? selectedOrg.membersCount ?? 0})
                </button>
                <button
                  onClick={() => setActiveTab('apiClients')}
                  className={`pb-2.5 px-4 border-b-2 transition-colors ${
                    activeTab === 'apiClients'
                      ? 'border-[#002654] text-[#002654]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  OAuth2 API Clients (
                  {selectedOrg.apiClients?.length ?? selectedOrg.apiClientsCount ?? 0})
                </button>
              </div>

              {/* Tab 1: Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block">Registration / Licensing #</span>
                      <span className="font-bold font-mono text-[#002654] mt-0.5 block">
                        {selectedOrg.registrationNumber || 'Not provided'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block">Official Contact Email</span>
                      <span className="font-bold text-[#002654] mt-0.5 block">
                        {selectedOrg.officialEmail || 'Not provided'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block">Official Telephone</span>
                      <span className="font-bold font-mono text-[#002654] mt-0.5 block">
                        {selectedOrg.phone || 'Not provided'}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 block">Registration Date</span>
                      <span className="font-bold text-[#002654] mt-0.5 block">
                        {formatDate(selectedOrg.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="text-slate-500 block">Physical Address / Headquarters</span>
                    <span className="font-medium text-[#002654] mt-0.5 block leading-relaxed">
                      {selectedOrg.address || 'No physical address specified.'}
                    </span>
                  </div>

                  {selectedOrg.rejectionReason && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs">
                      <span className="font-bold text-[#ba1a1a] block">
                        Rejection / Suspension Reason
                      </span>
                      <p className="text-red-800 mt-1">{selectedOrg.rejectionReason}</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs text-slate-500">Quick Administrative Actions:</span>
                    <div className="flex items-center gap-2">
                      {selectedOrg.status !== 'verified' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setDetailModalOpen(false);
                            handleOpenStatusModal(selectedOrg, 'verified');
                          }}
                          className="bg-[#00875a] text-white"
                        >
                          Approve Facility
                        </Button>
                      )}
                      {selectedOrg.status !== 'rejected' && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setDetailModalOpen(false);
                            handleOpenStatusModal(selectedOrg, 'rejected');
                          }}
                        >
                          Reject
                        </Button>
                      )}
                      {selectedOrg.status === 'verified' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDetailModalOpen(false);
                            handleOpenStatusModal(selectedOrg, 'suspended');
                          }}
                          className="text-amber-700 border-amber-300"
                        >
                          Suspend
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Members */}
              {activeTab === 'members' && (
                <div className="space-y-3">
                  {!selectedOrg.members || selectedOrg.members.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No linked staff members found for this facility.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                      {selectedOrg.members.map((member) => (
                        <div
                          key={member.id}
                          className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50"
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-[#002654]">{member.fullName}</span>
                            <div className="text-slate-500 flex items-center gap-2">
                              <span>{member.email || 'No email'}</span>
                              {member.phone && <span>• {member.phone}</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                                member.staffRole === 'owner'
                                  ? 'bg-[#002654] text-white'
                                  : member.staffRole === 'admin'
                                    ? 'bg-[#00a896]/15 text-[#006b5f]'
                                    : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {member.staffRole}
                            </span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                member.status === 'active' ? 'bg-[#00875a]' : 'bg-slate-300'
                              }`}
                              title={member.status}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: OAuth2 API Clients */}
              {activeTab === 'apiClients' && (
                <div className="space-y-3">
                  {!selectedOrg.apiClients || selectedOrg.apiClients.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No OAuth2 machine-to-machine API clients generated by this facility.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                      {selectedOrg.apiClients.map((client) => (
                        <div
                          key={client.id}
                          className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#002654]">{client.name}</span>
                              {client.isRevoked ? (
                                <span className="px-2 py-0.2 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">
                                  Revoked
                                </span>
                              ) : (
                                <span className="px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-slate-500 text-[11px]">
                              Client ID: {client.clientId}
                            </p>
                          </div>

                          <div className="text-right text-slate-400 text-[11px]">
                            Created {formatDate(client.createdAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* Status Change Confirmation Modal */}
        {selectedOrg && (
          <Modal
            isOpen={statusChangeModalOpen}
            onClose={() => setStatusChangeModalOpen(false)}
            title={`Update Status: ${selectedOrg.name}`}
            maxWidth="md"
          >
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl flex items-start gap-3 ${
                  targetStatus === 'verified'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : targetStatus === 'rejected'
                      ? 'bg-red-50 border border-red-200 text-red-900'
                      : 'bg-amber-50 border border-amber-200 text-amber-900'
                }`}
              >
                {targetStatus === 'verified' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="text-xs">
                  <p className="font-bold uppercase tracking-wider">
                    Transition to {targetStatus.toUpperCase()}
                  </p>
                  <p className="mt-0.5 leading-relaxed">
                    {targetStatus === 'verified'
                      ? 'Approving this facility will grant clinical operating authority and enable authorized members to create OAuth2 machine-to-machine API clients.'
                      : targetStatus === 'rejected'
                        ? 'Rejecting this facility will mark the registration as rejected and prevent facility activation.'
                        : 'Suspending this facility will immediately disable all OAuth2 client tokens and clinical access across this organization.'}
                  </p>
                </div>
              </div>

              {(targetStatus === 'rejected' || targetStatus === 'suspended') && (
                <div>
                  <label className="block text-xs font-bold text-[#002654] uppercase tracking-wider mb-1.5">
                    Regulatory / Administrative Justification Reason{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder="Provide specific justification (min 5 characters) for the immutable audit log..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#002654]"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    This note is stored permanently in the clinical audit trail.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStatusChangeModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant={targetStatus === 'verified' ? 'primary' : 'danger'}
                  size="sm"
                  isLoading={isSubmitting}
                  onClick={() => void handleConfirmStatusChange()}
                >
                  Confirm {targetStatus.toUpperCase()}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AdminLayout>
  );
}
