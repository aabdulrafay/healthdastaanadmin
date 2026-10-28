'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Menu, Activity, Shield } from 'lucide-react';
import { getInitials } from '@/lib/utils';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Clinical Command Dashboard',
    subtitle: 'System-wide telemetry, user registrations & pending verifications',
  },
  '/users': {
    title: 'User Management & Sessions',
    subtitle: 'Lifecycle governance for patients, practitioners, and dual-role accounts',
  },
  '/verification': {
    title: 'Practitioner Credential Verification',
    subtitle: 'PMDC license validation, medical degrees & clinical credential review',
  },
  '/feature-flags': {
    title: 'Feature Flags & API Control',
    subtitle: 'Real-time endpoint switches, killswitches, and deployment governance',
  },
  '/audit-logs': {
    title: 'System Audit Logs & Compliance',
    subtitle: 'Immutable audit trail of administrative events and regulatory actions',
  },
  '/admins': {
    title: 'Admin Governance & Privileges',
    subtitle: 'Super Admin provisioning, role assignments, and privileged access',
  },
};

export function Header({ onToggleSidebar }: HeaderProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const currentMeta = PAGE_TITLES[pathname] || {
    title: 'HealthDastaan Administration',
    subtitle: 'Clinical portal operations and security console',
  };

  return (
    <header className="h-18 px-4 sm:px-8 bg-white border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between shadow-[0_1px_4px_rgba(11,60,120,0.03)]">
      {/* Left: Hamburger & Page Title */}
      <div className="flex items-center gap-3.5">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-[#002654] hover:bg-slate-100 transition"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-[#002654] tracking-tight">
            {currentMeta.title}
          </h1>
          <p className="hidden sm:block text-xs text-[#737781]">{currentMeta.subtitle}</p>
        </div>
      </div>

      {/* Right: Telemetry & Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Real-time System Telemetry Chip */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00875A]/10 border border-[#00875A]/25 text-xs font-semibold text-[#00875A]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00875A] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00875A]"></span>
          </span>
          <Activity className="w-3.5 h-3.5 text-[#00875A]" />
          <span>Backend v1: 24ms</span>
        </div>

        {/* Environment Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#002654]/10 text-[#002654] text-xs font-bold border border-[#002654]/15">
          <Shield className="w-3 h-3 text-[#002654]" />
          <span>PROD</span>
        </div>

        {/* User Pill */}
        <div className="flex items-center gap-2.5 pl-2 sm:border-l sm:border-slate-200">
          <div className="w-8 h-8 rounded-full bg-[#002654] text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {user?.name ? getInitials(user.name) : 'AD'}
          </div>
          <div className="hidden xl:block text-left">
            <p className="text-xs font-bold text-[#121D27] leading-none">{user?.name || 'Admin'}</p>
            <p className="text-[10px] text-[#737781] capitalize mt-0.5">
              {user?.role.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
