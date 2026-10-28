'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Activity, Lock, Mail, Eye, EyeOff, ShieldAlert } from 'lucide-react';

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

  const handleLogin = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    setErrorMessage('');
    setIsAccessDenied(false);

    if (!email.trim() || !password) {
      setErrorMessage('Please provide both administrator email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await login({ email, password, rememberMe });
      success(`Welcome, ${user.name}`, 'You have successfully signed in.');
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

  return (
    <div className="min-h-screen bg-[#f7f9ff] flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      {/* Background Subtle Oceanic & Leaf Accents */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#00a896]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#002654]/10 blur-3xl pointer-events-none" />

      {/* Main Administrative Sign-In Card Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 my-auto">
        {/* Brand Header */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#002654] via-[#0b3c78] to-[#00a896] shadow-lg shadow-[#002654]/15 p-3">
            <Activity className="w-full h-full text-white" />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002654] tracking-tight">
              HealthDastaan
            </h1>
            <div className="inline-flex items-center gap-2 mt-2 px-3.5 py-1 rounded-full bg-[#edf4ff] border border-[#002654]/10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00875a]" />
              <span className="text-xs font-semibold text-[#002654] tracking-wide">
                Clinical Administration Portal
              </span>
            </div>
          </div>

          <p className="text-sm text-[#434750] max-w-sm mx-auto leading-relaxed">
            Authorized healthcare operations and platform governance console.
          </p>
        </div>

        {/* Card Surface */}
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-[rgba(11,60,120,0.08)] shadow-[0_2px_8px_-2px_rgba(11,60,120,0.05),0_8px_24px_-4px_rgba(11,60,120,0.08)] relative">
          {/* Top Tri-Color Clinical Gradient Line */}
          <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl bg-gradient-to-r from-[#0b3c78] via-[#00a896] to-[#00875a]" />

          {/* Access Denied Warning Alert */}
          {isAccessDenied && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-[#ba1a1a] shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-[#ba1a1a]">Access Denied</p>
                <p className="mt-0.5 text-red-700 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Generic Error Alert */}
          {errorMessage && !isAccessDenied && (
            <div className="mb-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-[#ba1a1a] font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form
            className="space-y-5"
            action="javascript:void(0);"
            onSubmit={(e) => {
              e.preventDefault();
              void handleLogin(e);
            }}
          >
            <Input
              label="Administrator Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@healthdastaan.com"
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
                  className="rounded text-[#002654] focus:ring-[#00a896] w-4 h-4 border-slate-300"
                />
                <span>Remember me</span>
              </label>
              <a
                href="mailto:support@healthdastaan.com"
                className="text-[#006b5f] hover:underline font-semibold"
              >
                Need help?
              </a>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full font-bold shadow-md shadow-[#002654]/15"
              isLoading={isSubmitting}
              onClick={(e) => {
                e.preventDefault();
                void handleLogin(e);
              }}
            >
              Sign In to Console
            </Button>
          </form>
        </div>
      </div>

      {/* Modern Professional Footer */}
      <footer className="relative z-10 w-full py-6 text-center">
        <div className="max-w-md mx-auto space-y-2">
          <div className="flex items-center justify-center gap-4 text-xs font-medium text-[#434750]">
            <a
              href="mailto:support@healthdastaan.com"
              className="hover:text-[#002654] transition-colors"
            >
              Support
            </a>
            <span className="text-[#c3c6d1]">•</span>
            <span className="hover:text-[#002654] transition-colors cursor-pointer">Privacy</span>
            <span className="text-[#c3c6d1]">•</span>
            <span className="hover:text-[#002654] transition-colors cursor-pointer">Security</span>
          </div>
          <p className="text-xs text-[#737781] tracking-wide font-normal">
            © 2026 HealthDastaan. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
