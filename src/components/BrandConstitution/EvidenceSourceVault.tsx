import React, { useState, useEffect } from 'react';
import {
  Shield,
  FileText,
  Search,
  Plus,
  CheckCircle,
  AlertTriangle,
  Clock,
  Hash,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  Calendar,
  Lock,
} from 'lucide-react';
import {
  api,
  EvidenceSource,
  UserRole,
} from '../../services/api';

interface EvidenceSourceVaultProps {
  role: UserRole;
  onSelectRule?: (ruleId: string) => void;
  onSelectFact?: (factId: string) => void;
}

export const EvidenceSourceVault: React.FC<EvidenceSourceVaultProps> = ({
  role,
  onSelectRule,
  onSelectFact,
}) => {
  const [sources, setSources] = useState<EvidenceSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedSource, setSelectedSource] = useState<EvidenceSource | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('BRAND_GUIDELINE');
  const [newFileName, setNewFileName] = useState('');
  const [newVersion, setNewVersion] = useState('1.0');
  const [newPageRef, setNewPageRef] = useState('Page 1');
  const [newSectionRef, setNewSectionRef] = useState('');
  const [newExcerpt, setNewExcerpt] = useState('');
  const [newOwner, setNewOwner] = useState('Brand Admin');
  const [newExpiresAt, setNewExpiresAt] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = async () => {
    setLoading(true);
    try {
      const data = await api.evidenceSources();
      setSources(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load evidence source registry.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newExcerpt.trim()) {
      setError('Title and supporting excerpt are required.');
      return;
    }

    try {
      await api.createEvidenceSource({
        title: newTitle,
        source_type: newType,
        file_name: newFileName || undefined,
        version: newVersion,
        page_reference: newPageRef || undefined,
        section_reference: newSectionRef || undefined,
        excerpt: newExcerpt,
        owner: newOwner,
        verification_status: 'VERIFIED',
        expires_at: newExpiresAt ? `${newExpiresAt}T00:00:00Z` : undefined,
      });

      setIsCreateModalOpen(false);
      setNewTitle('');
      setNewFileName('');
      setNewExcerpt('');
      setNewSectionRef('');
      setNewExpiresAt('');
      setActionSuccess('Evidence source registered successfully with SHA-256 provenance hash.');
      loadSources();
    } catch (err: any) {
      setError(err?.message || 'Failed to register evidence source.');
    }
  };

  const filteredSources = sources.filter((s) => {
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.file_name && s.file_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.owner.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'ALL' || s.source_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="card-premium">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#123B2D' }}>
              Evidence Source Vault
            </h2>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#0A7352',
                backgroundColor: '#E6F4EA',
                padding: '2px 8px',
                borderRadius: 4,
              }}
            >
              {sources.length} Registered Sources
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#617168' }}>
            Authoritative registry of verified brand standards, launch briefs, and regulatory sources linking to rules and facts.
          </p>
        </div>

        <button
          className="btn-primary btn-sm"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus size={14} /> Register Evidence Source
        </button>
      </div>

      {actionSuccess && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: 8,
            color: '#065F46',
            fontSize: 13,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircle size={15} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '10px 14px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: 8,
            color: '#991B1B',
            fontSize: 13,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: 10, top: 10 }} />
          <input
            type="text"
            placeholder="Search evidence title, excerpt, document name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 32px',
              borderRadius: 6,
              border: '1px solid #DCE5DF',
              fontSize: 13,
              boxSizing: 'border-box',
            }}
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid #DCE5DF',
            fontSize: 13,
            backgroundColor: '#FFFFFF',
            cursor: 'pointer',
          }}
        >
          <option value="ALL">All Source Types</option>
          <option value="BRAND_GUIDELINE">Brand Guidelines</option>
          <option value="PRODUCT_SPEC">Product Specifications</option>
          <option value="LEGAL_POLICY">Legal Policies</option>
          <option value="REGULATORY_FILING">Regulatory Filings</option>
        </select>
      </div>

      {/* Sources Table / List */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#617168', fontSize: 13 }}>
          Loading Evidence Source Vault...
        </div>
      ) : filteredSources.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: 'center',
            border: '1px dashed #DCE5DF',
            borderRadius: 8,
            color: '#617168',
            fontSize: 13,
          }}
        >
          No evidence sources match the current filter.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {filteredSources.map((s) => {
            const isExpanded = expandedId === s.id;
            const isExpired = s.expires_at && new Date(s.expires_at) < new Date();

            return (
              <div
                key={s.id}
                style={{
                  border: '1px solid #DCE5DF',
                  borderRadius: 8,
                  backgroundColor: '#FFFFFF',
                  overflow: 'hidden',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Source Row Summary */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : s.id)}
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    backgroundColor: isExpanded ? '#F8FAF8' : '#FFFFFF',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        backgroundColor: '#E6F4EA',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FileText size={16} color="#0A7352" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#123B2D' }}>
                          {s.title}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            backgroundColor: '#F1F5F9',
                            color: '#475569',
                            padding: '1px 6px',
                            borderRadius: 4,
                          }}
                        >
                          v{s.version}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 4,
                            backgroundColor: isExpired
                              ? '#FEE2E2'
                              : s.verification_status === 'VERIFIED'
                              ? '#ECFDF5'
                              : '#FEF3C7',
                            color: isExpired
                              ? '#991B1B'
                              : s.verification_status === 'VERIFIED'
                              ? '#065F46'
                              : '#92400E',
                          }}
                        >
                          {isExpired ? 'EXPIRED' : s.verification_status}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#617168', marginTop: 2 }}>
                        {s.file_name || 'Direct Excerpt'} • {s.page_reference || 'Ref N/A'} • Owner: {s.owner}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#0A7352' }}>
                        {(s.linked_rules_count || 0)} Rules • {(s.linked_facts_count || 0)} Facts
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8' }}>
                        {s.expires_at ? `Expires ${s.expires_at.slice(0, 10)}` : 'Indefinite validity'}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={16} color="#617168" /> : <ChevronDown size={16} color="#617168" />}
                  </div>
                </div>

                {/* Expanded Provenance Details */}
                {isExpanded && (
                  <div
                    style={{
                      padding: '14px 18px',
                      borderTop: '1px solid #DCE5DF',
                      backgroundColor: '#F8FAF8',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    {/* Hash & Provenance Bar */}
                    <div
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: 6,
                        fontSize: 11,
                        color: '#475569',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontFamily: 'monospace',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Hash size={13} color="#0A7352" />
                        <span>SHA-256 Hash: {s.content_hash || 'Calculated at ingestion'}</span>
                      </div>
                      <span style={{ color: '#0A7352', fontWeight: 600 }}>Tamper-Evident Source</span>
                    </div>

                    {/* Excerpt */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#617168', textTransform: 'uppercase', marginBottom: 4 }}>
                        Exact Supporting Excerpt
                      </div>
                      <div
                        style={{
                          padding: '10px 14px',
                          backgroundColor: '#FFFFFF',
                          borderLeft: '3px solid #0A7352',
                          borderRadius: 4,
                          fontSize: 13,
                          color: '#1E293B',
                          lineHeight: '1.5',
                        }}
                      >
                        "{s.excerpt}"
                      </div>
                    </div>

                    {/* Section Ref */}
                    {s.section_reference && (
                      <div style={{ fontSize: 12, color: '#475569' }}>
                        <b>Section Reference:</b> {s.section_reference}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Register Source Modal */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            backgroundColor: 'rgba(10, 36, 27, 0.6)',
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
              maxWidth: 580,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#123B2D' }}>
                Register Evidence Source
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSource} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                  Source Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master Brand Guidelines 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #DCE5DF', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                    Source Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #DCE5DF', fontSize: 13, boxSizing: 'border-box' }}
                  >
                    <option value="BRAND_GUIDELINE">Brand Guideline</option>
                    <option value="PRODUCT_SPEC">Product Specification</option>
                    <option value="LEGAL_POLICY">Legal Policy</option>
                    <option value="REGULATORY_FILING">Regulatory Filing</option>
                    <option value="EXECUTIVE_ORDER">Executive Order</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                    Version
                  </label>
                  <input
                    type="text"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    placeholder="1.0"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #DCE5DF', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                    Document File Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. brand-guidelines.pdf"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #DCE5DF', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                    Page / Section Ref
                  </label>
                  <input
                    type="text"
                    placeholder="Page 4, Section 2.1"
                    value={newPageRef}
                    onChange={(e) => setNewPageRef(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #DCE5DF', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                  Exact Supporting Excerpt *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Paste the precise authoritative wording from the document..."
                  value={newExcerpt}
                  onChange={(e) => setNewExcerpt(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #DCE5DF', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                    Authoritative Owner
                  </label>
                  <input
                    type="text"
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #DCE5DF', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>
                    Expiration Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={newExpiresAt}
                    onChange={(e) => setNewExpiresAt(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #DCE5DF', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary btn-sm">
                  Register Source & Generate Hash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
