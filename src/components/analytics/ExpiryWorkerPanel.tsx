import React, { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  Square,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Server,
  Zap,
  Activity,
} from 'lucide-react';
import {
  api,
  WorkerStatusResult,
  UserRole,
} from '../../services/api';

interface ExpiryWorkerPanelProps {
  role: UserRole;
  onRefreshNeeded?: () => void;
}

export const ExpiryWorkerPanel: React.FC<ExpiryWorkerPanelProps> = ({
  role,
  onRefreshNeeded,
}) => {
  const [status, setStatus] = useState<WorkerStatusResult | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWorkerData();
  }, []);

  const loadWorkerData = async () => {
    setLoading(true);
    try {
      const [statusRes, jobsRes] = await Promise.all([
        api.expiryWorkerStatus().catch(() => null),
        api.expiryJobs(10).catch(() => []),
      ]);
      if (statusRes) setStatus(statusRes);
      setJobs(jobsRes || []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to query expiry worker status.');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerNow = async () => {
    setActionBusy(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await api.triggerExpiryWorker();
      setFeedback(
        `Worker cycle completed successfully: ${res.scanned_items} items scanned, ${res.new_alerts_created} new alerts, ${res.re_reviews_generated} re-reviews generated.`
      );
      await loadWorkerData();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: any) {
      setError(err?.message || 'Failed to trigger worker cycle.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleStartScheduler = async () => {
    setActionBusy(true);
    setError(null);
    setFeedback(null);
    try {
      await api.startExpiryScheduler(3600);
      setFeedback('Automated background expiry scheduler started (hourly recurring cycle).');
      await loadWorkerData();
    } catch (err: any) {
      setError(err?.message || 'Failed to start background scheduler.');
    } finally {
      setActionBusy(false);
    }
  };

  const handleStopScheduler = async () => {
    setActionBusy(true);
    setError(null);
    setFeedback(null);
    try {
      await api.stopExpiryScheduler();
      setFeedback('Automated background expiry scheduler stopped.');
      await loadWorkerData();
    } catch (err: any) {
      setError(err?.message || 'Failed to stop background scheduler.');
    } finally {
      setActionBusy(false);
    }
  };

  const isRunning = status?.scheduler_active ?? false;

  return (
    <div className="card-premium apple-card" style={{ display: 'grid', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: isRunning ? '#ECFDF5' : '#F1F5F9',
              color: isRunning ? '#0A7352' : '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Server size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#123B2D' }}>
              Automated Background Expiry & Re-Review Worker
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: '#617168' }}>
              Continuous governance background scan assessing 30-day corporate claim and rule validity windows
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 700,
              backgroundColor: isRunning ? '#ECFDF5' : '#F1F5F9',
              color: isRunning ? '#065F46' : '#64748B',
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                backgroundColor: isRunning ? '#10B981' : '#94A3B8',
              }}
            />
            {isRunning ? 'SCHEDULER RUNNING' : 'SCHEDULER IDLE'}
          </span>

          <button
            onClick={loadWorkerData}
            disabled={loading}
            className="btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px' }}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 6,
            backgroundColor: '#ECFDF5',
            color: '#065F46',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircle size={15} />
          <span>{feedback}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 6,
            backgroundColor: '#FEE2E2',
            color: '#991B1B',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div style={{ padding: 12, backgroundColor: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Scan Interval</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
            {status ? `${Math.round(status.interval_seconds / 60)} minutes` : '60 minutes'}
          </div>
          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>Recurring cadence</div>
        </div>

        <div style={{ padding: 12, backgroundColor: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Total Jobs Executed</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
            {status?.total_jobs_executed ?? jobs.length}
          </div>
          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>Automated + on-demand</div>
        </div>

        <div style={{ padding: 12, backgroundColor: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Last Scan Execution</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginTop: 4 }}>
            {status?.last_scan_timestamp
              ? new Date(status.last_scan_timestamp).toLocaleTimeString()
              : 'On demand'}
          </div>
          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>Background worker log</div>
        </div>

        <div style={{ padding: 12, backgroundColor: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0' }}>
          <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Operational Scope</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0A7352', marginTop: 4 }}>
            30-Day Proactive
          </div>
          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 2 }}>Rules & Claim Ledger</div>
        </div>
      </div>

      {/* Admin Worker Controls */}
      {role === 'brand_admin' && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            padding: 12,
            backgroundColor: '#F8FAF8',
            borderRadius: 8,
            border: '1px solid #DCE5DF',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 12, color: '#475569' }}>
            <b>Administrator Controls:</b> Trigger immediate worker cycle or manage background daemon scheduler.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleTriggerNow}
              disabled={actionBusy}
              className="btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Zap size={13} />
              <span>{actionBusy ? 'Executing...' : 'Run Worker Cycle Now'}</span>
            </button>

            {isRunning ? (
              <button
                onClick={handleStopScheduler}
                disabled={actionBusy}
                className="btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#DC2626' }}
              >
                <Square size={13} />
                <span>Stop Scheduler</span>
              </button>
            ) : (
              <button
                onClick={handleStartScheduler}
                disabled={actionBusy}
                className="btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0A7352' }}
              >
                <Play size={13} />
                <span>Start Scheduler</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Recent Jobs History Table */}
      {jobs.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Recent Worker Execution Log
          </div>
          <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAF8', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Job ID</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Status</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Items Scanned</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Alerts Created</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Execution Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {jobs.slice(0, 5).map((j, i) => (
                  <tr key={j.id || i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#1E293B' }}>
                      {j.id ? j.id.slice(0, 16) : `job_${i}`}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 4,
                          backgroundColor: j.status === 'SUCCESS' ? '#ECFDF5' : '#FEF3C7',
                          color: j.status === 'SUCCESS' ? '#065F46' : '#92400E',
                        }}
                      >
                        {j.status || 'COMPLETED'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#334155' }}>{j.scanned_items ?? '-'}</td>
                    <td style={{ padding: '8px 12px', color: '#334155' }}>{j.new_alerts_created ?? 0}</td>
                    <td style={{ padding: '8px 12px', color: '#64748B' }}>
                      {j.created_at ? new Date(j.created_at).toLocaleString() : 'Recent'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
