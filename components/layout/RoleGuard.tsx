'use client';

import React, { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AdminRole } from '@/types/auth';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: AdminRole[];
  fallback?: ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { user, isSuperAdmin } = useAuth();

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  const userRoles = [user?.role, ...(user?.additionalRoles || [])].filter(Boolean) as AdminRole[];
  const hasPermission = allowedRoles.some((role) => userRoles.includes(role));

  if (hasPermission) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="min-h-[500px] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 shadow-xl text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#BA1A1A] flex items-center justify-center mx-auto border border-red-200">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-[#002654]">Access Restricted</h2>
          <p className="text-sm text-[#434750] leading-relaxed">
            Your current administrative role (<strong className="capitalize">{user?.role.replace('_', ' ')}</strong>) does not have authorization to view or execute operations in this module.
          </p>
        </div>
        <div className="pt-2">
          <Link href="/">
            <Button variant="outline" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
