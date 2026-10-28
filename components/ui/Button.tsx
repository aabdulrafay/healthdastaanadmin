import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      leftIcon,
      rightIcon,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-55 disabled:cursor-not-allowed select-none';

    const sizeStyles = {
      sm: 'text-xs px-3 py-1.5 h-8 gap-1.5',
      md: 'text-sm px-4 py-2 h-10 gap-2',
      lg: 'text-base px-6 py-3 h-12 gap-2.5 font-semibold',
    }[size];

    const variantStyles = {
      primary:
        'bg-[#002654] hover:bg-[#0B3C78] text-white shadow-sm hover:shadow-[#00A896]/20 hover:shadow-lg focus:ring-[#002654] active:scale-[0.99]',
      secondary:
        'bg-white text-[#006B5F] border border-[#00A896] hover:bg-[#EDF4FF] focus:ring-[#00A896]',
      outline:
        'bg-white text-[#121D27] border border-slate-300 hover:bg-slate-50 focus:ring-[#002654]',
      ghost: 'text-[#0B3C78] hover:bg-[#EDF4FF] focus:ring-[#0B3C78]',
      danger:
        'bg-[#BA1A1A] hover:bg-[#93000A] text-white shadow-sm hover:shadow-red-500/20 hover:shadow-lg focus:ring-[#BA1A1A]',
      success:
        'bg-[#00875A] hover:bg-[#006B47] text-white shadow-sm hover:shadow-emerald-500/20 hover:shadow-lg focus:ring-[#00875A]',
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, sizeStyles, variantStyles, className)}
        {...props}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : leftIcon}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
