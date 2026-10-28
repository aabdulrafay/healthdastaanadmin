'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { userService } from '@/services/userService';
import { auditService } from '@/services/auditService';
import { User } from '@/types/user';
import { formatDate, formatTimeAgo, getInitials } from '@/lib/utils';
import {
  Eye,
  Ban,
  Clock,
  CheckCircle,
  KeyRound,
  ShieldAlert,
  Phone,
  Mail,
  Laptop,
} from 'lucide-react';

export default function UserManagementPage() {
  const { user: currentAdmin } = useAuth();
  const { success, error: toastError, info } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');

  // Modals
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Action dialogs
  const [actionDialog, setActionDialog] = useState<{
    isOpen: boolean;
    type: 'block' | 'suspend' | 'activate' | 'revoke_sessions';
    user: User | null;
  }>({
    isOpen: false,
    type: 'block',
    user: null,
  });
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await userService.getUsers({
        search: searchTerm,
        role: roleFilter,
        status: statusFilter,
        verificationStatus: verificationFilter,
      });
      setUsers(res.users);
      setTotalCount(res.total);
    } catch {
      toastError('Error', 'Failed to retrieve users list');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, roleFilter, statusFilter, verificationFilter, toastError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenAction = (
    type: 'block' | 'suspend' | 'activate' | 'revoke_sessions',
    targetUser: User
  ) => {
    setActionDialog({
      isOpen: true,
      type,
      user: targetUser,
    });
  };

  const handleConfirmAction = async (reason: string) => {
    const targetUser = actionDialog.user;
    if (!targetUser) return;

    setIsProcessingAction(true);
    try {
      if (actionDialog.type === 'block') {
        const updated = await userService.updateUserStatus(targetUser.id, 'blocked', reason);
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        if (selectedUser?.id === targetUser.id) setSelectedUser(updated);

        await auditService.logAction({
          actor: {
            id: currentAdmin?.id || 'admin',
            name: currentAdmin?.name || 'Admin',
            email: currentAdmin?.email || 'admin@healthdastaan.com',
            role: currentAdmin?.role || 'admin',
            ipAddress: '127.0.0.1',
          },
          action: 'USER_BLOCKED',
          targetResource: `${targetUser.id}:${targetUser.fullName}`,
          description: `User ${targetUser.fullName} was blocked. Reason: ${reason}`,
          severity: 'critical',
          status: 'success',
          metadata: { reason },
        });

        success(
          'User Blocked',
          `${targetUser.fullName} has been blocked from accessing the platform.`
        );
      } else if (actionDialog.type === 'suspend') {
        const suspendedUntil = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(); // 14 days
        const updated = await userService.updateUserStatus(
          targetUser.id,
          'suspended',
          reason,
          suspendedUntil
        );
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        if (selectedUser?.id === targetUser.id) setSelectedUser(updated);

        await auditService.logAction({
          actor: {
            id: currentAdmin?.id || 'admin',
            name: currentAdmin?.name || 'Admin',
            email: currentAdmin?.email || 'admin@healthdastaan.com',
            role: currentAdmin?.role || 'admin',
            ipAddress: '127.0.0.1',
          },
          action: 'USER_SUSPENDED',
          targetResource: `${targetUser.id}:${targetUser.fullName}`,
          description: `User ${targetUser.fullName} suspended for 14 days. Reason: ${reason}`,
          severity: 'warning',
          status: 'success',
        });

        success('User Suspended', `${targetUser.fullName} suspended for 14 days.`);
      } else if (actionDialog.type === 'activate') {
        const updated = await userService.updateUserStatus(targetUser.id, 'active');
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        if (selectedUser?.id === targetUser.id) setSelectedUser(updated);

        await auditService.logAction({
          actor: {
            id: currentAdmin?.id || 'admin',
            name: currentAdmin?.name || 'Admin',
            email: currentAdmin?.email || 'admin@healthdastaan.com',
            role: currentAdmin?.role || 'admin',
            ipAddress: '127.0.0.1',
          },
          action: 'USER_UNBLOCKED',
          targetResource: `${targetUser.id}:${targetUser.fullName}`,
          description: `User ${targetUser.fullName} restored to active standing.`,
          severity: 'info',
          status: 'success',
        });

        success('User Activated', `${targetUser.fullName} account status restored to active.`);
      } else if (actionDialog.type === 'revoke_sessions') {
        const res = await userService.revokeAllUserSessions(targetUser.id);
        const updatedUser = { ...targetUser, activeSessionsCount: 0 };
        setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? updatedUser : u)));
        if (selectedUser?.id === targetUser.id) setSelectedUser(updatedUser);

        await auditService.logAction({
          actor: {
            id: currentAdmin?.id || 'admin',
            name: currentAdmin?.name || 'Admin',
            email: currentAdmin?.email || 'admin@healthdastaan.com',
            role: currentAdmin?.role || 'admin',
            ipAddress: '127.0.0.1',
          },
          action: 'ALL_SESSIONS_REVOKED',
          targetResource: `${targetUser.id}:${targetUser.fullName}`,
          description: `Revoked all active tokens/sessions for ${targetUser.fullName}.`,
          severity: 'warning',
          status: 'success',
        });

        info(
          'Sessions Terminated',
          `Successfully revoked ${res.revokedCount} active login session(s) for ${targetUser.fullName}.`
        );
      }

      setActionDialog({ isOpen: false, type: 'block', user: null });
    } catch {
      toastError('Action Failed', 'Failed to execute requested user operation');
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header & Metric Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#002654] tracking-tight">
              User Directory & Session Governance
            </h2>
            <p className="text-xs text-[#737781] mt-0.5">
              Manage patient identities, clinician credentials, account restrictions, and security
              tokens
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[#002654] shadow-sm">
              Total Users: <strong className="text-[#00A896]">{totalCount}</strong>
            </span>
          </div>
        </div>

        {/* Filter & Search Bar Surface */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(11,60,120,0.05)] space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="md:col-span-1">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search by name, email, PMDC..."
              />
            </div>

            {/* Role Filter */}
            <div>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={[
                  { label: 'All Roles (Dual / Patient / Doctor)', value: 'all' },
                  { label: 'Dual-Role (Patient + Practitioner)', value: 'both' },
                  { label: 'Practitioners (Doctors)', value: 'practitioner' },
                  { label: 'Patients', value: 'patient' },
                ]}
              />
            </div>

            {/* Status Filter */}
            <div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { label: 'All Account Statuses', value: 'all' },
                  { label: 'Active', value: 'active' },
                  { label: 'Suspended', value: 'suspended' },
                  { label: 'Blocked', value: 'blocked' },
                ]}
              />
            </div>

            {/* Verification Status Filter */}
            <div>
              <Select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                options={[
                  { label: 'All Verification States', value: 'all' },
                  { label: 'Verified PMDC Doctor', value: 'verified' },
                  { label: 'Pending Verification', value: 'pending' },
                  { label: 'Unverified / Patient', value: 'unverified' },
                  { label: 'Rejected', value: 'rejected' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(11,60,120,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F7F9FF] border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-[#434750]">
                  <th className="py-3.5 px-5">User & Contact</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Verification</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Active Sessions</th>
                  <th className="py-3.5 px-4">Last Activity</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#737781] text-xs">
                      Loading user records...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#737781] text-xs">
                      No users match the search and filter criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const isBlocked = user.status === 'blocked';
                    const isSuspended = user.status === 'suspended';

                    return (
                      <tr key={user.id} className="hover:bg-[#F7F9FF]/70 transition-colors group">
                        {/* User & Contact */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#002654] to-[#0B3C78] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                              {getInitials(user.fullName)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-[#121D27] truncate group-hover:text-[#002654]">
                                {user.fullName}
                              </p>
                              <p className="text-xs text-[#737781] truncate">{user.email}</p>
                              {user.pmdcNumber && (
                                <p className="text-[11px] text-[#006B5F] font-mono mt-0.5">
                                  PMDC: {user.pmdcNumber}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          {user.role === 'both' ? (
                            <Badge variant="cyan" size="sm">
                              Dual Role
                            </Badge>
                          ) : user.role === 'practitioner' ? (
                            <Badge variant="blue" size="sm">
                              Practitioner
                            </Badge>
                          ) : (
                            <Badge variant="neutral" size="sm">
                              Patient
                            </Badge>
                          )}
                        </td>

                        {/* Verification */}
                        <td className="py-3.5 px-4">
                          <Badge variant={user.verificationStatus} size="sm" dot>
                            {user.verificationStatus === 'verified'
                              ? 'Verified'
                              : user.verificationStatus === 'pending'
                                ? 'Pending Review'
                                : user.verificationStatus === 'rejected'
                                  ? 'Rejected'
                                  : 'Standard'}
                          </Badge>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <Badge variant={user.status} size="sm" dot>
                            {user.status.toUpperCase()}
                          </Badge>
                        </td>

                        {/* Active Sessions */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                user.activeSessionsCount > 0 ? 'bg-[#00875A]' : 'bg-slate-300'
                              }`}
                            />
                            <span className="text-xs font-semibold text-[#121D27]">
                              {user.activeSessionsCount}{' '}
                              {user.activeSessionsCount === 1 ? 'session' : 'sessions'}
                            </span>
                          </div>
                        </td>

                        {/* Last Activity */}
                        <td className="py-3.5 px-4 text-xs text-[#737781]">
                          {formatTimeAgo(user.lastActiveAt)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Profile */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-[#002654] hover:bg-slate-100"
                              onClick={() => {
                                setSelectedUser(user);
                                setDetailsModalOpen(true);
                              }}
                              title="View Full Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            {/* Revoke Sessions */}
                            {user.activeSessionsCount > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-amber-700 hover:bg-amber-50"
                                onClick={() => handleOpenAction('revoke_sessions', user)}
                                title="Revoke All Active Sessions"
                              >
                                <KeyRound className="w-4 h-4" />
                              </Button>
                            )}

                            {/* Block / Unblock / Activate */}
                            {isBlocked || isSuspended ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-[#00875A] hover:bg-emerald-50"
                                onClick={() => handleOpenAction('activate', user)}
                                title="Restore User to Active Standing"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-amber-600 hover:bg-amber-50"
                                  onClick={() => handleOpenAction('suspend', user)}
                                  title="Suspend User Profile"
                                >
                                  <Clock className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-[#BA1A1A] hover:bg-red-50"
                                  onClick={() => handleOpenAction('block', user)}
                                  title="Block User Permanently"
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Details Modal */}
        {selectedUser && (
          <Modal
            isOpen={detailsModalOpen}
            onClose={() => setDetailsModalOpen(false)}
            title="User Profile & Security Context"
            subtitle={`Identifier: ${selectedUser.id}`}
            maxWidth="xl"
            footer={
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  {selectedUser.activeSessionsCount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDetailsModalOpen(false);
                        handleOpenAction('revoke_sessions', selectedUser);
                      }}
                      leftIcon={<KeyRound className="w-3.5 h-3.5 text-amber-600" />}
                    >
                      Revoke {selectedUser.activeSessionsCount} Session(s)
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {selectedUser.status === 'active' ? (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setDetailsModalOpen(false);
                        handleOpenAction('block', selectedUser);
                      }}
                      leftIcon={<Ban className="w-3.5 h-3.5" />}
                    >
                      Block User
                    </Button>
                  ) : (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => {
                        setDetailsModalOpen(false);
                        handleOpenAction('activate', selectedUser);
                      }}
                      leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
                    >
                      Activate User
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setDetailsModalOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>
            }
          >
            <div className="space-y-6">
              {/* Profile Card Header */}
              <div className="flex items-start justify-between p-4 rounded-xl bg-[#F7F9FF] border border-slate-200">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#002654] to-[#00A896] text-white flex items-center justify-center font-extrabold text-base shadow-sm">
                    {getInitials(selectedUser.fullName)}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-[#002654]">{selectedUser.fullName}</h4>
                    <p className="text-xs text-[#737781] flex items-center gap-1.5 mt-0.5">
                      <Mail className="w-3.5 h-3.5" />
                      <span>{selectedUser.email}</span>
                    </p>
                    <p className="text-xs text-[#737781] flex items-center gap-1.5 mt-0.5">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{selectedUser.phone}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <Badge variant={selectedUser.status} dot>
                    {selectedUser.status.toUpperCase()}
                  </Badge>
                  <Badge variant={selectedUser.verificationStatus}>
                    {selectedUser.verificationStatus.toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Block/Suspension Notice */}
              {selectedUser.status === 'blocked' && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
                  <p className="font-bold text-[#BA1A1A] flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Account Is Currently Blocked</span>
                  </p>
                  <p className="text-[#434750]">
                    <strong>Reason:</strong> {selectedUser.blockedReason || 'Policy Violation'}
                  </p>
                  {selectedUser.blockedAt && (
                    <p className="text-[11px] text-slate-500">
                      Blocked on {formatDate(selectedUser.blockedAt)}
                    </p>
                  )}
                </div>
              )}

              {selectedUser.status === 'suspended' && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                  <p className="font-bold text-amber-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>Account Suspended Temporarily</span>
                  </p>
                  <p className="text-[#434750]">
                    <strong>Reason:</strong> {selectedUser.suspensionReason || 'Operational Review'}
                  </p>
                  {selectedUser.suspendedUntil && (
                    <p className="text-[11px] text-amber-700 font-semibold">
                      Suspended until {formatDate(selectedUser.suspendedUntil)}
                    </p>
                  )}
                </div>
              )}

              {/* Clinical & Role Metadata */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 space-y-1">
                  <span className="text-[#737781] block">Account Role</span>
                  <span className="font-bold text-[#002654] capitalize text-sm">
                    {selectedUser.role === 'both'
                      ? 'Dual Role (Doctor + Patient)'
                      : selectedUser.role}
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 space-y-1">
                  <span className="text-[#737781] block">PMDC License #</span>
                  <span className="font-bold text-[#002654] font-mono text-sm">
                    {selectedUser.pmdcNumber || 'Not Applicable (Patient)'}
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 space-y-1">
                  <span className="text-[#737781] block">Medical Specialization</span>
                  <span className="font-bold text-[#00A896] text-sm">
                    {selectedUser.specialization || 'General / Patient'}
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-slate-100 bg-slate-50 space-y-1">
                  <span className="text-[#737781] block">Registered On</span>
                  <span className="font-bold text-[#121D27] text-sm">
                    {formatDate(selectedUser.createdAt)}
                  </span>
                </div>
              </div>

              {/* Active Sessions Telemetry */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-[#002654]" />
                    <h5 className="text-xs font-bold text-[#002654] uppercase tracking-wider">
                      Active Device Sessions ({selectedUser.activeSessionsCount})
                    </h5>
                  </div>
                </div>

                {selectedUser.activeSessionsCount === 0 ? (
                  <p className="text-xs text-[#737781]">
                    No active terminal or mobile sessions detected.
                  </p>
                ) : (
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-[#121D27]">
                          Chrome 122 on Windows 11 (Desktop)
                        </p>
                        <p className="text-[11px] text-slate-500">
                          IP: 182.185.122.90 • Islamabad, PK
                        </p>
                      </div>
                      <Badge variant="active" size="sm" dot>
                        Online
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Modal>
        )}

        {/* Dangerous Action Confirm Dialog */}
        <ConfirmDialog
          isOpen={actionDialog.isOpen}
          onClose={() => setActionDialog({ isOpen: false, type: 'block', user: null })}
          onConfirm={handleConfirmAction}
          isLoading={isProcessingAction}
          type={
            actionDialog.type === 'block'
              ? 'danger'
              : actionDialog.type === 'suspend'
                ? 'warning'
                : actionDialog.type === 'revoke_sessions'
                  ? 'warning'
                  : 'info'
          }
          title={
            actionDialog.type === 'block'
              ? `Block User: ${actionDialog.user?.fullName}`
              : actionDialog.type === 'suspend'
                ? `Suspend User: ${actionDialog.user?.fullName}`
                : actionDialog.type === 'revoke_sessions'
                  ? `Revoke Sessions: ${actionDialog.user?.fullName}`
                  : `Re-activate User: ${actionDialog.user?.fullName}`
          }
          description={
            actionDialog.type === 'block'
              ? `Are you sure you want to block ${actionDialog.user?.fullName}? This user will be immediately evicted from all active sessions and denied access to HealthDastaan services.`
              : actionDialog.type === 'suspend'
                ? `Suspending ${actionDialog.user?.fullName} will temporarily disable login and teleconsultation bookings for 14 days.`
                : actionDialog.type === 'revoke_sessions'
                  ? `This will invalidate all refresh tokens and JWT access keys for ${actionDialog.user?.fullName}. The user will be required to log in again on all devices.`
                  : `Restore ${actionDialog.user?.fullName} to active status? The user will regain access to their account immediately.`
          }
          confirmLabel={
            actionDialog.type === 'block'
              ? 'Block User'
              : actionDialog.type === 'suspend'
                ? 'Suspend User'
                : actionDialog.type === 'revoke_sessions'
                  ? 'Revoke Sessions'
                  : 'Activate User'
          }
          requireReason={actionDialog.type === 'block' || actionDialog.type === 'suspend'}
          reasonPlaceholder={
            actionDialog.type === 'block'
              ? 'e.g. Fraudulent PMDC license, abusive conduct, chargeback fraud...'
              : 'e.g. Temporary investigation into teleconsultation dispute...'
          }
        />
      </div>
    </AdminLayout>
  );
}
