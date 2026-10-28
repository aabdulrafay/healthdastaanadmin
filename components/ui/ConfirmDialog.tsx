'use client';

import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info';
  requireReason?: boolean;
  reasonPlaceholder?: string;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  type = 'danger',
  requireReason = false,
  reasonPlaceholder = 'Please specify the clinical or operational reason...',
  isLoading = false,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) {
      setError('A reason is required to perform this administrative action.');
      return;
    }
    setError('');
    await onConfirm(reason);
    setReason('');
  };

  const handleClose = () => {
    setReason('');
    setError('');
    onClose();
  };

  const iconConfig = {
    danger: {
      icon: <AlertTriangle className="w-6 h-6 text-[#BA1A1A]" />,
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
    warning: {
      icon: <AlertCircle className="w-6 h-6 text-amber-600" />,
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    },
    info: {
      icon: <Info className="w-6 h-6 text-[#00A896]" />,
      bg: 'bg-cyan-50',
      border: 'border-cyan-200',
    },
  }[type];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={type === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div
          className={cn(
            'p-4 rounded-xl border flex items-start gap-3.5',
            iconConfig.bg,
            iconConfig.border
          )}
        >
          <div className="shrink-0 mt-0.5">{iconConfig.icon}</div>
          <p className="text-sm text-[#121D27] leading-relaxed">{description}</p>
        </div>

        {requireReason && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#434750]">
              Reason / Justification <span className="text-[#BA1A1A]">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              rows={3}
              placeholder={reasonPlaceholder}
              className="w-full p-3 text-sm rounded-lg border border-slate-300 focus:outline-none focus:border-[#00A896] focus:ring-2 focus:ring-[#00A896]/20 transition-colors"
            />
            {error && <p className="text-xs text-[#BA1A1A] font-medium">{error}</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}
