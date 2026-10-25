import React, { useState, useRef } from 'react';
import {
  Sparkles,
  X,
  AlertCircle,
  RefreshCw,
  Globe,
  Link2,
  Plus,
  Trash2,
  Image as ImageIcon,
  Upload,
  FileText,
  HelpCircle,
  CheckCircle2,
  Compass,
  Key,
  Cpu
} from 'lucide-react';
import { useKeyContext } from '../../context/KeyContext';
import { extractBrandDNAWithAI, GeminiApiError, AVAILABLE_MODELS } from '../../services/geminiSemanticEngine';
import { isValidHttpUrl, normalizeUrl } from '../../services/webExtractor';
import { BrandDNAProfile } from '../../types/brandDna';
import { BorderGlow } from '../BorderGlow';

interface AiExtractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileExtracted: (profile: Partial<BrandDNAProfile>) => void;
  existingSources?: Array<{ id: string; url: string }>;
}

interface UploadedImage {
  id: string;
  name: string;
  size: number;
  dataUrl: string;
}

const SAMPLE_PROMPT = `We build developer-first edge security infrastructure called NovaMesh.
Our target audience is distributed systems engineers, security architects, and CTOs.
Tone & Voice: Authoritative, pragmatic, humble, and low-latency. We speak in clear engineering terminology, zero marketing fluff.
Forbidden Terms: Never say "revolutionary", "game changing", "supercharge", or "100% unhackable".
Preferred Terms: Use "cryptographically verified", "zero-overhead", "deterministic latency", and "resilient".
Visual Aesthetic: Dark cybernetic minimalism — deep obsidian (#020617), electric cyan (#06B6D4), and emerald pulse (#10B981).
Formality: Around 85% — professional and technically rigorous.`;

