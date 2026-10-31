import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Shield,
  Edit2,
  Sparkles,
  Hash,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  api,
  ConstitutionImport,
  ImportCandidate,
  UserRole,
} from '../../services/api';

interface GuidelineImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: UserRole;
  onCandidateApproved: () => void;
}

export const GuidelineImportModal: React.FC<GuidelineImportModalProps> = ({
  isOpen,
  onClose,
  role,
  onCandidateApproved,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [consentAi, setConsentAi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeImport, setActiveImport] = useState<ConstitutionImport | null>(null);
  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'rule' | 'fact'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPattern, setEditPattern] = useState('');
  const [editRequirement, setEditRequirement] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [recentImports, setRecentImports] = useState<ConstitutionImport[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRecentImports();
    }
  }, [isOpen]);

  const loadRecentImports = async () => {
    try {
      const list = await api.constitutionImports();
      setRecentImports(list);
    } catch {
      // Non-critical background fetch
    }
  };

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('Please select a valid digital PDF document.');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please choose a PDF brand guideline to import.');
      return;
    }

    setLoading(true);
    setError(null);
    setActionSuccess(null);

    try {
      const imp = await api.importBrandGuidelines(selectedFile, consentAi);
      setActiveImport(imp);
      const cands = await api.importCandidates(imp.id);
      setCandidates(cands);
      loadRecentImports();
      setActionSuccess(`Successfully extracted ${cands.length} candidate governance policies with page citations.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to process brand guideline PDF.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPastImport = async (imp: ConstitutionImport) => {
    setActiveImport(imp);
    setLoading(true);
    try {
      const cands = await api.importCandidates(imp.id);
      setCandidates(cands);
      setShowHistory(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to load candidates.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (candidate: ImportCandidate) => {
    if (role !== 'brand_admin') {
      setError('Only Brand Administrators can activate imported governance rules.');
      return;
    }
    try {
      await api.approveCandidate(candidate.id);
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidate.id
            ? { ...c, status: 'APPROVED', review_decision: 'APPROVED' }
            : c
        )
      );
      setActionSuccess(`Candidate '${candidate.pattern}' approved and activated into active Brand Constitution.`);
      onCandidateApproved();
    } catch (err: any) {
      setError(err?.message || 'Failed to approve candidate.');
    }
  };

  const handleReject = async (candidate: ImportCandidate) => {
    if (role !== 'brand_admin') {
      setError('Only Brand Administrators can reject imported rules.');
      return;
    }
    const reason = window.prompt('Reason for rejecting candidate rule (optional):') || 'Rejected by Brand Admin';
    try {
      await api.rejectCandidate(candidate.id, reason);
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidate.id
            ? { ...c, status: 'REJECTED', review_decision: 'REJECTED', rejection_reason: reason }
            : c
        )
      );
      setActionSuccess(`Candidate '${candidate.pattern}' rejected.`);
    } catch (err: any) {
      setError(err?.message || 'Failed to reject candidate.');
    }
  };

  const handleStartEdit = (candidate: ImportCandidate) => {
    setEditingId(candidate.id);
    setEditPattern(candidate.pattern);
    setEditRequirement(candidate.requirement);
  };

  const handleSaveEdit = async (candidateId: string) => {
    try {
      const updated = await api.updateCandidate(candidateId, {
        pattern: editPattern,
        requirement: editRequirement,
      });
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidateId ? updated : c))
      );
      setEditingId(null);
      setActionSuccess('Candidate updated.');
    } catch (err: any) {
      setError(err?.message || 'Failed to save candidate edits.');
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    if (filterType === 'rule') return c.candidate_type === 'rule';
    if (filterType === 'fact') return c.candidate_type === 'fact';
    return true;
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
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
          maxWidth: 960,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          boxShadow: '0 20px 40px -15px rgba(18, 59, 45, 0.25)',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #DCE5DF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #123B2D 0%, #0A241B 100%)',
            color: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Upload size={18} color="#2DD4BF" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#FFFFFF' }}>
                Import Brand Guidelines
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#B3C7BD' }}>
                Convert corporate guideline PDFs into structured governance rules with source citations.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#B3C7BD',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {error && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 8,
                color: '#991B1B',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {actionSuccess && (
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: 8,
                color: '#065F46',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <CheckCircle size={16} />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Upload Section if no active candidates */}
          {!activeImport ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  border: '2px dashed #DCE5DF',
                  borderRadius: 12,
                  padding: 36,
                  textAlign: 'center',
                  backgroundColor: '#F8FAF8',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    cursor: 'pointer',
                    width: '100%',
                    height: '100%',
                  }}
                />
                <FileText size={42} color="#0A7352" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: '#123B2D' }}>
                  {selectedFile ? selectedFile.name : 'Choose a Digital Brand Guideline PDF'}
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: '#617168' }}>
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB selected • Click to change file`
                    : 'Drag and drop your company guideline PDF or click to browse'}
                </p>
              </div>

              <div
                style={{
                  padding: '14px 18px',
                  backgroundColor: '#F1F5F9',
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Sparkles size={16} color="#0A7352" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>
                      Optional Groq AI Guideline Structuring
                    </div>
                    <div style={{ fontSize: 12, color: '#64748B' }}>
                      Deterministic extraction runs automatically. Check to supplement with AI rule categorization if configured.
                    </div>
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={consentAi}
                    onChange={(e) => setConsentAi(e.target.checked)}
                    style={{ accentColor: '#0A7352' }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 500 }}>Enable</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                {recentImports.length > 0 ? (
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    <Layers size={14} /> View Import History ({recentImports.length})
                  </button>
                ) : <div />}

                <button
                  className="btn-primary"
                  onClick={handleUpload}
                  disabled={!selectedFile || loading}
                  style={{ minWidth: 160 }}
                >
                  {loading ? 'Extracting Policies...' : 'Extract Policy Candidates'}
                </button>
              </div>

              {/* Past Imports Dropdown */}
              {showHistory && recentImports.length > 0 && (
                <div style={{ marginTop: 12, border: '1px solid #DCE5DF', borderRadius: 8, padding: 12, background: '#FAFAFA' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#123B2D' }}>
                    Previous Guideline Imports
                  </div>
                  <div style={{ display: 'grid', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                    {recentImports.map((imp) => (
                      <div
                        key={imp.id}
                        onClick={() => handleSelectPastImport(imp)}
                        style={{
                          padding: '10px 14px',
                          background: '#FFFFFF',
                          border: '1px solid #E5E7EB',
                          borderRadius: 6,
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{imp.filename}</div>
                          <div style={{ fontSize: 11, color: '#64748B' }}>
                            {imp.page_count} pages • {imp.candidate_count} candidates • {imp.created_at.slice(0, 10)}
                          </div>
                        </div>
                        <ChevronRight size={16} color="#94A3B8" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Candidate Review Workflow */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Provenance Card */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  backgroundColor: '#F8FAF8',
                  border: '1px solid #DCE5DF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: '#617168', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Source Document Provenance
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#123B2D' }}>
                    {activeImport.filename}
                  </div>
                  <div style={{ fontSize: 11, color: '#617168', fontFamily: 'monospace', marginTop: 2 }}>
                    SHA-256: {activeImport.document_hash.slice(0, 32)}...
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#0A7352' }}>
                      {candidates.length}
                    </div>
                    <div style={{ fontSize: 11, color: '#617168' }}>Extracted</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>
                      {candidates.filter((c) => c.status === 'APPROVED').length}
                    </div>
                    <div style={{ fontSize: 11, color: '#617168' }}>Approved</div>
                  </div>
                  <button
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      setActiveImport(null);
                      setCandidates([]);
                      setSelectedFile(null);
                    }}
                  >
                    Import Another Document
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: 10, borderBottom: '1px solid #E5E7EB', paddingBottom: 8 }}>
                <button
                  className={`btn-secondary btn-sm ${filterType === 'all' ? 'btn-primary' : ''}`}
                  onClick={() => setFilterType('all')}
                >
                  All Candidates ({candidates.length})
                </button>
                <button
                  className={`btn-secondary btn-sm ${filterType === 'rule' ? 'btn-primary' : ''}`}
                  onClick={() => setFilterType('rule')}
                >
                  Brand Rules ({candidates.filter((c) => c.candidate_type === 'rule').length})
                </button>
                <button
                  className={`btn-secondary btn-sm ${filterType === 'fact' ? 'btn-primary' : ''}`}
                  onClick={() => setFilterType('fact')}
                >
                  Brand Facts ({candidates.filter((c) => c.candidate_type === 'fact').length})
                </button>
              </div>

              {/* Candidate Cards List */}
              <div style={{ display: 'grid', gap: 12, maxHeight: 420, overflowY: 'auto' }}>
                {filteredCandidates.map((cand) => {
                  const isApproved = cand.status === 'APPROVED';
                  const isRejected = cand.status === 'REJECTED';
                  const isEditing = editingId === cand.id;

                  return (
                    <div
                      key={cand.id}
                      style={{
                        padding: 16,
                        borderRadius: 10,
                        border: isApproved
                          ? '1px solid #A7F3D0'
                          : isRejected
                          ? '1px solid #E5E7EB'
                          : '1px solid #DCE5DF',
                        backgroundColor: isApproved
                          ? '#F0FDF4'
                          : isRejected
                          ? '#F9FAFB'
                          : '#FFFFFF',
                        opacity: isRejected ? 0.65 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              padding: '2px 8px',
                              borderRadius: 4,
                              backgroundColor:
                                cand.severity === 'CRITICAL'
                                  ? '#FEE2E2'
                                  : cand.severity === 'HIGH'
                                  ? '#FEF3C7'
                                  : '#E0F2FE',
                              color:
                                cand.severity === 'CRITICAL'
                                  ? '#991B1B'
                                  : cand.severity === 'HIGH'
                                  ? '#92400E'
                                  : '#075985',
                            }}
                          >
                            {cand.severity}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#4B5563',
                              backgroundColor: '#F3F4F6',
                              padding: '2px 8px',
                              borderRadius: 4,
                            }}
                          >
                            {cand.category} • {cand.kind}
                          </span>
                          <span style={{ fontSize: 11, color: '#6B7280' }}>
                            Page {cand.page_number || 'N/A'} {cand.section_heading ? `• ${cand.section_heading}` : ''}
                          </span>
                        </div>

                        <div>
                          {isApproved && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <CheckCircle size={14} /> ACTIVE CONSTITUTION RULE
                            </span>
                          )}
                          {isRejected && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <XCircle size={14} /> REJECTED
                            </span>
                          )}
                          {!isApproved && !isRejected && (
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#D97706', display: 'flex', alignItems: 'center', gap: 4 }}>
                              PENDING APPROVAL
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pattern & Requirement */}
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                          <input
                            type="text"
                            value={editPattern}
                            onChange={(e) => setEditPattern(e.target.value)}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 6,
                              border: '1px solid #DCE5DF',
                              fontSize: 13,
                            }}
                            placeholder="Target Pattern / Phrase"
                          />
                          <textarea
                            value={editRequirement}
                            onChange={(e) => setEditRequirement(e.target.value)}
                            rows={2}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 6,
                              border: '1px solid #DCE5DF',
                              fontSize: 13,
                              resize: 'vertical',
                            }}
                            placeholder="Governance Requirement"
                          />
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn-secondary btn-sm" onClick={() => setEditingId(null)}>
                              Cancel
                            </button>
                            <button className="btn-primary btn-sm" onClick={() => handleSaveEdit(cand.id)}>
                              Save Edits
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                            Pattern: <span style={{ color: '#0A7352', fontFamily: 'monospace' }}>"{cand.pattern}"</span>
                          </div>
                          <div style={{ fontSize: 13, color: '#374151', marginBottom: 8 }}>
                            {cand.requirement}
                          </div>
                          {/* Excerpt quote */}
                          <div
                            style={{
                              padding: '8px 12px',
                              backgroundColor: 'rgba(0,0,0,0.03)',
                              borderLeft: '3px solid #0A7352',
                              borderRadius: 4,
                              fontSize: 12,
                              color: '#4B5563',
                              fontStyle: 'italic',
                              marginBottom: 10,
                            }}
                          >
                            "{cand.original_excerpt}"
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      {!isApproved && !isRejected && !isEditing && (
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => handleStartEdit(cand)}
                            title="Edit candidate rule before activation"
                          >
                            <Edit2 size={13} /> Edit
                          </button>
                          <button
                            className="btn-secondary btn-sm"
                            onClick={() => handleReject(cand)}
                            style={{ color: '#DC2626' }}
                          >
                            <XCircle size={13} /> Reject
                          </button>
                          <button
                            className="btn-primary btn-sm"
                            onClick={() => handleApprove(cand)}
                            style={{ backgroundColor: '#0A7352' }}
                          >
                            <Shield size={13} /> Approve into Constitution
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #DCE5DF',
            backgroundColor: '#F8FAF8',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: 12, color: '#617168' }}>
            {role === 'brand_admin' ? (
              <span style={{ color: '#0A7352', fontWeight: 600 }}>
                ● Brand Admin Authority Active: Approval writes directly to active constitution rules.
              </span>
            ) : (
              <span>Inspection mode: Administrator authority required to approve rules.</span>
            )}
          </div>
          <button className="btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
