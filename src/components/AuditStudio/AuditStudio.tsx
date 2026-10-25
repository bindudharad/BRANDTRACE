import React, { useState } from 'react';
import { UnifiedInputPanel } from './UnifiedInputPanel';
import { DiagnosticDashboard } from './DiagnosticDashboard';
import { useKeyContext } from '../../context/KeyContext';
import { runTier1DeterministicAudit } from '../../services/deterministicEngine';
import { runTier2SemanticAudit, GeminiApiError, AVAILABLE_MODELS } from '../../services/geminiSemanticEngine';
import { computeAuditScoreMatrix } from '../../services/scoringEngine';
import { AuditReport, DetectedInputType } from '../../types/brandDna';
import { PRECOMPUTED_DEMO_AUDIT } from '../../data/sampleBrandProfiles';
import { AlertCircle, History, Sparkles, Check } from 'lucide-react';
import confetti from 'canvas-confetti';

export const AuditStudio: React.FC = () => {
  const {
    apiKey,
    hasApiKey,
    isDemoMode,
    selectedModel,
    setSelectedModel,
    activeProfile,
    currentDraftText,
    setCurrentDraftText,
    currentReport,
    setCurrentReport,
    auditHistory,
    addAuditToHistory,
    setIsKeyModalOpen
  } = useKeyContext();

  const [isAuditing, setIsAuditing] = useState(false);
  const [auditPhaseStep, setAuditPhaseStep] = useState(1);
  const [auditPhaseLabel, setAuditPhaseLabel] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleRunAudit = async (
    textContent: string,
    imageDataUrl?: string,
    inputType: DetectedInputType = 'plain_text',
    contentContext?: string
  ) => {
    setIsAuditing(true);
    setErrorMessage(null);

    try {
      // Step 1: Tier 1 Local Regex scan
      setAuditPhaseStep(1);
      setAuditPhaseLabel('Running local client-side Regex rules...');
      await new Promise((r) => setTimeout(r, 450));

      const deterministic = await runTier1DeterministicAudit(
        textContent,
        imageDataUrl,
        activeProfile
      );

      // Step 2: Sampling Canvas color distributions (if image)
      setAuditPhaseStep(2);
      setAuditPhaseLabel('Sampling Canvas color distributions & ΔE distances...');
      await new Promise((r) => setTimeout(r, 450));

      let semanticResult;

      // Step 3: Querying Gemini API or Demo Simulation
      setAuditPhaseStep(3);
      setAuditPhaseLabel(
        isDemoMode
          ? 'Evaluating tone alignment in Demo Mode...'
          : `Querying ${selectedModel} for semantic tone alignment...`
      );

      if (isDemoMode) {
        await new Promise((r) => setTimeout(r, 800));

        // If the user pasted the second sample (compliant) or text without banned words
        const isCompliant =
          textContent.toLowerCase().includes('apex cloud systems today unveiled') ||
          (deterministic.textMatches.length === 0 && textContent.length > 50);

        if (isCompliant) {
          semanticResult = {
            score: 95.0,
            confidence: 0.96,
            observations: []
          };
        } else {
          // Precomputed realistic findings based on draft content
          semanticResult = PRECOMPUTED_DEMO_AUDIT.semantic;
        }
      } else {
        if (!hasApiKey) {
          setIsKeyModalOpen(true);
          throw new Error('No API key in memory. Please provide your Gemini API key or switch to Demo Mode.');
        }

        semanticResult = await runTier2SemanticAudit(
          apiKey,
          selectedModel,
          textContent,
          activeProfile,
          imageDataUrl,
          contentContext,
          (status) => setAuditPhaseLabel(status)
        );
      }

      // Step 4: Computing final compliance scoring matrix
      setAuditPhaseStep(4);
      setAuditPhaseLabel('Computing final compliance scoring matrix...');
      await new Promise((r) => setTimeout(r, 350));

      const scores = computeAuditScoreMatrix(deterministic, semanticResult);

      const newReport: AuditReport = {
        id: `audit-${Date.now()}`,
        timestamp: new Date().toISOString(),
        brandName: activeProfile.metadata.brandName,
        brandVersion: activeProfile.metadata.brandVersion,
        inputType,
        inputSnippet: textContent ? textContent.substring(0, 140) + '...' : '[Visual Asset]',
        contentContext: contentContext?.trim() || undefined,
        scores,
        deterministic,
        semantic: semanticResult,
        usedModel: semanticResult.usedModel || selectedModel,
        fallbackNotice: semanticResult.fallbackNotice
      };

      setCurrentReport(newReport);
      addAuditToHistory(newReport);

      if (scores.sOverall >= 90) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      }

      if (semanticResult.fallbackNotice) {
        showToast(semanticResult.fallbackNotice);
      } else {
        showToast('Brand consistency audit completed successfully.');
      }
    } catch (err: any) {
      if (err instanceof GeminiApiError) {
        setErrorMessage(err.message);
      } else if (
        err?.message?.includes('404') ||
        err?.message?.toLowerCase()?.includes('no longer available') ||
        err?.message?.toLowerCase()?.includes('not found')
      ) {
        setErrorMessage('The selected AI model is no longer available. Please choose a different model from the selector above.');
      } else {
        setErrorMessage(err.message || 'An unexpected error occurred during the audit.');
      }
    } finally {
      setIsAuditing(false);
    }
  };

  const handleApplySuggestion = (originalQuote: string, replacementText: string) => {
    if (!currentDraftText) return;

    let updated = currentDraftText;
    const cleanQuote = originalQuote.replace(/^["'“”‘’]|["'“”‘’]$/g, '').trim();

    if (updated.includes(originalQuote)) {
      updated = updated.replace(originalQuote, replacementText);
    } else if (cleanQuote && updated.includes(cleanQuote)) {
      updated = updated.replace(cleanQuote, replacementText);
    } else {
      // Normalized whitespace matching
      const normalizedDraft = updated.replace(/\s+/g, ' ');
      const normalizedQuote = cleanQuote.replace(/\s+/g, ' ');
      const matchIndex = normalizedDraft.toLowerCase().indexOf(normalizedQuote.toLowerCase());

      if (matchIndex !== -1) {
        // Find approximate position in original string
        const words = normalizedQuote.split(' ');
        const firstWord = words[0];
        const lastWord = words[words.length - 1];
        const startPos = updated.toLowerCase().indexOf(firstWord.toLowerCase());
        const endPos = updated.toLowerCase().lastIndexOf(lastWord.toLowerCase()) + lastWord.length;

        if (startPos !== -1 && endPos > startPos) {
          updated = updated.substring(0, startPos) + replacementText + updated.substring(endPos);
        } else {
          updated = updated.replace(new RegExp(escapeRegExp(cleanQuote), 'i'), replacementText);
        }
      } else {
        // Fallback: replace any overlapping phrase or append
        updated = `${updated}\n\n[Applied Suggestion]: ${replacementText}`;
      }
    }

    setCurrentDraftText(updated);
    showToast('Applied suggestion directly into draft editor.');
  };

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const handleClearAll = () => {
    setCurrentDraftText('');
    setCurrentReport(null);
    showToast('Cleared input draft and diagnostic report.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#030818]/90 border border-cyan-500/30 backdrop-blur-md text-white text-xs font-mono shadow-[0_0_30px_rgba(6,182,212,0.2)] animate-fade-in">
          <Check className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 backdrop-blur-md text-xs text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5 sm:mt-0" />
            <span className="leading-relaxed font-mono">{errorMessage}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {errorMessage.includes('no longer available') && (
              <div className="flex items-center gap-1.5 bg-[#030818]/80 px-2.5 py-1.5 rounded-xl border border-white/10">
                <span className="text-[10px] text-slate-400 font-mono">Switch:</span>
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    setSelectedModel(e.target.value);
                    setErrorMessage(null);
                  }}
                  className="bg-transparent text-cyan-300 text-xs focus:outline-none cursor-pointer font-mono"
                >
                  {AVAILABLE_MODELS.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#030818] text-white font-mono">
                      {m.id}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-300 text-xs font-mono font-medium underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Unified Input Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <UnifiedInputPanel
            onRunAudit={handleRunAudit}
            onClear={handleClearAll}
            isAuditing={isAuditing}
          />
        </div>

        {/* Right Column: Diagnostic Dashboard (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <DiagnosticDashboard
            report={currentReport}
            isAuditing={isAuditing}
            auditPhaseStep={auditPhaseStep}
            auditPhaseLabel={auditPhaseLabel}
            onApplySuggestion={handleApplySuggestion}
          />
        </div>
      </div>
    </div>
  );
};
