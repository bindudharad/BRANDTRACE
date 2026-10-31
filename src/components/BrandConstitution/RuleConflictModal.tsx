import React, { useState, useEffect } from 'react';
import {
  X,
  AlertOctagon,
  AlertTriangle,
  Copy,
  ArrowRight,
  ShieldAlert,
  CheckCircle,
} from 'lucide-react';
import { api, RuleConflict } from '../../services/api';

interface RuleConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RuleConflictModal: React.FC<RuleConflictModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [conflicts, setConflicts] = useState<RuleConflict[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadConflicts();
    }
  }, [isOpen]);

  const loadConflicts = async () => {
    setLoading(true);
    try {
      const data = await api.ruleConflicts();
      setConflicts(data);
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        backgroundColor: 'rgba(10, 36, 27, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        className="card-premium"
        style={{
          width: '100%',
          maxWidth: 880,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #DCE5DF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#FEF2F2',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertOctagon size={20} color="#DC2626" />
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#991B1B' }}>
                Deterministic Rule Conflict Analysis
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7F1D1D' }}>
                Identified contradictory or duplicate brand governance rules evaluated across normalized text scopes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <X size={18} color="#991B1B" />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#617168' }}>
              Scanning active rules for policy contradictions...
            </div>
          ) : conflicts.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <CheckCircle size={40} color="#059669" style={{ margin: '0 auto 12px' }} />
              <h4 style={{ margin: '0 0 6px', fontSize: 16, color: '#123B2D' }}>
                No Active Rule Conflicts Detected
              </h4>
              <p style={{ margin: 0, fontSize: 13, color: '#617168' }}>
                All approved rules maintain compatible terminology, scopes, and validity periods.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {conflicts.map((c, i) => (
                <div
                  key={i}
                  style={{
                    border: '1px solid #FCA5A5',
                    borderRadius: 10,
                    backgroundColor: '#FFF5F5',
                    padding: 16,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: '#DC2626',
                        color: '#FFFFFF',
                        padding: '2px 8px',
                        borderRadius: 4,
                      }}
                    >
                      {c.conflict_type} • {c.severity}
                    </span>
                  </div>

                  {/* Side-by-side rules */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                    <div style={{ padding: 12, backgroundColor: '#FFFFFF', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Rule A: {c.rule_a_id}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{c.rule_a_title}</div>
                      <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                        Kind: <b>{c.rule_a_kind}</b> • Pattern: <code style={{ color: '#DC2626' }}>"{c.rule_a_pattern}"</code>
                      </div>
                    </div>

                    <div style={{ padding: 12, backgroundColor: '#FFFFFF', borderRadius: 8, border: '1px solid #E5E7EB' }}>
                      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Rule B: {c.rule_b_id}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>{c.rule_b_title}</div>
                      <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                        Kind: <b>{c.rule_b_kind}</b> • Pattern: <code style={{ color: '#DC2626' }}>"{c.rule_b_pattern}"</code>
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 13, color: '#991B1B', fontWeight: 600, marginBottom: 4 }}>
                    Conflict Explanation:
                  </div>
                  <div style={{ fontSize: 12, color: '#7F1D1D', marginBottom: 8 }}>
                    {c.explanation}
                  </div>

                  <div style={{ fontSize: 12, color: '#065F46', backgroundColor: '#ECFDF5', padding: '6px 10px', borderRadius: 6 }}>
                    <b>Resolution Recommendation:</b> {c.resolution_recommendation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #DCE5DF', backgroundColor: '#F8FAF8', textAlign: 'right' }}>
          <button className="btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
