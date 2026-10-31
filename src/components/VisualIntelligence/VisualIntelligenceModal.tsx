import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  api,
  LogoPlacementResult,
  TypographyComplianceResult,
  OcrResponse,
} from '../../services/api';

interface VisualIntelligenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'logo' | 'typography' | 'ocr';
}

export const VisualIntelligenceModal: React.FC<VisualIntelligenceModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'logo',
}) => {
  const [activeTab, setActiveTab] = useState<'logo' | 'typography' | 'ocr'>(defaultTab);

  // Logo Placement State
  const [canvasFile, setCanvasFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [expectedLocation, setExpectedLocation] = useState<string>('top-right');
  const [minClearspace, setMinClearspace] = useState<number>(0.5);
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoResult, setLogoResult] = useState<LogoPlacementResult | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

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

  if (!isOpen) return null;

  const handleRunLogoPlacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canvasFile || !logoFile) {
      setLogoError('Please provide both a creative canvas file and a reference logo template.');
      return;
    }
    setLogoLoading(true);
    setLogoError(null);
    try {
      const res = await api.checkLogoPlacement(canvasFile, logoFile, {
        expectedLocation: expectedLocation || undefined,
        minClearspaceRatio: minClearspace,
      });
      setLogoResult(res);
    } catch (err: any) {
      setLogoError(err?.message || 'Failed to evaluate logo placement compliance.');
    } finally {
      setLogoLoading(false);
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        backgroundColor: 'rgba(10, 36, 27, 0.75)',
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
          maxWidth: 820,
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
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
            backgroundColor: '#F8FAF8',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: '#ECFDF5',
                color: '#0A7352',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Eye size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#123B2D' }}>
                Visual Brand Intelligence & Asset Inspector
              </h2>
              <p style={{ margin: 0, fontSize: 12, color: '#617168' }}>
                Computer vision logo placement, typography compliance, and standalone OCR extraction
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              color: '#617168',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #DCE5DF',
            padding: '0 24px',
            backgroundColor: '#FFFFFF',
          }}
        >
          <button
            onClick={() => setActiveTab('logo')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeTab === 'logo' ? 700 : 500,
              color: activeTab === 'logo' ? '#0A7352' : '#617168',
              borderBottom: activeTab === 'logo' ? '2px solid #0A7352' : '2px solid transparent',
            }}
          >
            <Maximize2 size={15} />
            <span>Logo Placement & Clearspace</span>
          </button>

          <button
            onClick={() => setActiveTab('typography')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeTab === 'typography' ? 700 : 500,
              color: activeTab === 'typography' ? '#0A7352' : '#617168',
              borderBottom: activeTab === 'typography' ? '2px solid #0A7352' : '2px solid transparent',
            }}
          >
            <Type size={15} />
            <span>Typography & Font Hierarchy</span>
          </button>

          <button
            onClick={() => setActiveTab('ocr')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeTab === 'ocr' ? 700 : 500,
              color: activeTab === 'ocr' ? '#0A7352' : '#617168',
              borderBottom: activeTab === 'ocr' ? '2px solid #0A7352' : '2px solid transparent',
            }}
          >
            <FileText size={15} />
            <span>Standalone Document OCR</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          {/* TAB 1: LOGO PLACEMENT & CLEARSPACE */}
          {activeTab === 'logo' && (
            <div style={{ display: 'grid', gap: 20 }}>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                Validate that your marketing creative or document adheres to logo bounding exclusion zones (M &ge; 0.5H)
                and approved canvas quadrant placement using computer vision detection.
              </div>

              {logoError && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 6,
                    backgroundColor: '#FEE2E2',
                    color: '#991B1B',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={16} />
                  <span>{logoError}</span>
                </div>
              )}

              <form onSubmit={handleRunLogoPlacement} style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="label-sm" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                      Creative Canvas File (PNG / JPG / PDF) *
                    </label>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.pdf"
                      onChange={(e) => setCanvasFile(e.target.files?.[0] || null)}
                      className="input-premium"
                      style={{ padding: '6px 10px', fontSize: 13, width: '100%' }}
                    />
                    {canvasFile && (
                      <span style={{ fontSize: 11, color: '#0A7352', marginTop: 4, display: 'block' }}>
                        Selected: {canvasFile.name} ({(canvasFile.size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="label-sm" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                      Reference Logo Template (PNG / SVG) *
                    </label>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.svg"
                      onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                      className="input-premium"
                      style={{ padding: '6px 10px', fontSize: 13, width: '100%' }}
                    />
                    {logoFile && (
                      <span style={{ fontSize: 11, color: '#0A7352', marginTop: 4, display: 'block' }}>
                        Selected: {logoFile.name} ({(logoFile.size / 1024).toFixed(1)} KB)
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="label-sm" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                      Expected Canvas Quadrant / Location
                    </label>
                    <select
                      value={expectedLocation}
                      onChange={(e) => setExpectedLocation(e.target.value)}
                      className="input-premium"
                      style={{ width: '100%', height: 38 }}
                    >
                      <option value="top-right">Top Right (Recommended Brand Header)</option>
                      <option value="top-left">Top Left</option>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="center">Center</option>
                    </select>
                  </div>

                  <div>
                    <label className="label-sm" style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>
                      Minimum Required Clearspace Ratio
                    </label>
                    <select
                      value={minClearspace}
                      onChange={(e) => setMinClearspace(parseFloat(e.target.value))}
                      className="input-premium"
                      style={{ width: '100%', height: 38 }}
                    >
                      <option value="0.5">0.5H (Standard Exclusion Zone)</option>
                      <option value="0.75">0.75H (Generous Brand Padding)</option>
                      <option value="1.0">1.0H (High-Impact Hero Placement)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={logoLoading || !canvasFile || !logoFile}
                    style={{ minWidth: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    {logoLoading ? 'Detecting Placement...' : 'Audit Logo Placement & Clearspace'}
                  </button>
                </div>
              </form>

              {logoResult && (
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
                      {logoResult.placement_compliant && logoResult.clearspace_compliant ? (
                        <CheckCircle size={20} color="#059669" />
                      ) : (
                        <AlertTriangle size={20} color="#D97706" />
                      )}
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#123B2D' }}>
                        {logoResult.placement_compliant && logoResult.clearspace_compliant
                          ? 'Logo Placement Fully Compliant'
                          : 'Placement or Clearspace Warnings Detected'}
                      </span>
                    </div>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700,
                        backgroundColor: logoResult.matched ? '#ECFDF5' : '#FEE2E2',
                        color: logoResult.matched ? '#065F46' : '#991B1B',
                      }}
                    >
                      {logoResult.matched ? 'MATCH CONFIRMED' : 'NO LOGO DETECTED'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    <div style={{ padding: 10, backgroundColor: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Detected Location</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                        {logoResult.relative_position?.detected_location || 'N/A'}
                      </div>
                    </div>

                    <div style={{ padding: 10, backgroundColor: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Canvas Scale</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                        {logoResult.scale_percentage}%
                      </div>
                    </div>

                    <div style={{ padding: 10, backgroundColor: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Clearspace Ratio</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                        {logoResult.clearspace_ratio}H
                      </div>
                    </div>

                    <div style={{ padding: 10, backgroundColor: '#FFFFFF', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>Clearspace Check</div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: logoResult.clearspace_compliant ? '#059669' : '#DC2626',
                          marginTop: 2,
                        }}
                      >
                        {logoResult.clearspace_compliant ? 'Compliant' : 'Encroached'}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 13, color: '#334155', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                    {logoResult.summary}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TYPOGRAPHY & FONT COMPLIANCE */}
          {activeTab === 'typography' && (
            <div style={{ display: 'grid', gap: 20 }}>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                Inspect document font families, embedding styles, and heading hierarchy to detect unapproved typography
                or brand standard violations.
              </div>

              {typoError && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 6,
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
                    Document File to Inspect (PDF / Graphic Image) *
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
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
                    Approved Brand Font Families (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={approvedFonts}
                    onChange={(e) => setApprovedFonts(e.target.value)}
                    className="input-premium"
                    style={{ width: '100%', height: 38 }}
                    placeholder="e.g. Inter, Helvetica, Arial, Roboto"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={typoLoading || !typoFile}
                    style={{ minWidth: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    {typoLoading ? 'Analyzing Typography...' : 'Inspect Typography Compliance'}
                  </button>
                </div>
              </form>

              {typoResult && (
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
                      {typoResult.compliant ? (
                        <CheckCircle size={20} color="#059669" />
                      ) : (
                        <AlertTriangle size={20} color="#D97706" />
                      )}
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#123B2D' }}>
                        {typoResult.compliant ? 'Typography Standards Compliant' : 'Unapproved Typography Detected'}
                      </span>
                    </div>
                    <span
                      style={{
                        padding: '3px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700,
                        backgroundColor: typoResult.compliant ? '#ECFDF5' : '#FEF3C7',
                        color: typoResult.compliant ? '#065F46' : '#92400E',
                      }}
                    >
                      SCORE: {typoResult.compliance_score}%
                    </span>
                  </div>

                  {typoResult.unapproved_fonts?.length > 0 && (
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: 6,
                        backgroundColor: '#FEE2E2',
                        color: '#991B1B',
                        fontSize: 12,
                      }}
                    >
                      <b>Unapproved Fonts Detected:</b> {typoResult.unapproved_fonts.join(', ')}
                    </div>
                  )}

                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                      Detected Font Inventory ({typoResult.detected_fonts.length} styles):
                    </div>
                    <div style={{ display: 'grid', gap: 6 }}>
                      {typoResult.detected_fonts.map((f, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '6px 12px',
                            backgroundColor: '#FFFFFF',
                            borderRadius: 6,
                            border: '1px solid #E2E8F0',
                            fontSize: 12,
                          }}
                        >
                          <span style={{ fontWeight: 600 }}>{f.font_family} ({f.font_type})</span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: f.is_approved ? '#059669' : '#DC2626',
                            }}
                          >
                            {f.is_approved ? 'APPROVED' : 'UNAUTHORIZED'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ fontSize: 13, color: '#334155', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                    {typoResult.summary}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: STANDALONE DOCUMENT OCR */}
          {activeTab === 'ocr' && (
            <div style={{ display: 'grid', gap: 20 }}>
              <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                Extract and inspect digital or scanned textual passages from graphic imagery or PDF pages with optical
                character recognition confidence scores.
              </div>

              {ocrError && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 6,
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

                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#64748B' }}>
                    <span>Method: <b>{ocrResult.extraction_method}</b></span>
                    <span>Total Pages: <b>{ocrResult.total_pages}</b></span>
                    <span>Digital Pages: <b>{ocrResult.digital_pages}</b></span>
                    <span>Scanned Pages: <b>{ocrResult.scanned_pages}</b></span>
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
