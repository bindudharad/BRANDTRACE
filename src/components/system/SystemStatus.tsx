import React, { useEffect, useState } from 'react';
import {
  AppEnvironment,
  SystemStatusData,
  getCachedSystemStatus,
  probeSystemStatus,
  subscribeSystemStatus,
} from '../../services/environment';
import { Shield, RefreshCw, AlertTriangle, CheckCircle2, Server, Database } from 'lucide-react';

interface SystemStatusProps {
  variant?: 'inline' | 'badge' | 'card';
  showRefresh?: boolean;
  className?: string;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({
  variant = 'badge',
  showRefresh = false,
  className = '',
}) => {
  const [status, setStatus] = useState<SystemStatusData>(getCachedSystemStatus);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeSystemStatus((newStatus) => {
      setStatus(newStatus);
    });
    // Trigger initial probe if still checking
    if (status.readiness === 'checking') {
      probeSystemStatus();
    }
    return unsubscribe;
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await probeSystemStatus(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusColor = () => {
    if (status.readiness === 'checking') return 'bg-amber-400 animate-pulse';
    if (status.readiness === 'ready') return 'bg-[#0E9F78]';
    if (status.readiness === 'mismatch') return 'bg-amber-500';
    return 'bg-red-400';
  };

  const getDatabaseLabel = () => {
    if (!status.databaseConnected) return 'Database Unavailable';
    if (status.databaseDialect === 'sqlite') return 'SQLite · Connected';
    if (status.databaseDialect === 'postgresql') return 'PostgreSQL · Connected';
    return 'Database Connected';
  };

  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center gap-2 text-xs text-[#617168] ${className}`}>
        <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span className="font-semibold text-[#123B2D]">
          {status.readiness === 'checking'
            ? 'Checking status...'
            : status.readiness === 'ready'
            ? `API: Online · ${status.environmentLabel}`
            : status.readiness === 'mismatch'
            ? `Environment: ${status.environmentLabel} (Mismatch)`
            : 'API: Unavailable'}
        </span>
        <span className="text-[#A6CDBA]">•</span>
        <span>{getDatabaseLabel()}</span>
        {showRefresh && (
          <button
            type="button"
            onClick={handleRefresh}
            className="p-1 text-[#617168] hover:text-[#123B2D] cursor-pointer ml-1"
            title="Refresh system status"
            disabled={isRefreshing}
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`p-4 rounded-2xl bg-white border border-[#DCE5DF] shadow-xs ${className}`}>
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#EBF0EC]">
          <div className="flex items-center gap-2">
            <Server size={16} className="text-[#0E9F78]" />
            <h4 className="text-xs font-bold text-[#123B2D] m-0 uppercase tracking-wider">
              System & Environment Status
            </h4>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            className="text-[11px] font-semibold text-[#0E9F78] hover:text-[#0B8262] flex items-center gap-1 cursor-pointer"
            disabled={isRefreshing}
          >
            <RefreshCw size={11} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Recheck</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-[#F6F8F6] border border-[#E2EBE5]">
            <span className="text-[10px] text-[#617168] font-semibold uppercase block mb-1">
              Environment Classification
            </span>
            <div className="flex items-center gap-1.5 font-bold text-[#123B2D]">
              <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
              <span>{status.environmentLabel}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F6F8F6] border border-[#E2EBE5]">
            <span className="text-[10px] text-[#617168] font-semibold uppercase block mb-1">
              Backend API Readiness
            </span>
            <div className="font-bold text-[#123B2D]">
              {status.readiness === 'checking'
                ? 'Probing /api/ready...'
                : status.readiness === 'ready'
                ? 'FastAPI Online (HTTP 200)'
                : status.readiness === 'mismatch'
                ? 'Online (Configuration Mismatch)'
                : 'Service Unavailable'}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F6F8F6] border border-[#E2EBE5]">
            <span className="text-[10px] text-[#617168] font-semibold uppercase block mb-1">
              Database Persistence
            </span>
            <div className="flex items-center gap-1.5 font-bold text-[#123B2D]">
              <Database size={13} className="text-[#0E9F78]" />
              <span>{getDatabaseLabel()}</span>
            </div>
          </div>
        </div>

        {status.configurationMismatch && status.mismatchReason && (
          <div className="mt-3 p-2.5 rounded-xl bg-[#FFFBEB] border border-[#FCD34D] text-[#92400E] text-[11px] flex items-center gap-2">
            <AlertTriangle size={14} className="flex-shrink-0" />
            <span>{status.mismatchReason}</span>
          </div>
        )}

        {status.lastCheckedAt && (
          <div className="mt-2 text-[10px] text-[#8A9A91] text-right">
            Last checked: {new Date(status.lastCheckedAt).toLocaleTimeString()}
          </div>
        )}
      </div>
    );
  }

  // Default: 'badge' variant
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
        status.readiness === 'ready'
          ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
          : status.readiness === 'checking'
          ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
          : status.readiness === 'mismatch'
          ? 'bg-[#FFFBEB] border-[#FCD34D] text-[#92400E]'
          : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
      } ${className}`}
    >
      <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <span className="font-semibold">{status.environmentLabel}</span>
      <span className="opacity-40">•</span>
      <span>{getDatabaseLabel()}</span>
    </div>
  );
};
