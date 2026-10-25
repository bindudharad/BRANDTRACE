import React, { useState, useRef, useMemo } from 'react';
import { Upload, FileText, Image, Table, Sparkles, AlertCircle, RefreshCw, X, Eye, Edit3, Globe, ExternalLink, Check, ArrowRight } from 'lucide-react';
import { useKeyContext } from '../../context/KeyContext';
import { extractInputData, FileExtractionError } from '../../services/fileExtractor';
import { extractWebpage, WebExtractionError, ExtractedWebpageData } from '../../services/webExtractor';
import { scanForbiddenVocabulary } from '../../services/deterministicEngine';
import { CanvasColorInspector } from './CanvasColorInspector';
import { DEMO_SAMPLE_DRAFTS } from '../../data/sampleBrandProfiles';
import { DetectedInputType, DeterministicTextMatch } from '../../types/brandDna';
import { BorderGlow } from '../BorderGlow';

interface UnifiedInputPanelProps {
  onRunAudit: (text: string, imageDataUrl?: string, inputType?: DetectedInputType, contentContext?: string) => void;
  onClear?: () => void;
  isAuditing: boolean;
}

type InputMode = 'text' | 'url' | 'visual';

export const UnifiedInputPanel: React.FC<UnifiedInputPanelProps> = ({ onRunAudit, onClear, isAuditing }) => {
  const { currentDraftText, setCurrentDraftText, activeProfile, isDemoMode } = useKeyContext();

  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [contentContext, setContentContext] = useState<string>('');
  const [showContextNudge, setShowContextNudge] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [extractedFileName, setExtractedFileName] = useState<string | null>(null);
  const [detectedType, setDetectedType] = useState<DetectedInputType>('plain_text');
  const [extractedImageDataUrl, setExtractedImageDataUrl] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [activeTooltipTerm, setActiveTooltipTerm] = useState<DeterministicTextMatch | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'highlight'>('edit');

  // URL Audit State
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlData, setUrlData] = useState<ExtractedWebpageData | null>(null);
  const [urlFetchError, setUrlFetchError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Real-time live inline regex scanning against active Brand DNA forbidden vocabulary
  const liveViolations: DeterministicTextMatch[] = useMemo(() => {
    if (detectedType === 'image' || !currentDraftText) return [];
    return scanForbiddenVocabulary(currentDraftText, activeProfile);
  }, [currentDraftText, activeProfile, detectedType]);

  const handleFileDrop = async (file: File) => {
    setIsProcessingFile(true);
    setExtractionError(null);
    try {
      const result = await extractInputData(file);
      setDetectedType(result.type);
      setExtractedFileName(result.fileName || file.name);

      if (result.type === 'image' && result.imageDataUrl) {
        setExtractedImageDataUrl(result.imageDataUrl);
        setInputMode('visual');
        setCurrentDraftText('');
      } else if (result.textContent) {
        setCurrentDraftText(result.textContent);
        setInputMode('text');
        setExtractedImageDataUrl(null);
      }
    } catch (err) {
      if (err instanceof FileExtractionError) {
        setExtractionError(err.message);
      } else {
        setExtractionError('Failed to process uploaded file.');
      }
    } finally {
      setIsProcessingFile(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileDrop(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileDrop(e.target.files[0]);
    }
  };

  const handleClear = () => {
    setCurrentDraftText('');
    setContentContext('');
    setShowContextNudge(false);
    setExtractedImageDataUrl(null);
    setExtractedFileName(null);
    setDetectedType('plain_text');
    setExtractionError(null);
    setActiveTooltipTerm(null);
    setUrlData(null);
    setUrlFetchError(null);
    setTargetUrl('');
    onClear?.();
  };

  const handleSelectSample = (sampleText: string) => {
    setCurrentDraftText(sampleText);
    setExtractedImageDataUrl(null);
    setExtractedFileName(null);
    setDetectedType('plain_text');
    setInputMode('text');
    setExtractionError(null);
    setActiveTooltipTerm(null);
  };

  const handleQuickSwapWord = (forbiddenTerm: string, preferredReplacement: string) => {
    if (!currentDraftText) return;
    const regex = new RegExp(`\\b${forbiddenTerm}\\b`, 'gi');
    const updated = currentDraftText.replace(regex, preferredReplacement);
    setCurrentDraftText(updated);
    setActiveTooltipTerm(null);
  };

  const handleFetchUrl = async () => {
    if (!targetUrl.trim()) return;
    setIsFetchingUrl(true);
    setUrlFetchError(null);
    setUrlData(null);

    try {
      const extracted = await extractWebpage(targetUrl);
      setUrlData(extracted);
      setCurrentDraftText(extracted.fullFormattedText);
      setDetectedType('webpage');
    } catch (err) {
      if (err instanceof WebExtractionError) {
        setUrlFetchError(err.message);
      } else {
        setUrlFetchError('Failed to fetch webpage content. Please ensure the URL is accessible.');
      }
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleExecuteAudit = (bypassNudge = false) => {
    if (!contentContext.trim() && !bypassNudge) {
      setShowContextNudge(true);
      return;
    }

    setShowContextNudge(false);

    if (inputMode === 'visual' && extractedImageDataUrl) {
      onRunAudit('', extractedImageDataUrl, 'image', contentContext.trim());
    } else if (inputMode === 'url' && urlData) {
      onRunAudit(urlData.fullFormattedText, undefined, 'webpage', contentContext.trim());
    } else if (currentDraftText.trim()) {
      onRunAudit(currentDraftText, undefined, detectedType, contentContext.trim());
    }
  };

  const wordCount = currentDraftText.trim() ? currentDraftText.trim().split(/\s+/).length : 0;
  const charCount = currentDraftText.length;

  /**
   * Renders real-time interactive inline text with tooltips on forbidden terms
   */
  const renderInlineHighlightedText = () => {
    if (!currentDraftText) return <p className="text-slate-500 italic">No text provided.</p>;
    if (liveViolations.length === 0) {
      return (
        <div className="whitespace-pre-wrap text-sm text-slate-200 leading-relaxed font-sans">
          {currentDraftText}
        </div>
      );
    }

    const sorted = [...liveViolations].sort((a, b) => a.startIndex - b.startIndex);
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    sorted.forEach((match, i) => {
      if (match.startIndex > lastIndex) {
        elements.push(
          <span key={`text-${i}`}>
            {currentDraftText.substring(lastIndex, match.startIndex)}
          </span>
        );
      }

      const termText = currentDraftText.substring(match.startIndex, match.endIndex);
      const isSelected = activeTooltipTerm?.startIndex === match.startIndex;

      elements.push(
        <span
          key={`term-${i}-${match.startIndex}`}
          onClick={() => setActiveTooltipTerm(isSelected ? null : match)}
          className={`inline-block relative px-1.5 py-0.5 mx-0.5 rounded-md cursor-pointer font-mono font-medium transition-colors ${
            isSelected
              ? 'bg-rose-500 text-white'
              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25'
          }`}
          title={`${match.term}: ${match.reason}`}
        >
          {termText}
        </span>
      );

      lastIndex = match.endIndex;
    });

    if (lastIndex < currentDraftText.length) {
      elements.push(
        <span key="text-end">
          {currentDraftText.substring(lastIndex)}
        </span>
      );
    }

    return (
      <div className="whitespace-pre-wrap text-sm text-slate-200 leading-relaxed font-sans">
        {elements}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Input Mode Selector Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-[#030818]/60 p-1.5 rounded-2xl border border-cyan-500/20 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setInputMode('text')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              inputMode === 'text'
                ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span>Text &amp; Document</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode('url')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              inputMode === 'url'
                ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            <span>Audit a URL</span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode('visual')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              inputMode === 'visual'
                ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <Image className="w-3.5 h-3.5 text-blue-400" />
            <span>Visual Asset</span>
          </button>
        </div>

        {/* Quick Sample Selector (Visible when in Demo Mode) */}
        {isDemoMode && inputMode === 'text' && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-mono">Demo:</span>
            <button
              onClick={() => handleSelectSample(DEMO_SAMPLE_DRAFTS[0].content)}
              className="text-[11px] font-mono px-3 py-1.5 rounded-xl bg-white/[0.04] text-slate-300 hover:text-white hover:border-rose-500/50 border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Misaligned Draft
            </button>
            <button
              onClick={() => handleSelectSample(DEMO_SAMPLE_DRAFTS[1].content)}
              className="text-[11px] font-mono px-3 py-1.5 rounded-xl bg-white/[0.04] text-slate-300 hover:text-white hover:border-teal-500/50 border border-white/10 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              Compliant Draft
            </button>
          </div>
        )}
      </div>

      {/* Content Context Field (Optional for semantic Tier 2 AI engine) */}
      <BorderGlow borderRadius="rounded-2xl" glowColor="cyan">
        <div className="p-4 rounded-2xl neo-liquid-panel border border-cyan-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="content-context-input" className="text-xs font-semibold text-slate-300 font-lexend">
              Tell us about the content
            </label>
            {contentContext && (
              <button
                type="button"
                onClick={() => {
                  setContentContext('');
                  setShowContextNudge(false);
                }}
                className="text-[11px] text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                Clear Context
              </button>
            )}
          </div>
          <div className="relative">
            <input
              id="content-context-input"
              type="text"
              value={contentContext}
              onChange={(e) => {
                setContentContext(e.target.value);
                if (showContextNudge) setShowContextNudge(false);
              }}
              placeholder="e.g. 'Landing page hero copy', 'Client invitation draft', 'Instagram caption'"
              className="w-full px-3.5 py-2.5 rounded-xl neo-liquid-input text-xs sm:text-sm text-slate-100 placeholder-slate-500 font-sans focus:outline-none transition-all"
            />
          </div>
        </div>
      </BorderGlow>

      {/* Main Input Canvas Zone */}
      <BorderGlow borderRadius="rounded-3xl" glowColor={isDragOver ? 'teal' : 'cyan'} active={isDragOver}>
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`relative rounded-3xl transition-all p-6 ${
            isDragOver
              ? 'border border-cyan-400 bg-cyan-950/20 shadow-[0_0_30px_rgba(6,182,212,0.3)]'
              : 'neo-liquid-panel border border-cyan-500/30 shadow-2xl'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.txt,.md,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.webp"
            onChange={handleFileInputChange}
            className="hidden"
          />

        {/* MODE 1: AUDIT A URL */}
        {inputMode === 'url' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-cyan-300 font-mono">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Enter a live webpage URL to extract visible copy, headings, and CTAs for brand auditing:</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
              <div className="relative flex-1">
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://example.com/pricing or https://mybrand.com"
                  className="w-full px-3.5 py-2.5 rounded-xl neo-liquid-input text-xs sm:text-sm text-slate-100 placeholder-slate-500 font-mono focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleFetchUrl()}
                />
              </div>

              <button
                type="button"
                onClick={handleFetchUrl}
                disabled={isFetchingUrl || !targetUrl.trim()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-teal-300 border border-cyan-500/30 text-xs font-mono font-medium transition-all disabled:opacity-50 cursor-pointer shrink-0"
              >
                {isFetchingUrl ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-3.5 h-3.5 text-teal-400" />
                    <span>Fetch &amp; Extract</span>
                  </>
                )}
              </button>
            </div>

            {/* Error banner */}
            {urlFetchError && (
              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-200 flex items-start gap-2.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{urlFetchError}</p>
                  <p className="text-[11px] text-rose-300/80 mt-1 font-mono">
                    Tip: You can also switch to the &quot;Text &amp; Document&quot; tab and paste the text directly.
                  </p>
                </div>
              </div>
            )}

            {/* Extracted URL Card Preview */}
            {urlData && (
              <div className="p-5 rounded-2xl bg-[#030818]/60 border border-cyan-500/20 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-teal-300 text-xs font-semibold font-mono">
                    <Check className="w-3.5 h-3.5 text-teal-400" />
                    <span>Webpage Ingested Successfully</span>
                  </div>
                  <a
                    href={urlData.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] text-cyan-400 hover:underline font-mono"
                  >
                    <span>Visit Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-black/40 p-3 rounded-xl border border-cyan-500/20">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Page Title:</span>
                    <p className="font-medium text-white truncate mt-0.5">{urlData.title}</p>
                  </div>
                  <div className="bg-black/40 p-3 rounded-xl border border-cyan-500/20">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Word Count:</span>
                    <p className="font-medium text-white mt-0.5 font-mono">{urlData.wordCount} words detected</p>
                  </div>
                </div>

                {urlData.headings.length > 0 && (
                  <div className="text-xs space-y-1.5">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Key Headings:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {urlData.headings.slice(0, 6).map((h, i) => (
                        <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg bg-black/40 text-cyan-300 border border-cyan-500/20 font-mono">
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {urlData.ctaButtons.length > 0 && (
                  <div className="text-xs space-y-1.5">
                    <span className="text-[10px] text-slate-400 uppercase font-mono">Call to Action Buttons:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {urlData.ctaButtons.slice(0, 6).map((b, i) => (
                        <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg bg-black/40 text-teal-300 border border-teal-500/20 font-mono">
                          [{b}]
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2.5 border-t border-cyan-500/20 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono text-[11px]">Auditing content against <strong className="text-white">{activeProfile.metadata.brandName}</strong> DNA.</span>
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('text');
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-mono text-xs cursor-pointer"
                  >
                    View / Edit Extracted Copy &rarr;
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MODE 2: VISUAL ASSET */}
        {inputMode === 'visual' && (
          <div>
            {extractedImageDataUrl ? (
              <CanvasColorInspector
                imageDataUrl={extractedImageDataUrl}
                activeBrandDNA={activeProfile}
              />
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-cyan-500/30 hover:border-cyan-400 rounded-2xl p-10 text-center cursor-pointer transition-all bg-[#030818]/40 hover:bg-[#030818]/70 group"
              >
                <Image className="w-10 h-10 text-cyan-400 mx-auto mb-3 transition-colors group-hover:scale-105" />
                <p className="text-sm font-semibold text-white mb-1 font-lexend">Upload Brand Visual or Image</p>
                <p className="text-xs text-slate-400 font-mono">PNG, JPG, JPEG, WEBP &bull; Color cluster &amp; Delta-E sampling</p>
              </div>
            )}
          </div>
        )}

        {/* MODE 3: TEXT & DOCUMENT */}
        {inputMode === 'text' && (
          <div className="space-y-3.5">
            {/* File Ingestion Notification Banner */}
            {extractedFileName && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#030818]/60 border border-cyan-500/20 text-xs">
                <div className="flex items-center gap-2 text-cyan-300">
                  {detectedType === 'spreadsheet' ? (
                    <Table className="w-3.5 h-3.5 text-teal-400" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  <span className="font-medium text-white truncate max-w-[200px]">{extractedFileName}</span>
                  <span className="text-[10px] text-slate-500 font-mono">client-side extracted</span>
                </div>
                <button
                  onClick={handleClear}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] cursor-pointer"
                  title="Clear File"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Extraction Error Notice */}
            {extractionError && (
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{extractionError}</span>
              </div>
            )}

            {/* Live Inline Forbidden Term Highlights Banner */}
            {liveViolations.length > 0 && (
              <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-xs text-rose-200 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold text-rose-300 font-mono text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>
                      INLINE ALERT: {liveViolations.length} forbidden term{liveViolations.length > 1 ? 's' : ''} detected
                    </span>
                  </div>

                  {/* Mode switcher */}
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setViewMode('edit')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                        viewMode === 'edit'
                          ? 'bg-white/[0.1] text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Edit3 className="w-3 h-3 inline mr-1 text-cyan-400" />
                      Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('highlight')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                        viewMode === 'highlight'
                          ? 'bg-rose-500/30 text-rose-200'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Eye className="w-3 h-3 inline mr-1 text-rose-300" />
                      Inline Inspector
                    </button>
                  </div>
                </div>

                {/* Interactive Tooltip Card */}
                {activeTooltipTerm && (
                  <div className="p-3 rounded-xl bg-black/60 border border-rose-500/30 text-xs space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-200 font-mono text-[11px] border border-rose-500/30">
                          {activeTooltipTerm.term}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">Line {activeTooltipTerm.line}</span>
                      </div>
                      <button
                        onClick={() => setActiveTooltipTerm(null)}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-300">
                      <strong className="text-rose-300 font-medium">Why Banned:</strong> {activeTooltipTerm.reason}
                    </p>

                    {/* Preferred alternatives */}
                    {activeProfile.vocabulary?.preferred && activeProfile.vocabulary.preferred.length > 0 && (
                      <div className="flex items-center flex-wrap gap-1.5 pt-1.5 border-t border-white/10">
                        <span className="text-[10px] text-slate-400 font-mono">Alternative:</span>
                        {activeProfile.vocabulary.preferred.slice(0, 4).map((pref, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => handleQuickSwapWord(activeTooltipTerm.term, pref)}
                            className="px-2 py-0.5 rounded-md bg-white/[0.06] text-teal-300 hover:text-teal-200 border border-teal-500/30 text-[10px] font-mono transition-colors cursor-pointer"
                          >
                            &rarr; {pref}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* View Mode: Raw Textarea vs Interactive Inline Highlighting */}
            {viewMode === 'highlight' ? (
              <div className="p-4 rounded-2xl border border-cyan-500/20 bg-[#030818]/60 min-h-[220px] max-h-[380px] overflow-y-auto font-sans">
                <div className="text-[11px] font-mono text-cyan-300 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Click any highlighted term to view brand rationale and swap alternatives.
                </div>
                {renderInlineHighlightedText()}
              </div>
            ) : (
              <div className="relative">
                <textarea
                  value={currentDraftText}
                  onChange={(e) => {
                    setCurrentDraftText(e.target.value);
                    if (detectedType === 'image') setDetectedType('plain_text');
                  }}
                  rows={10}
                  placeholder="Type or paste your draft copy here, or drop a document (.docx, .txt, .md), spreadsheet (.xlsx, .csv), or image (.png, .jpg, .webp)..."
                  className="w-full p-4 rounded-2xl neo-liquid-input text-xs sm:text-sm text-slate-100 placeholder-slate-500 leading-relaxed resize-y font-sans transition-all"
                />
              </div>
            )}

            {/* Drag Drop Hint & Drop Zone Trigger */}
            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-cyan-500/20 text-xs">
              <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-medium cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  Upload Document (.docx, .txt, .md, .xlsx, .csv)
                </button>
              </div>

              <div className="text-[11px] font-mono text-slate-400">
                <strong className="text-slate-200 font-semibold">{wordCount}</strong> words &bull;{' '}
                <strong className="text-slate-200 font-semibold">{charCount}</strong> characters
              </div>
            </div>
          </div>
        )}
        </div>
      </BorderGlow>

      {/* Context Nudge Alert Banner (Dismissible) */}
      {showContextNudge && (
        <div className="p-3.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 text-xs text-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start sm:items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              Adding context helps the AI judge tone more accurately. Continue without it?
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setShowContextNudge(false);
                const el = document.getElementById('content-context-input');
                el?.focus();
              }}
              className="px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-slate-200 text-xs font-medium transition-colors cursor-pointer"
            >
              Add Context
            </button>
            <button
              type="button"
              onClick={() => handleExecuteAudit(true)}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-medium transition-colors cursor-pointer"
            >
              Continue Anyway
            </button>
          </div>
        </div>
      )}

      {/* Bottom Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-slate-400 flex items-center gap-2 truncate">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
          <span className="truncate">Benchmark: <strong className="text-slate-200 font-medium">{activeProfile.metadata.brandName}</strong></span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {currentDraftText || extractedImageDataUrl || targetUrl ? (
            <button
              onClick={handleClear}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.06] border border-cyan-500/20 transition-all cursor-pointer shrink-0"
            >
              Clear
            </button>
          ) : null}

          <button
            onClick={handleExecuteAudit}
            disabled={isAuditing || (!currentDraftText.trim() && !extractedImageDataUrl && !urlData)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white neo-liquid-btn-primary shadow-lg shadow-cyan-500/30 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
          >
            {isAuditing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                <span>Executing Dual-Tier Audit...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                <span>Run Brand Consistency Audit</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
