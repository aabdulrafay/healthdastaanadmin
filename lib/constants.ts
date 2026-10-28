import { AdminRole } from '@/types/auth';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://api.healthdastaan.com/v1';

export const DEFAULT_SUPERADMIN = {
  email: 'superadmin@healthdastaan.com',
  password: 'ChangeMe@HealthDastaan2026!',
  name: 'HealthDastaan Super Admin',
  role: 'super_admin' as AdminRole,
};

export interface RoleConfig {
  label: string;
  badgeColor: string;
  description: string;
  accessibleRoutes: string[];
}

export const ROLE_CONFIGS: Record<AdminRole, RoleConfig> = {
  super_admin: {
    label: 'Super Admin',
    badgeColor: 'bg-[#002654] text-white border-[#0B3C78]',
    description: 'Unrestricted enterprise control across all clinical systems, admins, and services.',
    accessibleRoutes: ['/', '/users', '/verification', '/feature-flags', '/audit-logs', '/admins'],
  },
  verification_admin: {
    label: 'Verification Admin',
    badgeColor: 'bg-[#006B5F]/15 text-[#006B5F] border-[#006B5F]/30',
    description: 'Manages doctor credentials, PMDC validity, and clinic licensing reviews.',
    accessibleRoutes: ['/', '/verification', '/users'],
  },
  support_admin: {
    label: 'Support Admin',
    badgeColor: 'bg-[#00A896]/15 text-[#008375] border-[#00A896]/30',
    description: 'Handles patient and doctor accounts, session resets, and user status controls.',
    accessibleRoutes: ['/', '/users'],
  },
  compliance_admin: {
    label: 'Compliance Admin',
    badgeColor: 'bg-[#1b4531]/15 text-[#00875A] border-[#00875A]/30',
    description: 'Inspects regulatory compliance, audit logs, and data integrity.',
    accessibleRoutes: ['/', '/audit-logs', '/users'],
  },
  api_control_admin: {
    label: 'API Control Admin',
    badgeColor: 'bg-[#1F3D6B]/15 text-[#0B3C78] border-[#1F3D6B]/30',
    description: 'Controls real-time feature flags, rate limits, and endpoint kill-switches.',
    accessibleRoutes: ['/', '/feature-flags', '/audit-logs'],
  },
};

export interface NavItem {
  name: string;
  href: string;
  iconName: string;
  allowedRoles: AdminRole[];
  badgeCountKey?: 'pendingVerifications' | 'criticalAlerts';
}

export const NAV_ITEMS: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    iconName: 'LayoutDashboard',
    allowedRoles: ['super_admin', 'verification_admin', 'support_admin', 'compliance_admin', 'api_control_admin'],
  },
  {
    name: 'User Management',
    href: '/users',
    iconName: 'Users',
    allowedRoles: ['super_admin', 'support_admin', 'verification_admin', 'compliance_admin'],
  },
  {
    name: 'Practitioner Verification',
    href: '/verification',
    iconName: 'Stethoscope',
    allowedRoles: ['super_admin', 'verification_admin'],
    badgeCountKey: 'pendingVerifications',
  },
  {
    name: 'Feature Flags & APIs',
    href: '/feature-flags',
    iconName: 'Sliders',
    allowedRoles: ['super_admin', 'api_control_admin'],
  },
  {
    name: 'Audit Logs',
    href: '/audit-logs',
    iconName: 'ShieldCheck',
    allowedRoles: ['super_admin', 'compliance_admin', 'api_control_admin'],
  },
  {
    name: 'Admin Governance',
    href: '/admins',
    iconName: 'LockKeyhole',
    allowedRoles: ['super_admin'],
  },
];
