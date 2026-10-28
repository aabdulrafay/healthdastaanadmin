'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { NAV_ITEMS, ROLE_CONFIGS } from '@/lib/constants';
import { getInitials } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Sliders,
  ShieldCheck,
  LockKeyhole,
  LogOut,
  Activity,
  X,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  pendingVerificationsCount?: number;
}

export function Sidebar({ isOpen, onClose, pendingVerificationsCount = 2 }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout, isSuperAdmin } = useAuth();

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'LayoutDashboard':
        return <LayoutDashboard className="w-5 h-5" />;
      case 'Users':
        return <Users className="w-5 h-5" />;
      case 'Stethoscope':
        return <Stethoscope className="w-5 h-5" />;
      case 'Sliders':
        return <Sliders className="w-5 h-5" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5" />;
      case 'LockKeyhole':
        return <LockKeyhole className="w-5 h-5" />;
      default:
        return <LayoutDashboard className="w-5 h-5" />;
    }
  };

  const filteredNavItems = NAV_ITEMS.filter((item) => {
    if (isSuperAdmin) return true;
    if (!user) return false;
    const userRoles = [user.role, ...(user.additionalRoles || [])];
    return item.allowedRoles.some((r) => userRoles.includes(r));
  });

  const roleConfig = user?.role ? ROLE_CONFIGS[user.role] : null;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-[#0F1A24]/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Persistent Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-72 bg-[#002654] text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-[#1F3D6B] shadow-xl`}
      >
        {/* Brand Header */}
        <div className="h-18 px-6 flex items-center justify-between border-b border-[#1F3D6B]/70 bg-[#071E3D]/50">
          <Link href="/" className="flex items-center gap-3 group">
            {/* HealthDastaan Dual-Ribbon Brand Mark */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00A896] to-[#0ED2B0] flex items-center justify-center shadow-lg shadow-[#00A896]/25 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">
                  HealthDastaan
                </span>
                <span className="text-[10px] font-bold tracking-widest px-1.5 py-0.5 rounded bg-[#00A896]/25 text-[#0ED2B0] border border-[#00A896]/30">
                  ADMIN
                </span>
              </div>
              <p className="text-[11px] text-[#8DA8DE]">Clinical Operations</p>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="lg:hidden text-slate-300 hover:text-white p-1 rounded-md"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 px-4 py-6 overflow-y-auto space-y-1.5">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-[#8DA8DE]/70 mb-2">
            Governance Modules
          </p>

          {filteredNavItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            const badgeCount =
              item.badgeCountKey === 'pendingVerifications' ? pendingVerificationsCount : null;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#1F3D6B] text-white shadow-md shadow-black/10'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#00A896] rounded-r-md" />
                )}

                <div className="flex items-center gap-3 pl-1">
                  <span
                    className={
                      isActive ? 'text-[#0ED2B0]' : 'text-slate-400 group-hover:text-white'
                    }
                  >
                    {getIcon(item.iconName)}
                  </span>
                  <span>{item.name}</span>
                </div>

                {badgeCount !== null && badgeCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#00A896] text-white shadow-sm">
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Current Admin User Footer */}
        <div className="p-4 border-t border-[#1F3D6B]/70 bg-[#071E3D]/60 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#00A896] to-[#0B3C78] flex items-center justify-center font-bold text-xs text-white shadow-inner shrink-0">
              {user?.name ? getInitials(user.name) : 'AD'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">
                {user?.name || 'Administrator'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-[#8DA8DE] truncate border border-white/10">
                  {roleConfig?.label || 'Super Admin'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg text-slate-300 hover:text-white hover:bg-red-500/15 hover:border-red-500/30 border border-transparent transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>
    </>
  );
}
