import React, { useState, useEffect } from 'react';
import {
  Shield,
  FileCheck,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Database,
  CheckCircle,
  RefreshCw,
  ArrowRight,
  Bell,
} from 'lucide-react';
import {
  api,
  Insights,
  GovernanceAlert,
  UserRole,
} from '../../services/api';

interface QualityMetricsCardsProps {
  insights?: Insights;
  onNavigateToTab?: (tab: string) => void;
  onOpenConflictModal?: () => void;
  role: UserRole;
}

export const QualityMetricsCards: React.FC<QualityMetricsCardsProps> = ({
  insights,
  onNavigateToTab,
  onOpenConflictModal,
  role,
}) => {
  const [alerts, setAlerts] = useState<GovernanceAlert[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const data = await api.governanceAlerts('ACTIVE');
      setAlerts(data);
    } catch {
      // Non-critical
    }
  };

  const handleRunScan = async () => {
    setScanning(true);
    setScanMessage(null);
    try {
      const res = await api.triggerExpiryScan();
      setScanMessage(`Scan complete: Scanned ${res.scanned_items} policies & facts. ${res.new_alerts_created} new alerts recorded.`);
      loadAlerts();
    } catch (err: any) {
      setScanMessage(err?.message || 'Failed to complete expiry scan.');
    } finally {
      setScanning(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.acknowledgeAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (err: any) {
      alert(err?.message || 'Failed to acknowledge alert.');
    }
  };

  const activeRules = insights?.active_rules_count ?? 3;
  const draftRules = insights?.draft_rules_count ?? 0;
  const conflicting = insights?.conflicting_rules_count ?? 0;
  const expiredFacts = insights?.expired_facts_count ?? 0;
  const approachingFacts = insights?.approaching_expiry_facts_count ?? 0;
  const evidenceSources = insights?.evidence_sources_count ?? 4;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 24 }}>
      {/* Expiry Alerts Banner if any exist */}
      {alerts.length > 0 && (
        <div
          style={{
            border: '1px solid #FCA5A5',
            backgroundColor: '#FEF2F2',
            borderRadius: 10,
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={18} color="#DC2626" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#991B1B' }}>
                Active Governance Expiry Alerts ({alerts.length})
              </span>
            </div>
            <button
              className="btn-secondary btn-sm"
              onClick={handleRunScan}
              disabled={scanning}
              style={{ fontSize: 11 }}
            >
              <RefreshCw size={12} className={scanning ? 'animate-spin' : ''} />
              <span>{scanning ? 'Scanning...' : 'Re-scan Expirations'}</span>
            </button>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {alerts.map((al) => (
              <div
                key={al.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #FECACA',
                  fontSize: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      backgroundColor: al.severity === 'CRITICAL' ? '#DC2626' : '#D97706',
                      color: '#FFFFFF',
                      padding: '1px 6px',
                      borderRadius: 3,
                    }}
                  >
                    {al.severity}
                  </span>
                  <span style={{ color: '#1E293B', fontWeight: 500 }}>{al.message}</span>
                </div>
                <button
                  onClick={() => handleAcknowledge(al.id)}
                  style={{
                    fontSize: 11,
                    color: '#0A7352',
                    background: 'transparent',
                    border: '1px solid #A7F3D0',
                    padding: '3px 8px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Acknowledge
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {scanMessage && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: 8,
            color: '#065F46',
            fontSize: 12,
          }}
        >
          {scanMessage}
        </div>
      )}

      {/* Quality Telemetry Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
        {/* Active Rules Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 10,
            border: '1px solid #DCE5DF',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 12, color: '#617168', fontWeight: 600 }}>Active Rules</span>
            <Shield size={16} color="#0A7352" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#123B2D', margin: '8px 0 4px' }}>
            {activeRules}
          </div>
          <div style={{ fontSize: 11, color: '#617168' }}>
            100% Deterministic brand standards
          </div>
        </div>

        {/* Draft Rules / Candidate Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 10,
            border: '1px solid #DCE5DF',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: onNavigateToTab ? 'pointer' : 'default',
          }}
          onClick={() => onNavigateToTab && onNavigateToTab('Brand Constitution')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 12, color: '#617168', fontWeight: 600 }}>Draft Candidates</span>
            <FileCheck size={16} color="#0284C7" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: draftRules > 0 ? '#0284C7' : '#123B2D', margin: '8px 0 4px' }}>
            {draftRules}
          </div>
          <div style={{ fontSize: 11, color: '#617168' }}>
            Awaiting human administrative sign-off
          </div>
        </div>

        {/* Conflicting Rules Card */}
        <div
          style={{
            backgroundColor: conflicting > 0 ? '#FFF5F5' : '#FFFFFF',
            borderRadius: 10,
            border: conflicting > 0 ? '1px solid #FCA5A5' : '1px solid #DCE5DF',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: onOpenConflictModal ? 'pointer' : 'default',
          }}
          onClick={onOpenConflictModal}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 12, color: conflicting > 0 ? '#991B1B' : '#617168', fontWeight: 600 }}>
              Policy Conflicts
            </span>
            <AlertOctagon size={16} color={conflicting > 0 ? '#DC2626' : '#10B981'} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: conflicting > 0 ? '#DC2626' : '#10B981', margin: '8px 0 4px' }}>
            {conflicting}
          </div>
          <div style={{ fontSize: 11, color: conflicting > 0 ? '#B91C1C' : '#617168' }}>
            {conflicting > 0 ? 'Click to inspect contradictory rules' : 'Zero conflicting policies'}
          </div>
        </div>

        {/* Fact Expiry Telemetry */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 10,
            border: '1px solid #DCE5DF',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 12, color: '#617168', fontWeight: 600 }}>Fact Expiry Tracking</span>
            <Clock size={16} color="#D97706" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#123B2D', margin: '8px 0 4px' }}>
            {expiredFacts > 0 ? `${expiredFacts} Expired` : approachingFacts > 0 ? `${approachingFacts} Expiring` : '0 Expired'}
          </div>
          <div style={{ fontSize: 11, color: '#617168' }}>
            {approachingFacts > 0 ? `${approachingFacts} facts expire within 30 days` : 'All claims within valid period'}
          </div>
        </div>

        {/* Evidence Sources Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 10,
            border: '1px solid #DCE5DF',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            cursor: onNavigateToTab ? 'pointer' : 'default',
          }}
          onClick={() => onNavigateToTab && onNavigateToTab('Brand Constitution')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 12, color: '#617168', fontWeight: 600 }}>Evidence Sources</span>
            <Database size={16} color="#0A7352" />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#123B2D', margin: '8px 0 4px' }}>
            {evidenceSources}
          </div>
          <div style={{ fontSize: 11, color: '#617168' }}>
            SHA-256 tamper-evident registry
          </div>
        </div>
      </div>
    </div>
  );
};
