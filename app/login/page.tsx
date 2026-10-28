'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Activity, Lock, Mail, Eye, EyeOff, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { DEFAULT_SUPERADMIN } from '@/lib/constants';
import { DEMO_ADMIN_ACCOUNTS } from '@/services/authService';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const { success, error: toastError } = useToast();
  const router = useRouter();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setIsAccessDenied(false);

    if (!email.trim() || !password) {
      setErrorMessage('Please provide both administrator email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await login({ email, password, rememberMe });
      success(
        `Welcome, ${user.name}`,
        `Authenticated under administrative role: ${user.role.replace('_', ' ').toUpperCase()}`
      );
      router.push('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      if (msg.includes('Access Denied')) {
        setIsAccessDenied(true);
      }
      setErrorMessage(msg);
      toastError('Authentication Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (targetEmail: string, targetPass?: string) => {
    setEmail(targetEmail);
    setPassword(targetPass || 'admin123');
    setErrorMessage('');
    setIsAccessDenied(false);
  };

  return (
    <div className="min-h-screen bg-[#F7F9FF] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Oceanic Gradients */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#00A896]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#002654]/10 blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#002654] via-[#0B3C78] to-[#00A896] shadow-xl shadow-[#002654]/25 p-3.5 mb-1">
            <Activity className="w-full h-full text-white" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#002654] tracking-tight">
              HealthDastaan
            </h2>
            <div className="inline-flex items-center gap-1.5 mt-1 px-3 py-0.5 rounded-full bg-[#002654]/10 border border-[#002654]/15">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00A896]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#002654]">
                Clinical Administration Portal
              </span>
            </div>
          </div>
          <p className="text-xs text-[#434750] max-w-xs mx-auto">
            Authorized healthcare governance, doctor credentialing, and infrastructure control
          </p>
        </div>

        {/* Login Card Surface */}
        <div className="mt-8 bg-white py-8 px-6 sm:px-10 shadow-[0_8px_30px_rgb(11,60,120,0.08)] rounded-2xl border border-slate-200/90 relative">
          {/* Top 4px oceanic gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl bg-gradient-to-r from-[#002654] via-[#00A896] to-[#0ED2B0]" />

          {/* Access Denied Warning Alert */}
          {isAccessDenied && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-[#BA1A1A] shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-[#BA1A1A]">Access Denied</p>
                <p className="mt-0.5 text-red-700 leading-relaxed">
                  {errorMessage}
                </p>
              </div>
            </div>
          )}

          {/* Generic Error Alert */}
          {errorMessage && !isAccessDenied && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-[#BA1A1A] font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <Input
              label="Administrator Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. superadmin@healthdastaan.com"
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
              required
            />

            <div className="relative">
              <Input
                label="Security Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                leftIcon={<Lock className="w-4 h-4" />}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-[38px] text-slate-400 hover:text-slate-600 focus:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-[#434750]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-[#002654] focus:ring-[#00A896] w-4 h-4"
                />
                <span>Remember this terminal session</span>
              </label>
              <span className="text-[#006B5F] hover:underline cursor-pointer font-medium">
                Hardware Token / 2FA Help
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full font-bold shadow-md shadow-[#002654]/15"
              isLoading={isSubmitting}
            >
              Sign In to Console
            </Button>
          </form>

          {/* Quick-fill Dev Credentials Box */}
          <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#002654]">
              <Sparkles className="w-4 h-4 text-[#00A896]" />
              <span>Development Role Quick-Fill:</span>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs">
              {/* Default Super Admin */}
              <button
                type="button"
                onClick={() => handleQuickFill(DEFAULT_SUPERADMIN.email, DEFAULT_SUPERADMIN.password)}
                className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-[#002654] hover:bg-[#EDF4FF] transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="font-semibold text-[#002654]">👑 Super Admin (Full Governance)</p>
                  <p className="text-[11px] text-slate-500 font-mono">{DEFAULT_SUPERADMIN.email}</p>
                </div>
                <span className="text-[10px] font-bold text-[#00A896] group-hover:underline">Fill</span>
              </button>

              {/* Verification Admin */}
              <button
                type="button"
                onClick={() => handleQuickFill('shahzad.verification@healthdastaan.com', 'admin123')}
                className="w-full text-left p-2 rounded-lg border border-slate-200 hover:border-[#00A896] hover:bg-slate-50 transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="font-semibold text-[#121D27]">🩺 Verification Admin (Doctor Credentials)</p>
                  <p className="text-[11px] text-slate-500 font-mono">shahzad.verification@healthdastaan.com</p>
                </div>
                <span className="text-[10px] font-bold text-[#00A896] group-hover:underline">Fill</span>
              </button>

              {/* Support Admin */}
              <button
                type="button"
                onClick={() => handleQuickFill('sarah.support@healthdastaan.com', 'admin123')}
                className="w-full text-left p-2 rounded-lg border border-slate-200 hover:border-[#00A896] hover:bg-slate-50 transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="font-semibold text-[#121D27]">👥 Support Admin (User Management & Sessions)</p>
                  <p className="text-[11px] text-slate-500 font-mono">sarah.support@healthdastaan.com</p>
                </div>
                <span className="text-[10px] font-bold text-[#00A896] group-hover:underline">Fill</span>
              </button>

              {/* Regular Patient / Non-Admin (Tests Access Denied) */}
              <button
                type="button"
                onClick={() => handleQuickFill('sana.tariq@gmail.com', 'patientPass')}
                className="w-full text-left p-2 rounded-lg border border-red-200 bg-red-50/50 hover:bg-red-50 transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="font-semibold text-red-800">🚫 Regular Patient Account</p>
                  <p className="text-[11px] text-red-600 font-mono">sana.tariq@gmail.com (Test Access Denied)</p>
                </div>
                <span className="text-[10px] font-bold text-red-700 group-hover:underline">Test</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security Policy Footer */}
        <p className="mt-6 text-center text-xs text-[#737781]">
          Protected by enterprise-grade TLS 1.3 & role-based access control. All administrative actions are permanently recorded in system audit logs.
        </p>
      </div>
    </div>
  );
}
