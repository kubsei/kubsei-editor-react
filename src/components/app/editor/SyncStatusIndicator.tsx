"use client";

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Loader2,
  Cloud,
  CloudOff,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { RootState } from '@/lib/store';
import {
  selectSyncStatus,
  selectIsDirty,
  selectLastSyncedAt,
  selectSyncError,
  selectCanRetry,
  SyncStatus,
} from '@/lib/store/slices/syncSlice';

interface SyncStatusIndicatorProps {
  onRetry?: () => void;
  className?: string;
}

/**
 * Indicador visual del estado de sincronización.
 * Muestra: Saved, Saving..., Unsaved changes, Error, Offline
 */
export function SyncStatusIndicator({ onRetry, className = '' }: SyncStatusIndicatorProps) {
  const status = useSelector(selectSyncStatus);
  const isDirty = useSelector(selectIsDirty);
  const lastSyncedAt = useSelector(selectLastSyncedAt);
  const syncError = useSelector(selectSyncError);
  const canRetry = useSelector(selectCanRetry);

  // Clock for the "Xm ago" label, ticking so it stays current without reading Date.now() during render
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const getStatusConfig = (status: SyncStatus) => {
    switch (status) {
      case 'saved':
        return {
          icon: Check,
          text: 'Saved',
          bgColor: 'bg-green-500/20',
          textColor: 'text-green-400',
          borderColor: 'border-green-500/30',
        };
      case 'saving':
        return {
          icon: Loader2,
          text: 'Saving...',
          bgColor: 'bg-blue-500/20',
          textColor: 'text-blue-400',
          borderColor: 'border-blue-500/30',
          animate: true,
        };
      case 'pending':
        return {
          icon: Cloud,
          text: 'Unsaved changes',
          bgColor: 'bg-yellow-500/20',
          textColor: 'text-yellow-400',
          borderColor: 'border-yellow-500/30',
        };
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Save failed',
          bgColor: 'bg-red-500/20',
          textColor: 'text-red-400',
          borderColor: 'border-red-500/30',
        };
      case 'offline':
        return {
          icon: CloudOff,
          text: 'Offline',
          bgColor: 'bg-gray-500/20',
          textColor: 'text-gray-400',
          borderColor: 'border-gray-500/30',
        };
      default:
        return {
          icon: Cloud,
          text: 'Unknown',
          bgColor: 'bg-gray-500/20',
          textColor: 'text-gray-400',
          borderColor: 'border-gray-500/30',
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  // Formatear tiempo desde último guardado
  const getLastSavedText = () => {
    if (!lastSyncedAt) return null;

    const diff = Math.max(0, now - lastSyncedAt);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(lastSyncedAt).toLocaleDateString();
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full border
          ${config.bgColor} ${config.borderColor} ${config.textColor}
          ${className}
        `}
      >
        <Icon
          className={`w-4 h-4 ${config.animate ? 'animate-spin' : ''}`}
        />

        <span className="text-sm font-medium">{config.text}</span>

        {/* Mostrar tiempo desde último guardado cuando está saved */}
        {status === 'saved' && lastSyncedAt && (
          <span className="text-xs opacity-70">
            {getLastSavedText()}
          </span>
        )}

        {/* Botón de retry cuando hay error */}
        {status === 'error' && canRetry && onRetry && (
          <button
            onClick={onRetry}
            className="ml-1 p-1 hover:bg-white/10 rounded-full transition-colors"
            title="Retry save"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Versión compacta solo con icono (para espacios reducidos)
 */
export function SyncStatusIcon({ className = '' }: { className?: string }) {
  const status = useSelector(selectSyncStatus);

  const getIconConfig = (status: SyncStatus) => {
    switch (status) {
      case 'saved':
        return { icon: Check, color: 'text-green-400' };
      case 'saving':
        return { icon: Loader2, color: 'text-blue-400', animate: true };
      case 'pending':
        return { icon: Cloud, color: 'text-yellow-400' };
      case 'error':
        return { icon: AlertCircle, color: 'text-red-400' };
      case 'offline':
        return { icon: CloudOff, color: 'text-gray-400' };
      default:
        return { icon: Cloud, color: 'text-gray-400' };
    }
  };

  const config = getIconConfig(status);
  const Icon = config.icon;

  return (
    <Icon
      className={`w-4 h-4 ${config.color} ${config.animate ? 'animate-spin' : ''} ${className}`}
    />
  );
}