export const AiExtractModal: React.FC<AiExtractModalProps> = ({
  isOpen,
  onClose,
  onProfileExtracted,
  existingSources = []
}) => {
  const { apiKey, hasApiKey, selectedModel, setSelectedModel, isDemoMode, setIsKeyModalOpen } = useKeyContext();

  const [freeformText, setFreeformText] = useState('');
  const [urlsList, setUrlsList] = useState<string[]>(() => existingSources.map((s) => s.url));
  const [newUrl, setNewUrl] = useState('');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleAddUrl = () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    const normalized = normalizeUrl(trimmed);
    if (!isValidHttpUrl(normalized)) {
      setError('Please provide a valid web URL (e.g. https://company.com)');
      return;
    }
    if (urlsList.includes(normalized)) {
      setError('This URL is already added.');
      return;
    }
    setUrlsList([...urlsList, normalized]);
    setNewUrl('');
    setError(null);
  };

  const handleRemoveUrl = (idx: number) => {
    setUrlsList(urlsList.filter((_, i) => i !== idx));
  };

  const handleImageFiles = (files: FileList | null) => {
    if (!files) return;
    setError(null);

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        setError('Only image files (PNG, JPG, WebP, SVG) are supported.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`"${file.name}" exceeds the 5MB image size limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setImages((prev) => [
          ...prev,
          {
            id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name: file.name,
            size: file.size,
            dataUrl
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (id: string) => {
    setImages(images.filter((img) => img.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleImageFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleGenerate = async () => {
    if (!freeformText.trim() && urlsList.length === 0 && images.length === 0) {
      setError('Please provide a conversational description, at least one URL, or a reference image.');
      return;
    }

    // Explicit check: Live AI Brand DNA synthesis requires a real Gemini API key
    if (isDemoMode || !hasApiKey) {
      setError('This feature requires a real API key — not available in Demo Mode. Please set your Google Gemini API key to draft custom profiles with AI, or click "Draft Demo Sample Profile" below.');
      return;
    }

    setIsExtracting(true);
    setError(null);
    setExtractionStatus(`Connecting to Google Gemini (${selectedModel})...`);

    try {
      setExtractionStatus(`Synthesizing Brand DNA rules with ${selectedModel}...`);

      const extracted = await extractBrandDNAWithAI(
        apiKey,
        selectedModel,
        {
          freeformText: freeformText.trim(),
          urls: urlsList,
          images: images.map((img) => img.dataUrl)
        },
        (status) => setExtractionStatus(status)
      );

      // Attach ingested reference URLs to the profile
      extracted.sources = urlsList.map((url, i) => ({
        id: `src_${Date.now()}_${i}`,
        url,
        addedAt: new Date().toISOString(),
        status: 'active'
      }));

      onProfileExtracted(extracted);
      onClose();
    } catch (err: any) {
      if (err instanceof GeminiApiError) {
        setError(err.message);
      } else if (
        err?.message?.includes('404') ||
        err?.message?.toLowerCase()?.includes('no longer available') ||
        err?.message?.toLowerCase()?.includes('not found')
      ) {
        setError('The selected AI model is no longer available. Please choose a different model from the selector above.');
      } else {
        setError(err.message || 'Failed to generate Brand DNA profile. Please verify your API key and connection.');
      }
    } finally {
      setIsExtracting(false);
      setExtractionStatus(null);
    }
  };

  const handleGenerateDemoSample = async () => {
    setIsExtracting(true);
    setError(null);
    setExtractionStatus('Drafting candidate Brand DNA profile (Demo Simulation Engine)...');

    try {
      await new Promise((r) => setTimeout(r, 1200));

      const inputNameMatch = freeformText.match(/(?:brand|called|named|company|is|for)\s+([A-Z][a-zA-Z0-9_-]+)/i);
      const derivedBrandName = inputNameMatch?.[1]
        ? `${inputNameMatch[1]} AI`
        : freeformText.toLowerCase().includes('novamesh')
        ? 'NovaMesh Security'
        : freeformText.trim().length > 3
        ? 'Custom Brand DNA (Demo)'
        : 'LoomFrog Benchmark';

      const sampleExtracted: Partial<BrandDNAProfile> = {
        metadata: {
          brandName: derivedBrandName,
          brandVersion: '1.0.0',
          schemaVersion: '1.0',
          updatedAt: new Date().toISOString(),
          description: freeformText.trim()
            ? `Demo profile generated from prompt: "${freeformText.slice(0, 90)}..."`
            : 'AI-generated candidate profile from conversational brand narrative and visual assets.'
        },
        lifecycleState: 'AI_GENERATED',
        voice: {
          primaryTone: 'Pragmatic, authoritative, engineering-first, and low-latency',
          formalityScore: 0.85,
          toneAttributes: ['Direct precision', 'Technical rigor', 'Zero buzzwords', 'Empowering clarity']
        },
        vocabulary: {
          forbidden: [
            { term: 'revolutionary', reason: 'Overused marketing buzzword lacking substance.' },
            { term: 'game changing', reason: 'Unverifiable promotional exaggeration.' },
            { term: 'supercharge', reason: 'Vague cliché forbidden in technical communications.' },
            { term: '100% unhackable', reason: 'Dangerous absolute claim violating security best practices.' }
          ],
          preferred: [
            'Cryptographically verified',
            'Deterministic latency',
            'Resilient architecture',
            'Zero-overhead runtime'
          ]
        },
        colors: {
          primaryHex: ['#020617', '#06B6D4', '#10B981'],
          secondaryHex: ['#0F172A', '#64748B'],
          strictCompliance: false
        },
        rules: [
          {
            ruleId: 'R-VOCAB-01',
            category: 'Text',
            description: 'Zero tolerance for speculative marketing hype and forbidden buzzwords.',
            weight: 3.0,
            evaluatorType: 'Deterministic'
          },
          {
            ruleId: 'R-TONE-01',
            category: 'Text',
            description: 'Maintain humble, rigorous engineering tone without hyperbole.',
            weight: 2.5,
            evaluatorType: 'Semantic'
          },
          {
            ruleId: 'R-COLOR-01',
            category: 'Visual',
            description: 'Adhere to dark obsidian (#020617) and cyber cyan/emerald accent matrix.',
            weight: 2.0,
            evaluatorType: 'Semantic'
          }
        ],
        sources: urlsList.map((url, i) => ({
          id: `src_${Date.now()}_${i}`,
          url,
          addedAt: new Date().toISOString(),
          status: 'active'
        }))
      };

      onProfileExtracted(sampleExtracted);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to generate demo sample profile.');
    } finally {
      setIsExtracting(false);
      setExtractionStatus(null);
    }
  };

  const hasAnyInput = freeformText.trim().length > 0 || urlsList.length > 0 || images.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <BorderGlow borderRadius="rounded-3xl" glowColor="cyan" className="w-full max-w-2xl">
        <div className="relative w-full rounded-3xl bg-[#030818] neo-liquid-panel shadow-[0_20px_70px_rgba(0,0,0,0.9)] overflow-hidden max-h-[92vh] flex flex-col border border-cyan-500/30">
          {/* Modal Top Header */}
        <div className="flex items-center justify-between p-5 border-b border-cyan-500/20 bg-[#030818]/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/10 border border-cyan-500/30 text-cyan-400 shadow-md">
              <Sparkles className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-lexend">
                  Draft Brand DNA with AI
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
                  Conversational Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Describe your brand in plain words, paste reference URLs, or attach images — no manual form required.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Demo Mode or Live Mode Notification Ribbon */}
          {isDemoMode || !hasApiKey ? (
            <div className="p-3 rounded-[4px] bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-amber-300 font-mono text-[11px] uppercase tracking-wider">Live AI Synthesis Requires Gemini API Key</div>
                  <div className="text-[11px] text-amber-200/80 mt-0.5 leading-relaxed font-mono">
                    You are in <strong>Demo Mode</strong>. Conversational extraction requires a real Gemini API key. Provide a key or use the sample demo button below.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsKeyModalOpen(true)}
                className="px-2.5 py-1 rounded-[4px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 border border-amber-500/30 text-[11px] font-mono font-medium transition-colors shrink-0 cursor-pointer flex items-center justify-center gap-1"
              >
                <Key className="w-3 h-3" />
                <span>Set API Key</span>
              </button>
            </div>
          ) : null}

          {/* Visible Model Selector Dropdown Bar */}
          <div className="p-3 rounded-[4px] bg-[#0B0F17] border border-[#1F2937] text-xs text-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-[3px] bg-[#111827] border border-[#1F2937] text-cyan-400 shrink-0">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-white text-xs">
                    Gemini Engine Model
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-[3px] bg-[#111827] text-cyan-300 border border-[#1F2937]">
                    {hasApiKey && !isDemoMode ? 'Live API' : 'Demo Mode'}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-mono text-[10px]">
                  Fallback chain: gemini-3.6-flash &rarr; gemini-2.5-pro &rarr; gemini-3.7-flash
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <span className="text-[11px] text-slate-400 font-mono">Model:</span>
              <div className="flex items-center gap-1 bg-[#111827] px-2 py-1 rounded-[4px] border border-[#1F2937]">
                <select
                  id="brand-dna-modal-model-select"
                  value={selectedModel}
                  onChange={(e) => {
                    setSelectedModel(e.target.value);
                    setError(null);
                  }}
                  className="bg-transparent text-cyan-300 font-mono text-xs focus:outline-none cursor-pointer"
                  title="Select AI Model"
                >
                  {AVAILABLE_MODELS.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#111827] text-white font-mono">
                      {m.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Visible Error Banner */}
          {error && (
            <div className="p-3 rounded-[4px] bg-rose-950/30 border border-rose-500/40 text-xs text-rose-200 space-y-2 animate-fade-in font-mono">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
              {error.includes('no longer available') && (
                <div className="pl-6 flex items-center gap-2">
                  <span className="text-[11px] text-slate-300 font-mono">Choose active model:</span>
                  <select
                    value={selectedModel}
                    onChange={(e) => {
                      setSelectedModel(e.target.value);
                      setError(null);
                    }}
                    className="bg-[#111827] text-cyan-300 border border-[#1F2937] text-xs rounded-[4px] px-2 py-1 focus:outline-none cursor-pointer font-mono"
                  >
                    {AVAILABLE_MODELS.map((m) => (
                      <option key={m.id} value={m.id} className="bg-[#111827] text-white font-mono">
                        {m.id}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {(isDemoMode || !hasApiKey) && (
                <div className="pl-6">
                  <button
                    type="button"
                    onClick={() => setIsKeyModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-[11px] font-mono cursor-pointer transition-colors"
                  >
                    <Key className="w-3 h-3" />
                    <span>Open API Key Settings</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Prominent Loading / Progress State Card */}
          {isExtracting && (
            <div className="p-3.5 rounded-[4px] bg-[#0B0F17] border border-cyan-500/40 text-xs text-cyan-200 flex items-center gap-2.5 animate-pulse">
              <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
              <div className="space-y-0.5 font-mono">
                <div className="font-medium text-white text-xs">Synthesizing Brand DNA Profile...</div>
                <div className="text-[10px] text-cyan-300">
                  {extractionStatus || 'Extracting tone attributes, vocabulary rules, and brand palette...'}
                </div>
              </div>
            </div>
          )}

          {/* 1. Freeform Conversational Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-mono font-medium text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>Describe Your Brand in Plain Language</span>
              </label>
              <button
                type="button"
                onClick={() => setFreeformText(SAMPLE_PROMPT)}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 cursor-pointer transition-colors"
              >
                Insert Example
              </button>
            </div>
            <textarea
              value={freeformText}
              onChange={(e) => setFreeformText(e.target.value)}
              rows={5}
              placeholder="Tell us about your brand in your own words — what do you build? Who is your audience? How should you sound? What words do you avoid? What is your visual aesthetic?"
              className="w-full p-3 rounded-[4px] bg-[#0B0F17] border border-[#1F2937] focus:border-cyan-500/50 focus:outline-none text-xs text-white placeholder-slate-500 font-mono leading-relaxed transition-colors"
            />
          </div>

          {/* 2. Optional Reference URLs (Server-Side Gemini URL Context) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-mono font-medium text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-teal-400" />
                <span>Reference Websites &amp; Links <span className="text-slate-400 font-normal font-sans">(Optional)</span></span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Gemini URL Context</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://company.com or https://company.com/about"
                className="flex-1 px-3 py-1.5 rounded-[4px] bg-[#0B0F17] border border-[#1F2937] focus:border-cyan-500/50 focus:outline-none text-xs text-white placeholder-slate-500 font-mono transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
              />
              <button
                type="button"
                onClick={handleAddUrl}
                className="px-3 py-1.5 rounded-[4px] bg-[#0B0F17] hover:bg-white/[0.05] text-teal-300 border border-[#1F2937] text-xs font-mono font-medium transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-3 h-3" />
                <span>Add URL</span>
              </button>
            </div>

            {urlsList.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {urlsList.map((url, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#030818]/60 border border-cyan-500/20 text-xs"
                  >
                    <div className="flex items-center gap-2 text-slate-300 truncate">
                      <Link2 className="w-3 h-3 text-teal-400 shrink-0" />
                      <span className="truncate font-mono text-[11px] text-teal-200">{url}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveUrl(idx)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remove URL"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Optional Reference Images (Multimodal) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-lexend">
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Brand Visual Assets &amp; Photos <span className="text-slate-400 font-normal font-sans">(Optional)</span></span>
              </label>
              <span className="text-[10px] text-slate-400 font-mono">Multimodal Extraction</span>
            </div>

            {/* Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`p-5 rounded-2xl border border-dashed transition-all text-center cursor-pointer ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-950/20 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                  : 'border-cyan-500/30 bg-[#030818]/40 hover:bg-[#030818]/70 hover:border-cyan-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => handleImageFiles(e.target.files)}
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <Upload className="w-5 h-5 text-cyan-400" />
                <p className="text-xs text-slate-300 font-sans">
                  <strong className="text-cyan-300 font-medium">Click to upload</strong> or drag &amp; drop brand imagery
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  Logos, marketing assets, or design screenshots (PNG, JPG, WebP up to 5MB)
                </p>
              </div>
            </div>

            {/* Uploaded Images Thumbnails */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="relative group rounded-xl bg-[#030818]/60 border border-cyan-500/20 p-2 flex items-center gap-2 overflow-hidden"
                  >
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-lg object-cover bg-black/50 shrink-0 border border-white/10"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-slate-200 truncate font-mono">{img.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {(img.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(img.id);
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remove image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Human-in-the-loop Notification */}
          <div className="p-3 rounded-xl bg-[#030818]/60 border border-cyan-500/20 text-[11px] text-slate-400 flex items-center gap-2.5 font-mono">
            <Compass className="w-4 h-4 text-teal-400 shrink-0" />
            <span>
              The AI drafts a candidate profile at <strong className="text-teal-300 font-normal">AI-Generated</strong> status. You can review and tune every rule before approving it for live audits.
            </span>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 p-5 border-t border-cyan-500/20 bg-[#030818]/90 shrink-0">
          <div>
            {(isDemoMode || !hasApiKey) && (
              <button
                type="button"
                onClick={handleGenerateDemoSample}
                disabled={isExtracting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-teal-300 bg-teal-950/40 hover:bg-teal-900/50 border border-teal-500/30 transition-all cursor-pointer disabled:opacity-50"
                title="Generate a sample profile instantly without a Gemini API key"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>Draft Demo Sample Profile</span>
              </button>
            )}
          </div>
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isExtracting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isExtracting || !hasAnyInput}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white neo-liquid-btn-primary shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
            >
              {isExtracting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Profile...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  <span>Draft Brand DNA Profile</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      </BorderGlow>
    </div>
  );
};
