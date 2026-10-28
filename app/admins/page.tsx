'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { adminService } from '@/services/adminService';
import { auditService } from '@/services/auditService';
import { AdminAccount, CreateAdminPayload } from '@/types/admin';
import { AdminRole } from '@/types/auth';
import { formatTimeAgo, getInitials } from '@/lib/utils';
import { UserPlus, Shield, CheckCircle, XCircle } from 'lucide-react';

export default function AdminManagementPage() {
  const { user: currentAdmin } = useAuth();
  const { success, error: toastError, warning } = useToast();

  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Admin Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState<CreateAdminPayload>({
    name: '',
    email: '',
    temporaryPassword: '',
    role: 'support_admin',
    department: 'Clinical Operations Support',
    privileges: ['VIEW_USERS', 'SUSPEND_USERS'],
    phoneNumber: '+92 300 0000000',
  });
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Deactivate / Activate Dialog
  const [statusDialog, setStatusDialog] = useState<{
    isOpen: boolean;
    admin: AdminAccount | null;
    targetStatus: 'active' | 'deactivated';
  }>({
    isOpen: false,
    admin: null,
    targetStatus: 'deactivated',
  });
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getAdmins();
      setAdmins(data);
    } catch {
      toastError('Error', 'Failed to retrieve administrative personnel roster');
    } finally {
      setLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
    let res = 'Admin@2026';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewAdminForm((prev) => ({ ...prev, temporaryPassword: res }));
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminForm.name.trim() || !newAdminForm.email.trim()) {
      toastError('Required Fields', 'Please complete the admin name and work email.');
      return;
    }

    const pwd = (newAdminForm.temporaryPassword || '').trim();
    if (!pwd) {
      toastError('Required Fields', 'Please enter or generate a temporary password.');
      return;
    }

    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasDigit = /[0-9]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    if (pwd.length < 8 || !hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      toastError(
        'Weak Password',
        'Password must be at least 8 characters long and contain uppercase, lowercase, a number, and a special character (e.g. AdminSecure2026!).'
      );
      return;
    }

    setIsSubmittingCreate(true);
    try {
      const created = await adminService.createAdmin(
        newAdminForm,
        currentAdmin?.name || 'Super Admin'
      );

      setAdmins((prev) => [...prev, created]);

      await auditService.logAction({
        actor: {
          id: currentAdmin?.id || 'admin',
          name: currentAdmin?.name || 'Admin',
          email: currentAdmin?.email || 'admin@healthdastaan.com',
          role: 'super_admin',
          ipAddress: '127.0.0.1',
        },
        action: 'ADMIN_CREATED',
        targetResource: `${created.id}:${created.email}`,
        description: `Provisioned new admin account for ${created.name} (${created.role.replace('_', ' ')})`,
        severity: 'info',
        status: 'success',
        metadata: {
          role: created.role,
          department: created.department,
          privileges: created.privileges,
        },
      });

      success(
        'Admin Account Created',
        `${created.name} provisioned as ${created.role.replace('_', ' ').toUpperCase()}.`
      );

      setCreateModalOpen(false);
      setNewAdminForm({
        name: '',
        email: '',
        temporaryPassword: '',
        role: 'support_admin',
        department: 'Clinical Operations Support',
        privileges: ['VIEW_USERS', 'SUSPEND_USERS'],
        phoneNumber: '',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not create new administrator';
      toastError('Creation Failed', msg);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleConfirmStatusChange = async (reason: string) => {
    const target = statusDialog.admin;
    if (!target) return;

    setIsUpdatingStatus(true);
    try {
      if (statusDialog.targetStatus === 'deactivated') {
        const updated = await adminService.deactivateAdmin(target.id);
        setAdmins((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));

        await auditService.logAction({
          actor: {
            id: currentAdmin?.id || 'admin',
            name: currentAdmin?.name || 'Admin',
            email: currentAdmin?.email || 'admin@healthdastaan.com',
            role: 'super_admin',
            ipAddress: '127.0.0.1',
          },
          action: 'ADMIN_DEACTIVATED',
          targetResource: `${target.id}:${target.name}`,
          description: `Deactivated administrative privileges for ${target.name}. Reason: ${reason}`,
          severity: 'critical',
          status: 'success',
          metadata: { reason },
        });

        warning('Admin Deactivated', `${target.name} can no longer access the admin portal.`);
      } else {
        const updated = await adminService.activateAdmin(target.id);
        setAdmins((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));

        await auditService.logAction({
          actor: {
            id: currentAdmin?.id || 'admin',
            name: currentAdmin?.name || 'Admin',
            email: currentAdmin?.email || 'admin@healthdastaan.com',
            role: 'super_admin',
            ipAddress: '127.0.0.1',
          },
          action: 'ADMIN_UPDATED',
          targetResource: `${target.id}:${target.name}`,
          description: `Restored active administrative status for ${target.name}.`,
          severity: 'info',
          status: 'success',
        });

        success('Admin Restored', `${target.name} has been reactivated.`);
      }

      setStatusDialog({ isOpen: false, admin: null, targetStatus: 'deactivated' });
    } catch {
      toastError('Error', 'Failed to update admin account status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <AdminLayout>
      <RoleGuard allowedRoles={['super_admin']}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#002654] text-white">
                  <Shield className="w-5 h-5 text-[#0ED2B0]" />
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-[#002654] tracking-tight">
                  Super Admin Governance & Privileges
                </h2>
              </div>
              <p className="text-xs text-[#737781] mt-1">
                Restricted to Super Administrators. Provision, audit, and revoke administrative
                credentials across departments.
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => setCreateModalOpen(true)}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Provision New Admin
            </Button>
          </div>

          {/* Admin Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(11,60,120,0.05)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F7F9FF] border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-[#434750]">
                    <th className="py-3.5 px-5">Administrator</th>
                    <th className="py-3.5 px-4">Primary Role</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Assigned Privileges</th>
                    <th className="py-3.5 px-4">Last Login</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#737781]">
                        Loading administrator personnel...
                      </td>
                    </tr>
                  ) : (
                    admins.map((adm) => {
                      const isSuper = adm.role === 'super_admin';
                      const isDeactivated = adm.status === 'deactivated';

                      return (
                        <tr key={adm.id} className="hover:bg-[#F7F9FF]/70 transition-colors group">
                          {/* Name & Contact */}
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#002654] to-[#00A896] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                {getInitials(adm.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-[#121D27]">{adm.name}</p>
                                <p className="text-[11px] text-[#737781]">{adm.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Primary Role */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                                isSuper
                                  ? 'bg-[#002654] text-white'
                                  : 'bg-[#EDF4FF] text-[#006B5F] border border-[#00A896]/20'
                              }`}
                            >
                              {adm.role.replace('_', ' ')}
                            </span>
                          </td>

                          {/* Department */}
                          <td className="py-3.5 px-4 text-[#434750] font-medium">
                            {adm.department}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <Badge variant={isDeactivated ? 'blocked' : 'active'} size="sm" dot>
                              {adm.status.toUpperCase()}
                            </Badge>
                          </td>

                          {/* Privileges */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="flex flex-wrap gap-1">
                              {adm.privileges.slice(0, 2).map((priv, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                                >
                                  {priv}
                                </span>
                              ))}
                              {adm.privileges.length > 2 && (
                                <span className="text-[10px] text-slate-500 font-semibold self-center">
                                  +{adm.privileges.length - 2} more
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Last Login */}
                          <td className="py-3.5 px-4 text-[#737781]">
                            {adm.lastLoginAt ? formatTimeAgo(adm.lastLoginAt) : 'Never'}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-5 text-right">
                            {isSuper ? (
                              <span className="text-[11px] text-slate-400 italic">Protected</span>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                {isDeactivated ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-[#00875A] hover:bg-emerald-50"
                                    onClick={() =>
                                      setStatusDialog({
                                        isOpen: true,
                                        admin: adm,
                                        targetStatus: 'active',
                                      })
                                    }
                                    title="Reactivate Administrator"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-[#BA1A1A] hover:bg-red-50"
                                    onClick={() =>
                                      setStatusDialog({
                                        isOpen: true,
                                        admin: adm,
                                        targetStatus: 'deactivated',
                                      })
                                    }
                                    title="Deactivate Administrator"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create Admin Modal */}
          <Modal
            isOpen={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            title="Provision New Administrative Officer"
            subtitle="Grant platform governance privileges and departmental access"
            maxWidth="lg"
            footer={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={isSubmittingCreate}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCreateAdmin}
                  isLoading={isSubmittingCreate}
                >
                  Provision Account
                </Button>
              </>
            }
          >
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <Input
                label="Full Name"
                placeholder="e.g. Dr. Haris Farooq"
                value={newAdminForm.name}
                onChange={(e) => setNewAdminForm({ ...newAdminForm, name: e.target.value })}
                required
              />

              <Input
                label="Official Work Email"
                type="email"
                placeholder="e.g. haris.verification@healthdastaan.com"
                value={newAdminForm.email}
                onChange={(e) => setNewAdminForm({ ...newAdminForm, email: e.target.value })}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Administrative Role"
                  value={newAdminForm.role}
                  onChange={(e) =>
                    setNewAdminForm({ ...newAdminForm, role: e.target.value as AdminRole })
                  }
                  options={[
                    { label: 'Verification Admin (Doctor Licenses)', value: 'verification_admin' },
                    { label: 'Support Admin (User Lifecycle & Sessions)', value: 'support_admin' },
                    {
                      label: 'Compliance Admin (Audit & Data Integrity)',
                      value: 'compliance_admin',
                    },
                    {
                      label: 'API Control Admin (Feature Flags & Infrastructure)',
                      value: 'api_control_admin',
                    },
                    { label: 'Super Admin (Unrestricted Full Access)', value: 'super_admin' },
                  ]}
                />

                <Input
                  label="Department / Unit"
                  placeholder="e.g. Medical Board"
                  value={newAdminForm.department}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, department: e.target.value })}
                  required
                />
              </div>

              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#002654]">
                    Temporary One-Time Password <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateSecurePassword}
                    className="text-xs font-bold text-[#006b5f] hover:underline"
                  >
                    Auto-generate
                  </button>
                </div>
                <Input
                  value={newAdminForm.temporaryPassword}
                  placeholder="e.g. AdminSecure2026!"
                  onChange={(e) =>
                    setNewAdminForm({ ...newAdminForm, temporaryPassword: e.target.value })
                  }
                  helperText="Must be 8+ chars with uppercase, lowercase, number, and symbol."
                  required
                />
              </div>
            </form>
          </Modal>

          {/* Deactivate Confirm Dialog */}
          {statusDialog.admin && (
            <ConfirmDialog
              isOpen={statusDialog.isOpen}
              onClose={() =>
                setStatusDialog({ isOpen: false, admin: null, targetStatus: 'deactivated' })
              }
              onConfirm={handleConfirmStatusChange}
              isLoading={isUpdatingStatus}
              type={statusDialog.targetStatus === 'deactivated' ? 'danger' : 'info'}
              title={
                statusDialog.targetStatus === 'deactivated'
                  ? `Deactivate Admin: ${statusDialog.admin.name}`
                  : `Reactivate Admin: ${statusDialog.admin.name}`
              }
              description={
                statusDialog.targetStatus === 'deactivated'
                  ? `Are you sure you want to revoke administrative credentials for ${statusDialog.admin.name}? They will immediately lose access to all clinical consoles.`
                  : `Reactivate ${statusDialog.admin.name}'s administrative console privileges?`
              }
              confirmLabel={
                statusDialog.targetStatus === 'deactivated' ? 'Deactivate Admin' : 'Activate Admin'
              }
              requireReason={statusDialog.targetStatus === 'deactivated'}
              reasonPlaceholder="Mandatory reason for deactivation (e.g. Department transfer, offboarding)..."
            />
          )}
        </div>
      </RoleGuard>
    </AdminLayout>
  );
}
