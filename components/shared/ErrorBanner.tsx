'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { GlassButton } from '../ui/GlassButton';

export interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onRetry }) => {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-200 backdrop-blur-md my-4">
      <div className="flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
        <p className="text-sm font-medium">{message}</p>
      </div>
      {onRetry && (
        <GlassButton variant="outline" size="sm" onClick={onRetry} className="border-rose-400/40 text-rose-300">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Retry
        </GlassButton>
      )}
    </div>
  );
};
