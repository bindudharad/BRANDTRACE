import React, { useState, useEffect } from 'react';
import {
  Shield,
  Eye,
  Type,
  Maximize2,
  FileText,
  Upload,
  CheckCircle,
  AlertTriangle,
  XCircle,
  X,
  Copy,
  Check,
  Sparkles,
  Layers,
  Sliders,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Plus,
  Compass,
  CheckSquare,
} from 'lucide-react';
import {
  api,
  LogoReferenceItem,
  LogoStandardsConfig,
  LogoAnalysisResponse,
  LogoFindingItem,
  TypographyComplianceResult,
  OcrResponse,
} from '../../services/api';

interface VisualIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'verify' | 'references' | 'standards' | 'typography' | 'ocr';
  workspaceId?: string;
}

export const VisualIntelligenceModal: React.FC<VisualIntelligenceModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'verify',
  workspaceId = 'ws_default',
}) => {
  const [activeTab, setActiveTab] = useState<'verify' | 'references' | 'standards' | 'typography' | 'ocr'>(defaultTab);

  // Tab 1: Verify Logo State
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<LogoAnalysisResponse | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<number>(1);

  // Tab 2: Reference Library State
  const [references, setReferences] = useState<LogoReferenceItem[]>([]);
  const [refsLoading, setRefsLoading] = useState(false);
  const [refsError, setRefsError] = useState<string | null>(null);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [regFile, setRegFile] = useState<File | null>(null);
  const [regName, setRegName] = useState('');
  const [regVariant, setRegVariant] = useState('horizontal');
  const [regCategory, setRegCategory] = useState('primary');
  const [regDescription, setRegDescription] = useState('');
  const [regAutoApprove, setRegAutoApprove] = useState(true);
  const [regLoading, setRegLoading] = useState(false);

  // Tab 3: Standards State
  const [selectedRefId, setSelectedRefId] = useState<string>('');
  const [standards, setStandards] = useState<LogoStandardsConfig | null>(null);
  const [standardsLoading, setStandardsLoading] = useState(false);
  const [standardsSaving, setStandardsSaving] = useState(false);
  const [standardsSuccess, setStandardsSuccess] = useState(false);

  // Typography State
  const [typoFile, setTypoFile] = useState<File | null>(null);
  const [approvedFonts, setApprovedFonts] = useState<string>('Inter, Helvetica, Arial, Roboto, Montserrat, Segoe UI');
  const [typoLoading, setTypoLoading] = useState(false);
  const [typoResult, setTypoResult] = useState<TypographyComplianceResult | null>(null);
  const [typoError, setTypoError] = useState<string | null>(null);

  // OCR State
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResponse | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch references on open or tab change
  const loadReferences = async () => {
    setRefsLoading(true);
    setRefsError(null);
    try {
      const data = await api.listLogoReferences(workspaceId);
      setReferences(data);
      if (data.length > 0 && !selectedRefId) {
        setSelectedRefId(data[0].id);
      }
    } catch (err: any) {
      setRefsError(err?.message || 'Failed to load official logo references.');
    } finally {
      setRefsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadReferences();
    }
  }, [isOpen, workspaceId]);

  // Load standards for selected reference
  useEffect(() => {
    if (selectedRefId && (activeTab === 'standards' || activeTab === 'references')) {
      setStandardsLoading(true);
      setStandardsSuccess(false);
      api.getLogoStandards(selectedRefId, workspaceId)
        .then((data) => setStandards(data))
        .catch(() => setStandards(null))
        .finally(() => setStandardsLoading(false));
    }
  }, [selectedRefId, activeTab, workspaceId]);

  if (!isOpen) return null;

  // Handlers
  const handleRunVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyFile) {
      setVerifyError('Please select an artwork image (PNG, JPG) or multi-page PDF document.');
      return;
    }
    setVerifyLoading(true);
    setVerifyError(null);
    setVerifyResult(null);
    setSelectedPage(1);

    try {
      const isPdf = verifyFile.name.toLowerCase().endsWith('.pdf') || verifyFile.type === 'application/pdf';
      let res: LogoAnalysisResponse;
      if (isPdf) {
        res = await api.analyzeLogoPdf(verifyFile, verifyFile.name, workspaceId);
      } else {
        res = await api.analyzeLogoImage(verifyFile, verifyFile.name, workspaceId);
      }
      setVerifyResult(res);
    } catch (err: any) {
      setVerifyError(err?.message || 'Failed to analyze visual document.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleRegisterLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFile || !regName.trim()) {
      alert('Please provide a logo image file and reference name.');
      return;
    }
    setRegLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', regFile);
      fd.append('name', regName.trim());
      fd.append('variant', regVariant);
      fd.append('category', regCategory);
      fd.append('description', regDescription);
      fd.append('auto_approve', String(regAutoApprove));

      await api.registerLogoReference(fd, workspaceId);
      setShowRegisterForm(false);
      setRegFile(null);
      setRegName('');
      setRegDescription('');
      await loadReferences();
    } catch (err: any) {
      alert(err?.message || 'Failed to register reference logo.');
    } finally {
      setRegLoading(false);
    }
  };

  const handleApproveReference = async (id: string) => {
    try {
      await api.approveLogoReference(id, workspaceId);
      await loadReferences();
    } catch (err: any) {
      alert(err?.message || 'Failed to approve reference logo.');
    }
  };

  const handleDeactivateReference = async (id: string) => {
    try {
      await api.deactivateLogoReference(id, workspaceId);
      await loadReferences();
    } catch (err: any) {
      alert(err?.message || 'Failed to deactivate reference logo.');
    }
  };

  const handleSeedDemo = async () => {
    setRefsLoading(true);
    try {
      await api.seedDemoLogoReferences(workspaceId);
      await loadReferences();
    } catch (err: any) {
      alert(err?.message || 'Failed to seed demo reference logos.');
    } finally {
      setRefsLoading(false);
    }
  };

  const handleSaveStandards = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRefId || !standards) return;
    setStandardsSaving(true);
    setStandardsSuccess(false);
    try {
      const updated = await api.updateLogoStandards(selectedRefId, standards, workspaceId);
      setStandards(updated);
      setStandardsSuccess(true);
      setTimeout(() => setStandardsSuccess(false), 3000);
    } catch (err: any) {
      alert(err?.message || 'Failed to update standards.');
    } finally {
      setStandardsSaving(false);
    }
  };

  const handleResolveFinding = async (findingId: string) => {
    try {
      await api.resolveLogoFinding(findingId, 'RESOLVED', workspaceId);
      if (verifyResult) {
        setVerifyResult({
          ...verifyResult,
          findings: verifyResult.findings.map((f) =>
            f.id === findingId ? { ...f, disposition: 'RESOLVED' } : f
          ),
        });
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to resolve finding.');
    }
  };

  const handleRunTypographyCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typoFile) {
      setTypoError('Please select a document or design file to inspect.');
      return;
    }
    setTypoLoading(true);
    setTypoError(null);
    try {
      const fonts = approvedFonts.split(',').map((f) => f.trim()).filter(Boolean);
      const res = await api.checkTypographyCompliance(typoFile, fonts);
      setTypoResult(res);
    } catch (err: any) {
      setTypoError(err?.message || 'Failed to analyze document typography compliance.');
    } finally {
      setTypoLoading(false);
    }
  };

  const handleRunOcr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ocrFile) {
      setOcrError('Please select an image or scanned PDF for OCR extraction.');
      return;
    }
    setOcrLoading(true);
    setOcrError(null);
    try {
      const res = await api.processDocumentOcr(ocrFile);
      setOcrResult(res);
    } catch (err: any) {
      setOcrError(err?.message || 'Failed to extract text from document.');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter candidates & findings by selected page
  const pageCandidates = (verifyResult?.candidates || []).filter(
    (c) => c.page_number === selectedPage
  );
  const pageFindings = (verifyResult?.findings || []).filter(
    (f) => f.page_number === selectedPage
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          width: '100%',
          maxWidth: 1100,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#F8FAFC',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                backgroundColor: '#ECFDF5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0A7352',
              }}
            >
              <Shield size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Visual Brand Intelligence & Logo Compliance
              </h2>
              <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>
                Reference-based logo verification, geometric distortion detection & multi-page PDF compliance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: '8px 24px',
            borderBottom: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
          }}
        >
          <button
            onClick={() => setActiveTab('verify')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'verify' ? '#0A7352' : 'transparent',
              color: activeTab === 'verify' ? '#FFFFFF' : '#64748B',
            }}
          >
            <Eye size={16} />
            <span>Verify Document Logo</span>
          </button>

          <button
            onClick={() => setActiveTab('references')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'references' ? '#0A7352' : 'transparent',
              color: activeTab === 'references' ? '#FFFFFF' : '#64748B',
            }}
          >
            <BookOpen size={16} />
            <span>Official Logo Library ({references.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('standards')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'standards' ? '#0A7352' : 'transparent',
              color: activeTab === 'standards' ? '#FFFFFF' : '#64748B',
            }}
          >
            <Sliders size={16} />
            <span>Standards & Rules</span>
          </button>

          <button
            onClick={() => setActiveTab('typography')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'typography' ? '#0A7352' : 'transparent',
              color: activeTab === 'typography' ? '#FFFFFF' : '#64748B',
            }}
          >
            <Type size={16} />
            <span>Typography</span>
          </button>

          <button
            onClick={() => setActiveTab('ocr')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: activeTab === 'ocr' ? '#0A7352' : 'transparent',
              color: activeTab === 'ocr' ? '#FFFFFF' : '#64748B',
            }}
          >
            <FileText size={16} />
            <span>OCR Extraction</span>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, backgroundColor: '#F8FAFC' }}>
          {/* TAB 1: VERIFY DOCUMENT LOGO */}
          {activeTab === 'verify' && (
            <div style={{ display: 'grid', gap: 20 }}>
              {/* Upload Box */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  padding: 20,
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px 0', color: '#0F172A' }}>
                  Upload Visual Asset or Multi-Page PDF Document
                </h3>
                <form onSubmit={handleRunVerify} style={{ display: 'grid', gap: 14 }}>
                  <div>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.pdf"
                      onChange={(e) => setVerifyFile(e.target.files?.[0] || null)}
                      className="input-premium"
                      style={{ padding: '8px 12px', fontSize: 13, width: '100%' }}
                    />
                    {verifyFile && (
                      <span style={{ fontSize: 12, color: '#0A7352', marginTop: 6, display: 'block' }}>
                        Selected: <b>{verifyFile.name}</b> ({(verifyFile.size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#64748B' }}>
                      Compares against {references.filter((r) => r.approval_status === 'APPROVED').length} approved reference assets in this workspace.
                    </span>
                    <button
                      type="submit"
                      disabled={verifyLoading || !verifyFile}
                      className="btn-primary"
                      style={{
                        minWidth: 180,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      {verifyLoading ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Auditing Visual Compliance...</span>
                        </>
                      ) : (
                        <>
                          <Shield size={16} />
                          <span>Run Logo Verification</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {verifyError && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 8,
                      backgroundColor: '#FEE2E2',
                      color: '#991B1B',
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <AlertTriangle size={16} />
                    <span>{verifyError}</span>
                  </div>
                )}
              </div>

              {/* Verification Results View */}
              {verifyResult && (
                <div style={{ display: 'grid', gap: 20 }}>
                  {/* Summary Banner */}
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: 12,
                      padding: 20,
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            padding: '4px 12px',
                            borderRadius: 20,
                            fontSize: 13,
                            fontWeight: 700,
                            backgroundColor:
                              verifyResult.overall_verdict === 'COMPLIANT'
                                ? '#ECFDF5'
                                : verifyResult.overall_verdict === 'PARTIALLY_COMPLIANT'
                                ? '#FEF3C7'
                                : verifyResult.overall_verdict === 'NEEDS_REVIEW'
                                ? '#F3E8FF'
                                : '#FEE2E2',
                            color:
                              verifyResult.overall_verdict === 'COMPLIANT'
                                ? '#065F46'
                                : verifyResult.overall_verdict === 'PARTIALLY_COMPLIANT'
                                ? '#92400E'
                                : verifyResult.overall_verdict === 'NEEDS_REVIEW'
                                ? '#6B21A8'
                                : '#991B1B',
                          }}
                        >
                          VERDICT: {verifyResult.overall_verdict.replace(/_/g, ' ')}
                        </span>
                        <span style={{ fontSize: 13, color: '#64748B' }}>
                          File: <b>{verifyResult.filename}</b> ({verifyResult.source_type}, {verifyResult.page_count} page{verifyResult.page_count > 1 ? 's' : ''})
                        </span>
                      </div>
                      <p style={{ fontSize: 13, color: '#334155', margin: '8px 0 0 0' }}>
                        Found {verifyResult.summary.total_candidates} mark candidate{verifyResult.summary.total_candidates !== 1 ? 's' : ''} •{' '}
                        {verifyResult.summary.approved_matches} approved match{verifyResult.summary.approved_matches !== 1 ? 'es' : ''} •{' '}
                        {verifyResult.summary.findings_count} actionable finding{verifyResult.summary.findings_count !== 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* PDF Page Selector */}
                    {verifyResult.page_count > 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>Page:</span>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {Array.from({ length: verifyResult.page_count }, (_, i) => i + 1).map((pn) => (
                            <button
                              key={pn}
                              onClick={() => setSelectedPage(pn)}
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 6,
                                border: '1px solid #CBD5E1',
                                backgroundColor: selectedPage === pn ? '#0A7352' : '#FFFFFF',
                                color: selectedPage === pn ? '#FFFFFF' : '#1E293B',
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {pn}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Candidates on Selected Page */}
                  <div style={{ display: 'grid', gap: 16 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      Detected Logo Marks on Page {selectedPage} ({pageCandidates.length})
                    </h4>

                    {pageCandidates.length === 0 ? (
                      <div
                        style={{
                          padding: 24,
                          textAlign: 'center',
                          backgroundColor: '#FFFFFF',
                          borderRadius: 12,
                          border: '1px dashed #CBD5E1',
                          color: '#64748B',
                          fontSize: 13,
                        }}
                      >
                        No logo candidates detected on Page {selectedPage}.
                      </div>
                    ) : (
                      pageCandidates.map((cand, idx) => {
                        const matchedRef = references.find((r) => r.id === cand.matched_reference_id);
                        return (
                          <div
                            key={cand.id}
                            style={{
                              backgroundColor: '#FFFFFF',
                              borderRadius: 12,
                              padding: 20,
                              border: '1px solid #E2E8F0',
                              display: 'grid',
                              gap: 16,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                                  Mark #{idx + 1} ({cand.bounding_box.width} x {cand.bounding_box.height} px)
                                </span>
                                <span
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: 12,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    backgroundColor:
                                      cand.candidate_verdict === 'APPROVED_MATCH' ? '#ECFDF5' : '#FEE2E2',
                                    color:
                                      cand.candidate_verdict === 'APPROVED_MATCH' ? '#065F46' : '#991B1B',
                                  }}
                                >
                                  {cand.candidate_verdict.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>
                                Match Score: <b>{cand.similarity_score.toFixed(1)}%</b> ({cand.confidence_band})
                              </span>
                            </div>

                            {/* Side-by-Side Comparison */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 16,
                                padding: 14,
                                backgroundColor: '#F8FAFC',
                                borderRadius: 8,
                                border: '1px solid #E2E8F0',
                              }}
                            >
                              {/* Left: Approved Reference */}
                              <div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                                  Official Approved Reference
                                </span>
                                <div style={{ marginTop: 8, fontSize: 13, color: '#1E293B' }}>
                                  <div><b>{matchedRef?.name || 'Approved Brand Standard'}</b> ({cand.matched_variant || 'primary'})</div>
                                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                                    Target Aspect: <b>{matchedRef?.aspect_ratio.toFixed(3) || '3.000'}</b> • Version {matchedRef?.version || '1.0'}
                                  </div>
                                </div>
                              </div>

                              {/* Right: Detected Candidate */}
                              <div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                                  Detected Artwork Mark
                                </span>
                                <div style={{ marginTop: 8, fontSize: 13, color: '#1E293B' }}>
                                  <div>
                                    Observed Aspect: <b>{cand.detected_aspect_ratio.toFixed(3)}</b>{' '}
                                    {matchedRef && (
                                      <span
                                        style={{
                                          fontSize: 11,
                                          fontWeight: 700,
                                          color:
                                            Math.abs(cand.detected_aspect_ratio - matchedRef.aspect_ratio) / matchedRef.aspect_ratio > 0.05
                                              ? '#DC2626'
                                              : '#059669',
                                        }}
                                      >
                                        ({(((cand.detected_aspect_ratio - matchedRef.aspect_ratio) / matchedRef.aspect_ratio) * 100).toFixed(1)}% dev)
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                                    Location: ({cand.bounding_box.x}, {cand.bounding_box.y}) • Canvas: {cand.bounding_box.canvas_width} x {cand.bounding_box.canvas_height} px
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Difference Heatmap Overlay (if available) */}
                            {cand.difference_overlay && (
                              <div>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 6 }}>
                                  VISUAL DIFFERENCE HEATMAP OVERLAY
                                </span>
                                <img
                                  src={`data:image/jpeg;base64,${cand.difference_overlay}`}
                                  alt="Difference heatmap"
                                  style={{
                                    maxWidth: '100%',
                                    height: 'auto',
                                    borderRadius: 6,
                                    border: '1px solid #CBD5E1',
                                  }}
                                />
                              </div>
                            )}

                            {/* Checks Summary Grid */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                                gap: 10,
                              }}
                            >
                              {Object.entries(cand.checks_summary).map(([key, val]) => (
                                <div
                                  key={key}
                                  style={{
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    backgroundColor: val === 'COMPLIANT' || val === 'APPROVED_MATCH' ? '#ECFDF5' : '#FEF2F2',
                                    border: `1px solid ${val === 'COMPLIANT' || val === 'APPROVED_MATCH' ? '#A7F3D0' : '#FECACA'}`,
                                    fontSize: 11,
                                  }}
                                >
                                  <span style={{ color: '#64748B', textTransform: 'capitalize', display: 'block' }}>
                                    {key.replace(/_/g, ' ')}
                                  </span>
                                  <b
                                    style={{
                                      color: val === 'COMPLIANT' || val === 'APPROVED_MATCH' ? '#065F46' : '#991B1B',
                                      fontSize: 12,
                                    }}
                                  >
                                    {String(val).replace(/_/g, ' ')}
                                  </b>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Findings on Selected Page */}
                  {pageFindings.length > 0 && (
                    <div style={{ display: 'grid', gap: 12 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: '#DC2626', margin: 0 }}>
                        Actionable Compliance Findings ({pageFindings.length})
                      </h4>
                      {pageFindings.map((f) => (
                        <div
                          key={f.id}
                          style={{
                            backgroundColor: '#FFFFFF',
                            borderRadius: 10,
                            padding: 16,
                            borderLeft: `4px solid ${f.severity === 'CRITICAL' || f.severity === 'HIGH' ? '#DC2626' : '#F59E0B'}`,
                            borderTop: '1px solid #E2E8F0',
                            borderRight: '1px solid #E2E8F0',
                            borderBottom: '1px solid #E2E8F0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 16,
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 12,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  backgroundColor: '#FEE2E2',
                                  color: '#991B1B',
                                }}
                              >
                                {f.severity}
                              </span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                                {f.title}
                              </span>
                              <span style={{ fontSize: 11, color: '#64748B' }}>
                                [{f.finding_type}]
                              </span>
                            </div>
                            <p style={{ fontSize: 12, color: '#475569', margin: '6px 0' }}>
                              {f.explanation}
                            </p>
                            <div style={{ fontSize: 11, color: '#64748B', display: 'flex', gap: 16 }}>
                              <span>Expected: <b>{f.expected_standard}</b></span>
                              <span>Observed: <b>{f.observed_value}</b></span>
                            </div>
                            <div style={{ fontSize: 11, color: '#0A7352', marginTop: 4 }}>
                              Recommended: {f.recommended_action}
                            </div>
                          </div>

                          <div>
                            {f.disposition === 'RESOLVED' ? (
                              <span
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: '#059669',
                                  padding: '4px 8px',
                                  borderRadius: 6,
                                  backgroundColor: '#ECFDF5',
                                }}
                              >
                                <Check size={14} /> Resolved
                              </span>
                            ) : (
                              <button
                                onClick={() => handleResolveFinding(f.id)}
                                className="btn-secondary btn-sm"
                                style={{ fontSize: 11, padding: '4px 10px' }}
                              >
                                Resolve
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OFFICIAL LOGO LIBRARY */}
          {activeTab === 'references' && (
            <div style={{ display: 'grid', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0F172A' }}>
                    Official Logo Reference Library
                  </h3>
                  <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>
                    Official organization references used for cryptographic and visual compliance matching
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleSeedDemo}
                    disabled={refsLoading}
                    className="btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Sparkles size={14} color="#0A7352" />
                    <span>Seed Nexus Logistics Standards</span>
                  </button>
                  <button
                    onClick={() => setShowRegisterForm(!showRegisterForm)}
                    className="btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Plus size={14} />
                    <span>{showRegisterForm ? 'Close Form' : 'Register Official Logo'}</span>
                  </button>
                </div>
              </div>

              {/* Registration Form Drawer */}
              {showRegisterForm && (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    padding: 20,
                    border: '1px solid #0A7352',
                    boxShadow: '0 4px 12px rgba(10, 115, 82, 0.08)',
                  }}
                >
                  <h4 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 14px 0', color: '#0A7352' }}>
                    Register Approved Reference Logo
                  </h4>
                  <form onSubmit={handleRegisterLogo} style={{ display: 'grid', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div>
                        <label className="label-sm" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
                          Reference Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="e.g. Nexus Primary Horizontal"
                          className="input-premium"
                          style={{ width: '100%', fontSize: 13, padding: '8px 10px' }}
                        />
                      </div>
                      <div>
                        <label className="label-sm" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
                          Logo Variant *
                        </label>
                        <select
                          value={regVariant}
                          onChange={(e) => setRegVariant(e.target.value)}
                          className="input-premium"
                          style={{ width: '100%', fontSize: 13, padding: '8px 10px' }}
                        >
                          <option value="horizontal">Primary Horizontal</option>
                          <option value="vertical">Vertical / Stacked</option>
                          <option value="symbol">Symbol / Icon Only</option>
                          <option value="monochrome">Monochrome Dark</option>
                          <option value="reversed">Reversed White</option>
                          <option value="partner_lockup">Partner Lockup</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div>
                        <label className="label-sm" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
                          Category
                        </label>
                        <select
                          value={regCategory}
                          onChange={(e) => setRegCategory(e.target.value)}
                          className="input-premium"
                          style={{ width: '100%', fontSize: 13, padding: '8px 10px' }}
                        >
                          <option value="primary">Primary Brand</option>
                          <option value="subbrand">Sub-Brand</option>
                          <option value="partner">Partner / Co-Brand</option>
                          <option value="endorsement">Endorsed Mark</option>
                        </select>
                      </div>
                      <div>
                        <label className="label-sm" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
                          Logo Artwork File (PNG, SVG, JPG) *
                        </label>
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.svg,.webp"
                          required
                          onChange={(e) => setRegFile(e.target.files?.[0] || null)}
                          className="input-premium"
                          style={{ width: '100%', fontSize: 12, padding: '6px 10px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label-sm" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
                        Description & Usage Guidelines
                      </label>
                      <input
                        type="text"
                        value={regDescription}
                        onChange={(e) => setRegDescription(e.target.value)}
                        placeholder="e.g. Master logo for all customer-facing collateral and digital banners."
                        className="input-premium"
                        style={{ width: '100%', fontSize: 13, padding: '8px 10px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={regAutoApprove}
                          onChange={(e) => setRegAutoApprove(e.target.checked)}
                        />
                        <span>Auto-approve immediately into Active Standards</span>
                      </label>

                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => setShowRegisterForm(false)}
                          className="btn-secondary btn-sm"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={regLoading}
                          className="btn-primary btn-sm"
                        >
                          {regLoading ? 'Registering...' : 'Save Reference'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Reference Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: 16,
                }}
              >
                {references.map((ref) => {
                  let colors: string[] = [];
                  try {
                    colors = JSON.parse(ref.dominant_colors_json || '[]');
                  } catch {
                    colors = ref.primary_color_hex ? [ref.primary_color_hex] : [];
                  }

                  return (
                    <div
                      key={ref.id}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 12,
                        padding: 18,
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        {/* Header & Status */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 10,
                                fontSize: 10,
                                fontWeight: 700,
                                backgroundColor:
                                  ref.approval_status === 'APPROVED'
                                    ? '#ECFDF5'
                                    : ref.approval_status === 'PENDING_APPROVAL'
                                    ? '#FEF3C7'
                                    : '#F1F5F9',
                                color:
                                  ref.approval_status === 'APPROVED'
                                    ? '#065F46'
                                    : ref.approval_status === 'PENDING_APPROVAL'
                                    ? '#92400E'
                                    : '#64748B',
                              }}
                            >
                              {ref.approval_status}
                            </span>
                            <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '6px 0 2px 0' }}>
                              {ref.name}
                            </h4>
                            <span style={{ fontSize: 11, color: '#64748B' }}>
                              Variant: <b>{ref.variant}</b> • v{ref.version}
                            </span>
                          </div>
                        </div>

                        {/* Dimensions & Hash */}
                        <div
                          style={{
                            margin: '12px 0',
                            padding: '8px 12px',
                            backgroundColor: '#F8FAFC',
                            borderRadius: 6,
                            fontSize: 11,
                            color: '#475569',
                            display: 'grid',
                            gap: 4,
                          }}
                        >
                          <div>Dimensions: <b>{ref.width} x {ref.height} px</b> (Aspect: {ref.aspect_ratio.toFixed(3)})</div>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            SHA-256: <code style={{ fontSize: 10 }}>{ref.original_hash.slice(0, 16)}...</code>
                          </div>
                        </div>

                        {/* Approved Colors Chips */}
                        <div>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                            Palette:
                          </span>
                          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                            {colors.map((c, idx) => (
                              <div
                                key={idx}
                                title={c}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  backgroundColor: '#F1F5F9',
                                  fontSize: 10,
                                }}
                              >
                                <span
                                  style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: 2,
                                    backgroundColor: c,
                                    border: '1px solid #CBD5E1',
                                  }}
                                />
                                <code>{c}</code>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div
                        style={{
                          marginTop: 16,
                          paddingTop: 12,
                          borderTop: '1px solid #F1F5F9',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <button
                          onClick={() => {
                            setSelectedRefId(ref.id);
                            setActiveTab('standards');
                          }}
                          className="btn-secondary btn-sm"
                          style={{ fontSize: 11, padding: '4px 8px' }}
                        >
                          <Sliders size={12} style={{ marginRight: 4 }} />
                          Standards
                        </button>

                        <div style={{ display: 'flex', gap: 6 }}>
                          {ref.approval_status !== 'APPROVED' ? (
                            <button
                              onClick={() => handleApproveReference(ref.id)}
                              className="btn-primary btn-sm"
                              style={{ fontSize: 11, padding: '4px 8px' }}
                            >
                              Approve
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDeactivateReference(ref.id)}
                              className="btn-secondary btn-sm"
                              style={{ fontSize: 11, padding: '4px 8px', color: '#DC2626' }}
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: STANDARDS & RULES */}
          {activeTab === 'standards' && (
            <div style={{ display: 'grid', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#0F172A' }}>
                    Logo Standards & Geometric Rules Configuration
                  </h3>
                  <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>
                    Configure mathematical compliance thresholds, clearspace ratios, and allowed quadrants
                  </p>
                </div>

                {/* Reference Selector */}
                <select
                  value={selectedRefId}
                  onChange={(e) => setSelectedRefId(e.target.value)}
                  className="input-premium"
                  style={{ fontSize: 13, padding: '6px 12px', minWidth: 220 }}
                >
                  {references.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.variant})
                    </option>
                  ))}
                </select>
              </div>

              {standardsLoading || !standards ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#64748B' }}>
                  Loading standards configuration...
                </div>
              ) : (
                <form
                  onSubmit={handleSaveStandards}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    padding: 24,
                    border: '1px solid #E2E8F0',
                    display: 'grid',
                    gap: 20,
                  }}
                >
                  {standardsSuccess && (
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 8,
                        backgroundColor: '#ECFDF5',
                        color: '#065F46',
                        fontSize: 13,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <CheckCircle size={16} />
                      <span>Standards successfully updated and synced with verification engine!</span>
                    </div>
                  )}

                  {/* Section 1: Geometric Distortion & Size */}
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0A7352', textTransform: 'uppercase', margin: '0 0 12px 0' }}>
                      1. Geometric Distortion & Dimensions
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                      <div>
                        <label className="label-sm" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
                          Aspect Ratio Tolerance (%): {(standards.aspect_ratio_tolerance * 100).toFixed(1)}%
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          step="0.5"
                          value={standards.aspect_ratio_tolerance * 100}
                          onChange={(e) =>
                            setStandards({
                              ...standards,
                              aspect_ratio_tolerance: parseFloat(e.target.value) / 100,
                            })
                          }
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <label className="label-sm" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
                          Min Digital Size (W x H px)
                        </label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            type="number"
                            value={standards.min_width_px}
                            onChange={(e) =>
                              setStandards({ ...standards, min_width_px: parseInt(e.target.value) || 0 })
                            }
                            className="input-premium"
                            style={{ width: '50%', fontSize: 13, padding: '6px' }}
                          />
                          <input
                            type="number"
                            value={standards.min_height_px}
                            onChange={(e) =>
                              setStandards({ ...standards, min_height_px: parseInt(e.target.value) || 0 })
                            }
                            className="input-premium"
                            style={{ width: '50%', fontSize: 13, padding: '6px' }}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="label-sm" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
                          Min PDF Physical Print Width
                        </label>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            type="number"
                            step="0.5"
                            value={standards.min_width_pt}
                            onChange={(e) =>
                              setStandards({ ...standards, min_width_pt: parseFloat(e.target.value) || 0 })
                            }
                            placeholder="pt"
                            className="input-premium"
                            style={{ width: '50%', fontSize: 13, padding: '6px' }}
                          />
                          <input
                            type="number"
                            step="0.5"
                            value={standards.min_width_mm}
                            onChange={(e) =>
                              setStandards({ ...standards, min_width_mm: parseFloat(e.target.value) || 0 })
                            }
                            placeholder="mm"
                            className="input-premium"
                            style={{ width: '50%', fontSize: 13, padding: '6px' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Clearspace & Placement */}
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0A7352', textTransform: 'uppercase', margin: '0 0 12px 0' }}>
                      2. Clearspace Exclusion & Placement Quadrants
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label className="label-sm" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
                          Clearspace Margin Ratio (M &ge; ratio &times; Height): <b>{standards.min_clearspace_ratio.toFixed(2)}H</b>
                        </label>
                        <input
                          type="range"
                          min="0.25"
                          max="1.50"
                          step="0.05"
                          value={standards.min_clearspace_ratio}
                          onChange={(e) =>
                            setStandards({
                              ...standards,
                              min_clearspace_ratio: parseFloat(e.target.value),
                            })
                          }
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <label className="label-sm" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
                          Permitted Quadrants
                        </label>
                        <select
                          value={standards.permitted_quadrants[0] || 'ALL'}
                          onChange={(e) =>
                            setStandards({
                              ...standards,
                              permitted_quadrants: [e.target.value],
                            })
                          }
                          className="input-premium"
                          style={{ width: '100%', fontSize: 13, padding: '8px' }}
                        >
                          <option value="ALL">Any Quadrant Permitted (ALL)</option>
                          <option value="TOP_LEFT">Top Left Corner Only</option>
                          <option value="TOP_RIGHT">Top Right Corner Only</option>
                          <option value="HEADER_ONLY">Header Only (Top Left or Top Right)</option>
                          <option value="BOTTOM_RIGHT">Bottom Right Only</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Color Tolerance & PDF Multi-Page Policy */}
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0A7352', textTransform: 'uppercase', margin: '0 0 12px 0' }}>
                      3. Color Science (&Delta;E) & Multi-Page Document Rules
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <label className="label-sm" style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}>
                          Color &Delta;E Tolerance (CIE76): <b>{standards.color_delta_e_tolerance.toFixed(1)}</b>
                        </label>
                        <input
                          type="range"
                          min="5"
                          max="25"
                          step="1"
                          value={standards.color_delta_e_tolerance}
                          onChange={(e) =>
                            setStandards({
                              ...standards,
                              color_delta_e_tolerance: parseFloat(e.target.value),
                            })
                          }
                          style={{ width: '100%' }}
                        />
                        <span style={{ fontSize: 11, color: '#64748B' }}>
                          Standard digital tolerance is 16.0 to accommodate JPEG compression while catching recolored logos.
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                          <input
                            type="checkbox"
                            checked={standards.enforce_on_every_page}
                            onChange={(e) =>
                              setStandards({
                                ...standards,
                                enforce_on_every_page: e.target.checked,
                              })
                            }
                          />
                          <span>Enforce Approved Logo Presence on Every PDF Page</span>
                        </label>
                        <span style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>
                          Flags a HIGH severity finding if any page in a multi-page PDF omits this logo.
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                    <button
                      type="submit"
                      disabled={standardsSaving}
                      className="btn-primary"
                      style={{ minWidth: 160 }}
                    >
                      {standardsSaving ? 'Saving Changes...' : 'Save Standards'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 4: TYPOGRAPHY (PRESERVED) */}
          {activeTab === 'typography' && (
            <div style={{ display: 'grid', gap: 16 }}>
              {typoError && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: '#FEE2E2',
                    color: '#991B1B',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={16} />
                  <span>{typoError}</span>
                </div>
              )}

              <form onSubmit={handleRunTypographyCheck} style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label className="label-sm" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Upload Document or Design File (PDF, PNG, JPG) *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setTypoFile(e.target.files?.[0] || null)}
                    className="input-premium"
                    style={{ padding: '6px 10px', fontSize: 13, width: '100%' }}
                  />
                  {typoFile && (
                    <span style={{ fontSize: 11, color: '#0A7352', marginTop: 4, display: 'block' }}>
                      Selected: {typoFile.name} ({(typoFile.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>

                <div>
                  <label className="label-sm" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Approved Brand Fonts (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={approvedFonts}
                    onChange={(e) => setApprovedFonts(e.target.value)}
                    className="input-premium"
                    style={{ width: '100%', fontSize: 13, padding: '8px 10px' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={typoLoading || !typoFile}
                    style={{ minWidth: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    {typoLoading ? 'Analyzing Fonts...' : 'Analyze Document Typography'}
                  </button>
                </div>
              </form>

              {typoResult && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 18,
                    borderRadius: 10,
                    backgroundColor: typoResult.is_compliant ? '#F8FAF8' : '#FEF2F2',
                    border: `1px solid ${typoResult.is_compliant ? '#DCE5DF' : '#FECACA'}`,
                    display: 'grid',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {typoResult.is_compliant ? (
                        <CheckCircle size={20} color="#059669" />
                      ) : (
                        <XCircle size={20} color="#DC2626" />
                      )}
                      <span style={{ fontSize: 15, fontWeight: 700, color: typoResult.is_compliant ? '#123B2D' : '#991B1B' }}>
                        Typography Status: {typoResult.compliance_status}
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: 13, color: '#475569', margin: 0 }}>
                    {typoResult.explanation}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: OCR (PRESERVED) */}
          {activeTab === 'ocr' && (
            <div style={{ display: 'grid', gap: 16 }}>
              {ocrError && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: '#FEE2E2',
                    color: '#991B1B',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={16} />
                  <span>{ocrError}</span>
                </div>
              )}

              <form onSubmit={handleRunOcr} style={{ display: 'grid', gap: 16 }}>
                <div>
                  <label className="label-sm" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Select Image or Scanned Document File *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => setOcrFile(e.target.files?.[0] || null)}
                    className="input-premium"
                    style={{ padding: '6px 10px', fontSize: 13, width: '100%' }}
                  />
                  {ocrFile && (
                    <span style={{ fontSize: 11, color: '#0A7352', marginTop: 4, display: 'block' }}>
                      Selected: {ocrFile.name} ({(ocrFile.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={ocrLoading || !ocrFile}
                    style={{ minWidth: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    {ocrLoading ? 'Extracting Text...' : 'Extract Text via OCR'}
                  </button>
                </div>
              </form>

              {ocrResult && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 18,
                    borderRadius: 10,
                    backgroundColor: '#F8FAF8',
                    border: '1px solid #DCE5DF',
                    display: 'grid',
                    gap: 14,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle size={20} color="#059669" />
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#123B2D' }}>
                        Text Extracted Successfully ({ocrResult.words_detected} words)
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 700,
                          backgroundColor: '#ECFDF5',
                          color: '#065F46',
                        }}
                      >
                        CONFIDENCE: {Math.round(ocrResult.confidence * 100)}%
                      </span>
                      <button
                        onClick={() => handleCopyText(ocrResult.extracted_text)}
                        className="btn-secondary btn-sm"
                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                      >
                        {copied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                        <span>{copied ? 'Copied' : 'Copy Text'}</span>
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      maxHeight: 220,
                      overflowY: 'auto',
                      backgroundColor: '#FFFFFF',
                      padding: 14,
                      borderRadius: 8,
                      border: '1px solid #E2E8F0',
                      fontSize: 13,
                      lineHeight: 1.6,
                      color: '#1E293B',
                      whiteSpace: 'pre-wrap',
                      fontFamily: 'monospace',
                    }}
                  >
                    {ocrResult.extracted_text || 'No readable text content extracted.'}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
