import { useAuth } from './useAuth';

export function useRoleAccess() {
  const { user, isSuperAdmin, hasRole } = useAuth();

  return {
    isSuperAdmin,
    canVerifyDoctors: isSuperAdmin || hasRole('verification_admin'),
    canManageUsers: isSuperAdmin || hasRole('support_admin') || hasRole('verification_admin'),
    canBlockUsers: isSuperAdmin || hasRole('support_admin'),
    canRevokeSessions: isSuperAdmin || hasRole('support_admin'),
    canControlFeatureFlags: isSuperAdmin || hasRole('api_control_admin'),
    canViewAuditLogs: isSuperAdmin || hasRole('compliance_admin') || hasRole('api_control_admin'),
    canManageAdmins: isSuperAdmin,
    currentUserRole: user?.role,
    currentUserName: user?.name,
  };
}
