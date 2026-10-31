import React, { useState } from 'react';
import { Download, FileText, Code, Check, Loader2 } from 'lucide-react';
import { api } from '../../services/api';

interface ExportEvidenceButtonProps {
  reviewId: string;
  reviewTitle?: string;
}

export const ExportEvidenceButton: React.FC<ExportEvidenceButtonProps> = ({
  reviewId,
  reviewTitle,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [downloading, setDownloading] = useState<'pdf' | 'json' | null>(null);

  const handleDownload = async (format: 'pdf' | 'json') => {
    setDownloading(format);
    try {
      if (format === 'json') {
        const data = await api.exportEvidenceJson(reviewId);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `brandtrace-evidence-${reviewId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // PDF download with active auth headers
        const blob = await api.downloadEvidencePdf(reviewId);
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objUrl;
        a.download = `brandtrace-evidence-${reviewId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objUrl);
      }
      setIsOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Error exporting evidence report.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="btn-secondary btn-sm"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          backgroundColor: '#FFFFFF',
          borderColor: '#0A7352',
          color: '#0A7352',
          fontWeight: 600,
        }}
      >
        <Download size={14} />
        <span>Export Evidence Report</span>
      </button>

      {isOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 90 }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: 6,
              zIndex: 100,
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              border: '1px solid #DCE5DF',
              boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
              minWidth: 240,
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #F1F5F9', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
              Select Compliance Format
            </div>

            <button
              onClick={() => handleDownload('pdf')}
              disabled={downloading !== null}
              style={{
                width: '100%',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 13,
                color: '#1E293B',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAF8')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {downloading === 'pdf' ? (
                <Loader2 size={16} color="#0A7352" className="animate-spin" />
              ) : (
                <FileText size={16} color="#DC2626" />
              )}
              <div>
                <div style={{ fontWeight: 600 }}>Download PDF Packet</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>Auditor-ready PDF with branding & audit trail</div>
              </div>
            </button>

            <button
              onClick={() => handleDownload('json')}
              disabled={downloading !== null}
              style={{
                width: '100%',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 13,
                color: '#1E293B',
                borderTop: '1px solid #F1F5F9',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAF8')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {downloading === 'json' ? (
                <Loader2 size={16} color="#0A7352" className="animate-spin" />
              ) : (
                <Code size={16} color="#0284C7" />
              )}
              <div>
                <div style={{ fontWeight: 600 }}>Download JSON Dossier</div>
                <div style={{ fontSize: 11, color: '#64748B' }}>Structured machine-readable evidence</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
