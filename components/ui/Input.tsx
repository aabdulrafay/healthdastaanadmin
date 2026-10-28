import React, { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-[#434750]"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 pointer-events-none text-slate-400">{leftIcon}</div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            disabled={disabled}
            className={cn(
              'w-full h-11 px-3.5 text-sm text-[#121D27] bg-white rounded-lg border border-slate-300 placeholder:text-slate-400 transition-colors duration-150',
              'focus:outline-none focus:border-[#00A896] focus:ring-2 focus:ring-[#00A896]/20',
              'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-[#BA1A1A] focus:border-[#BA1A1A] focus:ring-[#BA1A1A]/20',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 pointer-events-none text-slate-400">{rightIcon}</div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-[#BA1A1A] font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-[#737781]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
