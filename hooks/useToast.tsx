'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, duration = 4500 }: Omit<Toast, 'id'>) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const newToast: Toast = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, message?: string) => showToast({ type: 'success', title, message }),
    [showToast]
  );
  const error = useCallback(
    (title: string, message?: string) => showToast({ type: 'error', title, message }),
    [showToast]
  );
  const warning = useCallback(
    (title: string, message?: string) => showToast({ type: 'warning', title, message }),
    [showToast]
  );
  const info = useCallback(
    (title: string, message?: string) => showToast({ type: 'info', title, message }),
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{ toasts, showToast, removeToast, success, error, warning, info }}
    >
      {children}
      {/* Toast Render Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => {
          const config = {
            success: {
              border: 'border-[#00875A]',
              bar: 'bg-[#00875A]',
              icon: <CheckCircle2 className="w-5 h-5 text-[#00875A] shrink-0" />,
              bg: 'bg-white',
            },
            error: {
              border: 'border-[#BA1A1A]',
              bar: 'bg-[#BA1A1A]',
              icon: <AlertCircle className="w-5 h-5 text-[#BA1A1A] shrink-0" />,
              bg: 'bg-white',
            },
            warning: {
              border: 'border-[#B45309]',
              bar: 'bg-[#B45309]',
              icon: <AlertTriangle className="w-5 h-5 text-[#B45309] shrink-0" />,
              bg: 'bg-white',
            },
            info: {
              border: 'border-[#00A896]',
              bar: 'bg-[#00A896]',
              icon: <Info className="w-5 h-5 text-[#00A896] shrink-0" />,
              bg: 'bg-white',
            },
          }[toast.type];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto relative flex items-start gap-3 p-4 rounded-xl shadow-lg border border-slate-200/80 ${config.bg} backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-3`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${config.bar}`} />
              {config.icon}
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-sm font-semibold text-[#121D27]">{toast.title}</p>
                {toast.message && (
                  <p className="text-xs text-[#434750] mt-0.5 leading-relaxed">
                    {toast.message}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-700 transition p-1 rounded-md"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
