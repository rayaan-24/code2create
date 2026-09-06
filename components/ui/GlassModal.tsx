'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassButton } from './GlassButton';

export interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'relative w-full glass-panel-elevated p-6 rounded-2xl border border-white/15 z-10 shadow-2xl overflow-hidden',
          maxWidth
        )}
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div>
            <h3 id="modal-title" className="text-lg font-semibold text-white">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-slate-400 mt-0.5">{description}</p>
            )}
          </div>
          <GlassButton
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </GlassButton>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
};
