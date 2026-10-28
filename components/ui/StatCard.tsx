import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  accent?: 'emerald' | 'cyan' | 'blue' | 'red' | 'amber';
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  accent = 'cyan',
  trend,
  onClick,
  className,
}: StatCardProps) {
  const accentBarColor = {
    emerald: 'bg-[#00875A]',
    cyan: 'bg-[#00A896]',
    blue: 'bg-[#0B3C78]',
    red: 'bg-[#BA1A1A]',
    amber: 'bg-[#B45309]',
  }[accent];

  const iconBgColor = {
    emerald: 'bg-[#00875A]/10 text-[#00875A]',
    cyan: 'bg-[#00A896]/15 text-[#006B5F]',
    blue: 'bg-[#002654]/10 text-[#002654]',
    red: 'bg-[#BA1A1A]/10 text-[#BA1A1A]',
    amber: 'bg-amber-500/10 text-amber-600',
  }[accent];

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_2px_8px_-2px_rgba(11,60,120,0.05)] overflow-hidden transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-[0_8px_24px_-4px_rgba(11,60,120,0.12)] hover:-translate-y-0.5',
        className
      )}
    >
      {/* 4px Left-Hand Vertical Accent Bar */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl', accentBarColor)} />

      <div className="flex items-start justify-between gap-3 pl-1.5">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#434750]">{title}</p>
          <p className="text-2xl sm:text-3xl font-extrabold text-[#002654] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-[#737781] mt-0.5">{subtitle}</p>}
        </div>

        {icon && (
          <div className={cn('p-2.5 rounded-xl shrink-0 flex items-center justify-center', iconBgColor)}>
            {icon}
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs pl-1.5">
          {trend.isPositive ? (
            <TrendingUp className="w-3.5 h-3.5 text-[#00875A]" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-[#BA1A1A]" />
          )}
          <span
            className={cn(
              'font-semibold',
              trend.isPositive ? 'text-[#00875A]' : 'text-[#BA1A1A]'
            )}
          >
            {trend.value}
          </span>
          {trend.label && <span className="text-[#737781]">{trend.label}</span>}
        </div>
      )}
    </div>
  );
}
