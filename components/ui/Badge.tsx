import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'active'
    | 'suspended'
    | 'blocked'
    | 'verified'
    | 'pending'
    | 'rejected'
    | 'unverified'
    | 'role'
    | 'emerald'
    | 'cyan'
    | 'blue'
    | 'amber'
    | 'red'
    | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className,
}: BadgeProps) {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-semibold',
  }[size];

  const variantStyles: Record<string, { container: string; dot: string }> = {
    active: {
      container: 'bg-[#00875A]/10 text-[#00875A] border border-[#00875A]/25',
      dot: 'bg-[#00875A]',
    },
    verified: {
      container: 'bg-[#00875A]/10 text-[#00875A] border border-[#00875A]/25',
      dot: 'bg-[#00875A]',
    },
    pending: {
      container: 'bg-[#00A896]/15 text-[#006B5F] border border-[#00A896]/30',
      dot: 'bg-[#00A896] animate-pulse',
    },
    unverified: {
      container: 'bg-slate-100 text-slate-600 border border-slate-200',
      dot: 'bg-slate-400',
    },
    suspended: {
      container: 'bg-amber-500/10 text-amber-700 border border-amber-500/30',
      dot: 'bg-amber-500',
    },
    blocked: {
      container: 'bg-[#BA1A1A]/10 text-[#BA1A1A] border border-[#BA1A1A]/25',
      dot: 'bg-[#BA1A1A]',
    },
    rejected: {
      container: 'bg-[#BA1A1A]/10 text-[#BA1A1A] border border-[#BA1A1A]/25',
      dot: 'bg-[#BA1A1A]',
    },
    role: {
      container: 'bg-[#002654]/10 text-[#002654] border border-[#002654]/20 font-semibold',
      dot: 'bg-[#002654]',
    },
    emerald: {
      container: 'bg-[#00875A]/10 text-[#00875A] border border-[#00875A]/25',
      dot: 'bg-[#00875A]',
    },
    cyan: {
      container: 'bg-[#00A896]/15 text-[#008375] border border-[#00A896]/30',
      dot: 'bg-[#00A896]',
    },
    blue: {
      container: 'bg-[#002654]/10 text-[#0B3C78] border border-[#002654]/20',
      dot: 'bg-[#0B3C78]',
    },
    amber: {
      container: 'bg-amber-50 text-amber-700 border border-amber-200',
      dot: 'bg-amber-500',
    },
    red: {
      container: 'bg-red-50 text-red-700 border border-red-200',
      dot: 'bg-red-500',
    },
    neutral: {
      container: 'bg-slate-100 text-slate-700 border border-slate-200',
      dot: 'bg-slate-400',
    },
  };

  const style = variantStyles[variant] || variantStyles.neutral;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full leading-none tracking-wide select-none',
        sizeStyles,
        style.container,
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', style.dot)} />}
      <span>{children}</span>
    </span>
  );
}
