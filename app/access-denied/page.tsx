'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

export default function AccessDeniedPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#F7F9FF] flex flex-col justify-center items-center p-6 relative">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200/90 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-[#BA1A1A] flex items-center justify-center mx-auto border border-red-200 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-[#002654] tracking-tight">
            Access Restricted
          </h1>
          <p className="text-xs text-[#BA1A1A] font-semibold uppercase tracking-wider">
            Administrative Role Clearance Required
          </p>
          <p className="text-sm text-[#434750] leading-relaxed pt-1">
            Your account ({user?.email || 'Logged in user'}) does not have the necessary
            administrative privileges to access this HealthDastaan console.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#737781] text-left">
          <p className="font-semibold text-[#121D27]">Required Role:</p>
          <p className="mt-0.5">
            super_admin, verification_admin, support_admin, compliance_admin, or api_control_admin.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/" className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="md"
              className="w-full"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Dashboard
            </Button>
          </Link>
          <Button
            variant="outline"
            size="md"
            onClick={() => logout()}
            className="w-full sm:w-auto"
            leftIcon={<LogOut className="w-4 h-4 text-red-500" />}
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
