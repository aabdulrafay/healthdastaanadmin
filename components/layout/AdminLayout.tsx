'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Loader2 } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isAuthenticated, isLoading, canAccessRoute } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F9FF] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#002654] flex items-center justify-center shadow-lg shadow-[#002654]/20 animate-pulse">
          <Loader2 className="w-6 h-6 text-[#00A896] animate-spin" />
        </div>
        <p className="text-sm font-semibold text-[#002654] tracking-tight">
          Verifying HealthDastaan Credentials...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  // Check if current route is allowed for this role
  const isAllowed = canAccessRoute(pathname);

  return (
    <div className="min-h-screen bg-[#F7F9FF] flex">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pendingVerificationsCount={2}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {isAllowed ? (
            children
          ) : (
            <div className="min-h-[450px] flex items-center justify-center">
              <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto font-bold text-lg">
                  !
                </div>
                <h2 className="text-xl font-bold text-[#002654]">Access Denied</h2>
                <p className="text-sm text-slate-600">
                  You do not have permission to access the module at{' '}
                  <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono text-[#002654]">
                    {pathname}
                  </code>
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
