import React, { useState } from 'react';
import { useKeyContext } from '../../context/KeyContext';
import { LifecycleStepper } from './LifecycleStepper';
import { AiExtractModal } from './AiExtractModal';
import { BorderGlow } from '../BorderGlow';
import { BrandDNAProfile, BrandRule, LifecycleState, BrandSource } from '../../types/brandDna';
import { extractWebpage, isValidHttpUrl, normalizeUrl, ExtractedWebpageData } from '../../services/webExtractor';
import {
  Plus,
  Trash2,
  Download,
  Upload,
  Sparkles,
  CheckCircle2,
  Shield,
  Palette,
  Sliders,
  FileText,
  Volume2,
  AlertTriangle,
  Flame,
  RotateCcw,
  Globe,
  ExternalLink,
  Edit2,
  Check,
  X,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export const BrandDnaManager: React.FC = () => {
  const {
    brandProfiles,
    activeProfile,
    setActiveProfileById,
    saveBrandProfile,
    deleteBrandProfile,
    renameBrandProfile,
    addBrandSource,
    removeBrandSource,
    setProfileLifecycleState,
    importProfilesFromJson,
    exportProfilesToJson,
    resetToDefaultProfiles,
    setIsCreateProfileModalOpen
  } = useKeyContext();

  const [isAiModalOpen, setIsAiModalOpen] = useState(true);
  const [selectedBrandName, setSelectedBrandName] = useState(activeProfile?.metadata?.brandName || '');
  const [activeTabSub, setActiveTabSub] = useState<'voice' | 'vocabulary' | 'colors' | 'rules' | 'sources'>('voice');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Sync selected profile name if activeProfile changes or on initial render
  React.useEffect(() => {
    if (activeProfile?.metadata?.brandName) {
      setSelectedBrandName(activeProfile.metadata.brandName);
    }
  }, [activeProfile?.metadata?.brandName]);

  // Renaming state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState('');

  // Delete modal state
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);

  // New item inputs
  const [newForbiddenTerm, setNewForbiddenTerm] = useState('');
  const [newForbiddenReason, setNewForbiddenReason] = useState('');
  const [newPreferredTerm, setNewPreferredTerm] = useState('');
  const [newToneAttr, setNewToneAttr] = useState('');
  const [newPrimaryHex, setNewPrimaryHex] = useState('#06B6D4');
  const [newSecondaryHex, setNewSecondaryHex] = useState('#2DD4BF');

  // Source URL inputs
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [sourceFetchStatus, setSourceFetchStatus] = useState<Record<string, { loading: boolean; data?: ExtractedWebpageData; error?: string }>>({});

  const currentProfile =
    brandProfiles.find((p) => p.metadata.brandName === selectedBrandName) || activeProfile;

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage(null);
    }, 3000);
  };

  const handleUpdateProfile = (updates: Partial<BrandDNAProfile>) => {
    const updated: BrandDNAProfile = {
      ...currentProfile,
      ...updates,
      metadata: {
        ...currentProfile.metadata,
        ...(updates.metadata || {}),
        updatedAt: new Date().toISOString()
      }
    };
    saveBrandProfile(updated);
    showStatus('Brand DNA profile saved.');
  };

  // Renaming Profile
  const handleStartRename = () => {
    setRenameInput(currentProfile.metadata.brandName);
    setIsRenaming(true);
  };

  const handleSaveRename = () => {
    const trimmed = renameInput.trim();
    if (!trimmed || trimmed === currentProfile.metadata.brandName) {
      setIsRenaming(false);
      return;
    }
    const success = renameBrandProfile(currentProfile.metadata.brandName, trimmed);
    if (success) {
      setSelectedBrandName(trimmed);
      showStatus(`Renamed brand profile to "${trimmed}".`);
    } else {
      showStatus('A brand with that name already exists.');
    }
    setIsRenaming(false);
  };

  // Brand Sources Management
  const handleAddSource = async () => {
    const trimmed = newSourceUrl.trim();
    if (!trimmed) return;
    const normalized = normalizeUrl(trimmed);
    if (!isValidHttpUrl(normalized)) {
      showStatus('Please enter a valid URL (e.g. https://company.com)');
      return;
    }

    addBrandSource(currentProfile.metadata.brandName, normalized);
    setNewSourceUrl('');
    showStatus(`Added brand source URL.`);
  };

  const handleTestFetchSource = async (sourceId: string, url: string) => {
    setSourceFetchStatus((prev) => ({
      ...prev,
      [sourceId]: { loading: true }
    }));

    try {
      const data = await extractWebpage(url);
      setSourceFetchStatus((prev) => ({
        ...prev,
        [sourceId]: { loading: false, data }
      }));
      showStatus(`Successfully fetched content for ${url}`);
    } catch (err: any) {
      setSourceFetchStatus((prev) => ({
        ...prev,
        [sourceId]: { loading: false, error: err.message || 'Failed to fetch webpage.' }
      }));
    }
  };

  const handleAddForbiddenTerm = () => {
    if (!newForbiddenTerm.trim()) return;
    const currentForbidden = currentProfile.vocabulary?.forbidden || [];
    const updatedForbidden = [
      ...currentForbidden,
      { term: newForbiddenTerm.trim(), reason: newForbiddenReason.trim() || 'Brand tone misalignment.' }
    ];
    handleUpdateProfile({
      vocabulary: {
        ...currentProfile.vocabulary,
        forbidden: updatedForbidden
      }
    });
    setNewForbiddenTerm('');
    setNewForbiddenReason('');
  };

  const handleRemoveForbiddenTerm = (index: number) => {
    const updated = (currentProfile.vocabulary?.forbidden || []).filter((_, i) => i !== index);
    handleUpdateProfile({
      vocabulary: {
        ...currentProfile.vocabulary,
        forbidden: updated
      }
    });
  };

  const handleAddPreferredTerm = () => {
    if (!newPreferredTerm.trim()) return;
    const updated = [...(currentProfile.vocabulary?.preferred || []), newPreferredTerm.trim()];
    handleUpdateProfile({
      vocabulary: {
        ...currentProfile.vocabulary,
        preferred: updated
      }
    });
    setNewPreferredTerm('');
  };

  const handleRemovePreferredTerm = (index: number) => {
    const updated = (currentProfile.vocabulary?.preferred || []).filter((_, i) => i !== index);
    handleUpdateProfile({
      vocabulary: {
        ...currentProfile.vocabulary,
        preferred: updated
      }
    });
  };

  const handleAddToneAttr = () => {
    if (!newToneAttr.trim()) return;
    const updated = [...(currentProfile.voice?.toneAttributes || []), newToneAttr.trim()];
    handleUpdateProfile({
      voice: {
        ...currentProfile.voice,
        toneAttributes: updated
      }
    });
    setNewToneAttr('');
  };

  const handleRemoveToneAttr = (index: number) => {
    const updated = (currentProfile.voice?.toneAttributes || []).filter((_, i) => i !== index);
    handleUpdateProfile({
      voice: {
        ...currentProfile.voice,
        toneAttributes: updated
      }
    });
  };

  const handleAddPrimaryHex = () => {
    if (!/^#([A-Fa-f0-9]{6})$/.test(newPrimaryHex)) return;
    const updated = [...(currentProfile.colors?.primaryHex || []), newPrimaryHex.toUpperCase()];
    handleUpdateProfile({
      colors: {
        ...currentProfile.colors,
        primaryHex: updated
      }
    });
  };

  const handleRemovePrimaryHex = (index: number) => {
    const updated = (currentProfile.colors?.primaryHex || []).filter((_, i) => i !== index);
    handleUpdateProfile({
      colors: {
        ...currentProfile.colors,
        primaryHex: updated
      }
    });
  };

  const handleAddSecondaryHex = () => {
    if (!/^#([A-Fa-f0-9]{6})$/.test(newSecondaryHex)) return;
    const updated = [...(currentProfile.colors?.secondaryHex || []), newSecondaryHex.toUpperCase()];
    handleUpdateProfile({
      colors: {
        ...currentProfile.colors,
        secondaryHex: updated
      }
    });
  };

  const handleRemoveSecondaryHex = (index: number) => {
    const updated = (currentProfile.colors?.secondaryHex || []).filter((_, i) => i !== index);
    handleUpdateProfile({
      colors: {
        ...currentProfile.colors,
        secondaryHex: updated
      }
    });
  };

  const handleAddRule = () => {
    const newRuleId = `R-CUSTOM-${(currentProfile.rules?.length || 0) + 1}`;
    const newRule: BrandRule = {
      ruleId: newRuleId,
      category: 'Text',
      description: 'New custom brand alignment rule requirement.',
      weight: 2.0,
      evaluatorType: 'Semantic'
    };
    handleUpdateProfile({
      rules: [...(currentProfile.rules || []), newRule]
    });
  };

  const handleUpdateRule = (index: number, ruleUpdates: Partial<BrandRule>) => {
    const updatedRules = [...(currentProfile.rules || [])];
    updatedRules[index] = {
      ...updatedRules[index],
      ...ruleUpdates
    };
    handleUpdateProfile({ rules: updatedRules });
  };

  const handleRemoveRule = (index: number) => {
    const updatedRules = (currentProfile.rules || []).filter((_, i) => i !== index);
    handleUpdateProfile({ rules: updatedRules });
  };

  const handleCreateNewProfile = () => {
    const newName = `Brand DNA ${brandProfiles.length + 1}`;
    const newProf: BrandDNAProfile = {
      metadata: {
        brandName: newName,
        brandVersion: '1.0.0',
        schemaVersion: '1.0',
        updatedAt: new Date().toISOString(),
        description: 'New custom brand profile draft.'
      },
      lifecycleState: 'DRAFT',
      voice: {
        primaryTone: 'Confident, modern, and accessible',
        formalityScore: 0.7,
        toneAttributes: ['Clear', 'Direct', 'Engaging']
      },
      vocabulary: {
        forbidden: [{ term: 'revolutionary', reason: 'Overused buzzword.' }],
        preferred: ['Engineered', 'Reliable']
      },
      colors: {
        primaryHex: ['#040918', '#06B6D4'],
        secondaryHex: ['#2DD4BF', '#0284C7'],
        strictCompliance: false
      },
      rules: [
        {
          ruleId: 'R-VOCAB-01',
          category: 'Text',
          description: 'Zero tolerance for overused buzzwords.',
          weight: 2.5,
          evaluatorType: 'Deterministic'
        },
        {
          ruleId: 'R-TONE-01',
          category: 'Text',
          description: 'Maintain confident and clear voice tone.',
          weight: 2.0,
          evaluatorType: 'Semantic'
        }
      ],
      sources: []
    };
    saveBrandProfile(newProf);
    setSelectedBrandName(newName);
    showStatus(`Created new profile "${newName}".`);
  };

  const handleExportJson = () => {
    const json = exportProfilesToJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loomfrog-brand-profiles-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('Exported Brand DNA profiles JSON.');
  };

  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const success = importProfilesFromJson(reader.result as string);
      if (success) {
        showStatus('Successfully imported Brand DNA profile(s).');
      } else {
        alert('Invalid Brand DNA profile JSON schema.');
      }
    };
    reader.readAsText(file);
  };

  const [activeFallbackNotice, setActiveFallbackNotice] = useState<string | null>(null);

  const handleAiExtractedProfile = (extracted: Partial<BrandDNAProfile>) => {
    if (extracted.metadata?.brandName) {
      saveBrandProfile(extracted as BrandDNAProfile);
      setActiveProfileById(extracted.metadata.brandName);
      setSelectedBrandName(extracted.metadata.brandName);
      if (extracted.fallbackNotice) {
        setActiveFallbackNotice(extracted.fallbackNotice);
        showStatus(`${extracted.fallbackNotice} Drafted: ${extracted.metadata.brandName}`);
      } else {
        setActiveFallbackNotice(null);
        showStatus(`Imported AI-generated profile: ${extracted.metadata.brandName}`);
      }
    } else {
      showStatus('Failed to import profile: missing brand name metadata.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      {/* Toast Notification */}
      {statusMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3.5 py-2 rounded-[4px] bg-[#111827] text-white text-xs font-medium border border-cyan-500/40 animate-fade-in shadow-xl">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {profileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <BorderGlow borderRadius="rounded-[6px]" glowColor="rose" className="w-full max-w-md">
            <div className="relative w-full rounded-[6px] p-6 space-y-4 border border-[#1F2937] bg-[#111827]">
              <div className="flex items-center gap-2.5 text-rose-400">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-semibold text-white tracking-tight">Delete Brand Profile?</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-white">&ldquo;{profileToDelete}&rdquo;</strong>? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1F2937]">
                <button
                  type="button"
                  onClick={() => setProfileToDelete(null)}
                  className="px-3 py-1.5 rounded-[4px] text-xs font-medium text-slate-300 hover:text-white bg-[#0B0F17] border border-[#1F2937] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteBrandProfile(profileToDelete);
                    setProfileToDelete(null);
                    showStatus(`Deleted brand profile.`);
                  }}
                  className="px-3 py-1.5 rounded-[4px] text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 transition-colors cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </BorderGlow>
        </div>
      )}

      {/* AI Extraction Modal */}
      <AiExtractModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onProfileExtracted={handleAiExtractedProfile}
        existingSources={currentProfile.sources || []}
      />

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight">
            Brand DNA Manager
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Define, calibrate, and lock machine-readable brand guidelines, rulesets, web sources, and color matrices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* AI Extractor Trigger */}
          <button
            onClick={() => setIsAiModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium text-[#0B0F17] bg-cyan-400 hover:bg-cyan-300 transition-colors cursor-pointer shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Draft Profile with AI</span>
          </button>

          {/* New Profile */}
          <button
            onClick={() => setIsCreateProfileModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium text-slate-200 bg-[#111827] hover:bg-[#1F2937] border border-[#1F2937] transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-teal-400" />
            <span>New Profile</span>
          </button>

          {/* Import / Export */}
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium text-slate-300 bg-[#111827] hover:bg-[#1F2937] border border-[#1F2937] cursor-pointer transition-colors shrink-0">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Import JSON</span>
            <input type="file" accept=".json" onChange={handleImportJsonFile} className="hidden" />
          </label>

          <button
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium text-slate-300 bg-[#111827] hover:bg-[#1F2937] border border-[#1F2937] transition-colors cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={resetToDefaultProfiles}
            className="p-2 rounded-[4px] text-slate-400 hover:text-white bg-[#111827] hover:bg-[#1F2937] border border-[#1F2937] transition-colors cursor-pointer shrink-0"
            title="Reset Profiles to Default"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-300" />
          </button>
        </div>
      </div>

      {brandProfiles.length === 0 ? (
        <BorderGlow borderRadius="rounded-[6px]" glowColor="cyan" className="max-w-xl mx-auto my-8">
          <div className="p-8 sm:p-10 rounded-[6px] neo-liquid-panel text-center space-y-4 border border-[#1F2937]">
            <div className="w-12 h-12 rounded-[4px] bg-[#0B0F17] border border-[#1F2937] flex items-center justify-center mx-auto text-cyan-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-base font-semibold text-white tracking-tight">No Brand DNA Profiles Configured</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                Your API Key is synchronized. Create your first custom Brand DNA profile to establish machine-readable tone guidelines, forbidden buzzwords, and diagnostic metrics.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
              <button
                onClick={() => setIsAiModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[4px] text-xs font-medium text-[#0B0F17] bg-cyan-400 hover:bg-cyan-300 cursor-pointer transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Draft Profile with AI</span>
              </button>
              <button
                onClick={() => setIsCreateProfileModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[4px] text-xs font-medium text-slate-200 bg-[#111827] hover:bg-[#1F2937] border border-[#1F2937] cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4 text-teal-400" />
                <span>Blank Profile</span>
              </button>
            </div>
          </div>
        </BorderGlow>
      ) : (
        <>
          {/* Fallback Notice Banner if Model Fallback Occurred */}
          {/* Fallback Notice Banner if Model Fallback Occurred */}
          {(activeFallbackNotice || currentProfile.fallbackNotice) && (
            <div className="p-3 rounded-[4px] bg-[#111827] border border-amber-500/40 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-medium">
                  {activeFallbackNotice || currentProfile.fallbackNotice}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-[2px] bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  Fallback Model Used
                </span>
                <button
                  type="button"
                  onClick={() => setActiveFallbackNotice(null)}
                  className="text-amber-300/80 hover:text-white text-xs underline cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Profile Selector & Activation Banner */}
          <BorderGlow
            borderRadius="rounded-[6px]"
            glowColor={currentProfile.lifecycleState === 'ACTIVE' ? 'teal' : 'cyan'}
            active={currentProfile.lifecycleState === 'ACTIVE'}
          >
            <div className="p-4 rounded-[6px] border border-[#1F2937] bg-[#111827] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
                <label className="text-xs font-semibold text-slate-300 font-mono shrink-0 uppercase tracking-wider">Selected Profile:</label>
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                  {isRenaming ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={renameInput}
                        onChange={(e) => setRenameInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                        className="px-2.5 py-1 rounded-[4px] bg-[#0B0F17] border border-[#1F2937] text-xs font-medium text-white font-mono"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleSaveRename}
                        className="p-1 rounded-[4px] bg-teal-500 text-[#0B0F17] hover:bg-teal-400 cursor-pointer"
                        title="Save Name"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRenaming(false)}
                        className="p-1 rounded-[4px] bg-[#0B0F17] border border-[#1F2937] text-slate-400 hover:text-white cursor-pointer"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={selectedBrandName}
                        onChange={(e) => {
                          setSelectedBrandName(e.target.value);
                        }}
                        className="px-3 py-1.5 rounded-[4px] bg-[#0B0F17] border border-[#1F2937] text-xs font-medium text-white cursor-pointer w-full sm:w-auto max-w-full truncate font-mono"
                      >
                        {brandProfiles.map((p) => (
                          <option key={p.metadata.brandName} value={p.metadata.brandName} className="bg-[#0B0F17] text-white">
                            {p.metadata.brandName} (v{p.metadata.brandVersion}) &bull; [{p.lifecycleState}]
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={handleStartRename}
                        className="p-1.5 rounded-[4px] text-slate-400 hover:text-white bg-[#0B0F17] border border-[#1F2937] transition-colors cursor-pointer"
                        title="Rename Brand Profile"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {currentProfile.lifecycleState === 'ACTIVE' && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-teal-500/10 text-teal-300 border border-teal-500/30 text-[11px] font-mono font-medium shrink-0">
                      <Flame className="w-3 h-3 text-teal-400" />
                      Active Benchmark
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 w-full md:w-auto">
                {currentProfile.lifecycleState === 'ACTIVE' ? null : currentProfile.lifecycleState === 'APPROVED' ? (
                  <button
                    onClick={() => {
                      setProfileLifecycleState(currentProfile.metadata.brandName, 'ACTIVE');
                      setActiveProfileById(currentProfile.metadata.brandName);
                      showStatus(`Set ${currentProfile.metadata.brandName} as ACTIVE benchmark.`);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium text-[#0B0F17] bg-teal-400 hover:bg-teal-300 transition-colors cursor-pointer"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    Set as Active Benchmark
                  </button>
                ) : currentProfile.lifecycleState === 'USER_REVIEW' ? (
                  <button
                    onClick={() => {
                      setProfileLifecycleState(currentProfile.metadata.brandName, 'APPROVED');
                      showStatus(`Approved ${currentProfile.metadata.brandName}. You can now set it as Active.`);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium text-white bg-teal-600 hover:bg-teal-500 transition-colors cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Approve Profile
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setProfileLifecycleState(currentProfile.metadata.brandName, 'USER_REVIEW');
                      showStatus(`Moved to User Review stage.`);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium text-teal-300 bg-teal-950/40 border border-teal-500/30 hover:bg-teal-950/70 transition-colors cursor-pointer"
                    title="AI-generated profiles require human review and approval before becoming Active"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    <span>Review to Approve</span>
                  </button>
                )}

                {brandProfiles.length > 1 && (
                  <button
                    onClick={() => setProfileToDelete(currentProfile.metadata.brandName)}
                    className="p-1.5 rounded-[4px] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-[#1F2937] transition-colors cursor-pointer shrink-0"
                    title="Delete Profile"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </BorderGlow>

          {/* 6-Stage Interactive Lifecycle Stepper (Visual Step 1 + 5 Real States) */}
          <LifecycleStepper
            currentState={currentProfile.lifecycleState}
            onAdvanceState={(newState: LifecycleState) => {
              setProfileLifecycleState(currentProfile.metadata.brandName, newState);
              showStatus(`Advanced stage to ${newState}`);
            }}
            onOpenAiExtract={() => setIsAiModalOpen(true)}
          />

          {/* Ruleset Editor Sub-Tabs */}
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 border-b border-[#1F2937] pb-2.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTabSub('voice')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTabSub === 'voice' ? 'bg-[#1F2937] text-white border border-[#374151]' : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Voice &amp; Formality</span>
              </button>

              <button
                onClick={() => setActiveTabSub('vocabulary')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTabSub === 'vocabulary' ? 'bg-[#1F2937] text-white border border-[#374151]' : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                <span>Forbidden &amp; Preferred Vocabulary</span>
              </button>

              <button
                onClick={() => setActiveTabSub('colors')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTabSub === 'colors' ? 'bg-[#1F2937] text-white border border-[#374151]' : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Palette className="w-3.5 h-3.5 text-teal-400" />
                <span>Color Palette &amp; Matrix</span>
              </button>

              <button
                onClick={() => setActiveTabSub('rules')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTabSub === 'rules' ? 'bg-[#1F2937] text-white border border-[#374151]' : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Evaluation Rules ({currentProfile.rules?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTabSub('sources')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                  activeTabSub === 'sources' ? 'bg-[#1F2937] text-white border border-[#374151]' : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                <span>Brand Sources &amp; URLs ({currentProfile.sources?.length || 0})</span>
              </button>
            </div>

        {/* Tab 5: Brand Sources & Web Ingestion */}
        {activeTabSub === 'sources' && (
          <BorderGlow borderRadius="rounded-[6px]" glowColor="teal">
            <div className="p-5 rounded-[6px] border border-[#1F2937] bg-[#111827] space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span>Ingested Brand Source URLs</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Add official website pages, press centers, or public brand books. LoomFrog extracts live copy and links them directly to this Brand DNA.
                  </p>
                </div>
              </div>

              {/* Add URL Form */}
              <div className="p-3.5 rounded-[4px] bg-[#0B0F17] border border-[#1F2937] space-y-2.5">
                <label className="block text-xs font-medium text-slate-300 font-mono uppercase tracking-wider">
                  Add New Public Brand Source URL
                </label>
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <input
                    type="url"
                    value={newSourceUrl}
                    onChange={(e) => setNewSourceUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSource()}
                    placeholder="https://acme.com or https://acme.com/about"
                    className="flex-1 px-3 py-1.5 rounded-[4px] bg-[#111827] border border-[#1F2937] text-xs text-white placeholder-slate-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddSource}
                    className="px-3.5 py-1.5 rounded-[4px] bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Attach Source</span>
                  </button>
                </div>
              </div>

              {/* Sources List */}
              <div className="space-y-2.5">
                {!currentProfile.sources || currentProfile.sources.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-[#1F2937] rounded-[4px]">
                    <Globe className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                    <p className="text-xs text-slate-400">No web sources linked to this profile yet.</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Add a URL above to verify tone and consistency across live web properties.</p>
                  </div>
                ) : (
                  currentProfile.sources.map((source) => {
                    const fetchInfo = sourceFetchStatus[source.id];
                    return (
                      <div
                        key={source.id}
                        className="p-3.5 rounded-[4px] bg-[#0B0F17] border border-[#1F2937] space-y-2.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2 truncate">
                            <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-xs font-mono text-white font-medium truncate">{source.url}</span>
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-cyan-400 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => handleTestFetchSource(source.id, source.url)}
                              disabled={fetchInfo?.loading}
                              className="px-2.5 py-1 rounded-[4px] bg-[#111827] hover:bg-[#1F2937] border border-[#1F2937] text-cyan-300 text-[11px] font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              {fetchInfo?.loading ? (
                                <>
                                  <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
                                  <span>Testing...</span>
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3 h-3 text-cyan-400" />
                                  <span>Test Extraction</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => removeBrandSource(currentProfile.metadata.brandName, source.id)}
                              className="p-1 rounded-[4px] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Remove Source"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Live Inspection Card if fetched */}
                        {fetchInfo?.data && (
                          <div className="p-2.5 rounded-[4px] bg-[#111827] border border-[#1F2937] text-xs space-y-1 animate-fade-in">
                            <div className="flex items-center justify-between text-teal-300 font-medium text-[11px]">
                              <span>Page Title: {fetchInfo.data.title}</span>
                              <span className="font-mono">{fetchInfo.data.wordCount} words detected</span>
                            </div>
                            {fetchInfo.data.headings.length > 0 && (
                              <p className="text-[11px] text-slate-300 truncate">
                                <span className="text-slate-400">Headings:</span> {fetchInfo.data.headings.slice(0, 4).join(' • ')}
                              </p>
                            )}
                          </div>
                        )}

                        {fetchInfo?.error && (
                          <div className="p-2 rounded-[4px] bg-rose-950/30 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span>{fetchInfo.error}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </BorderGlow>
        )}

        {/* Tab 1: Voice & Formality */}
        {activeTabSub === 'voice' && (
          <BorderGlow borderRadius="rounded-[6px]" glowColor="cyan">
            <div className="p-5 rounded-[6px] border border-[#1F2937] bg-[#111827] space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono uppercase tracking-wider">
                    Brand Name &amp; Version
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={currentProfile.metadata.brandName}
                      onChange={(e) =>
                        handleUpdateProfile({
                          metadata: { ...currentProfile.metadata, brandName: e.target.value }
                        })
                      }
                      className="flex-1 px-3 py-1.5 rounded-[4px] bg-[#0B0F17] border border-[#1F2937] text-xs text-white"
                    />
                    <input
                      type="text"
                      value={currentProfile.metadata.brandVersion}
                      onChange={(e) =>
                        handleUpdateProfile({
                          metadata: { ...currentProfile.metadata, brandVersion: e.target.value }
                        })
                      }
                      className="w-24 px-3 py-1.5 rounded-[4px] bg-[#0B0F17] border border-[#1F2937] text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono uppercase tracking-wider">
                    Primary Tone Narrative
                  </label>
                  <input
                    type="text"
                    value={currentProfile.voice.primaryTone}
                    onChange={(e) =>
                      handleUpdateProfile({
                        voice: { ...currentProfile.voice, primaryTone: e.target.value }
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-[4px] bg-[#0B0F17] border border-[#1F2937] text-xs text-white"
                    placeholder="e.g. Authoritative, precise, pragmatic and empowering"
                  />
                </div>
              </div>

              {/* Formality Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider">
                    Formality Calibrator: <span className="text-cyan-400 font-mono">{(currentProfile.voice.formalityScore * 100).toFixed(0)}%</span>
                  </label>
                  <span className="text-xs text-slate-400 font-mono">
                    {currentProfile.voice.formalityScore >= 0.8
                      ? 'Strict Enterprise & Academic'
                      : currentProfile.voice.formalityScore >= 0.6
                      ? 'Professional Business'
                      : 'Conversational & Casual'}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={currentProfile.voice.formalityScore}
                  onChange={(e) =>
                    handleUpdateProfile({
                      voice: { ...currentProfile.voice, formalityScore: parseFloat(e.target.value) }
                    })
                  }
                  className="w-full h-1.5 bg-[#0B0F17] rounded appearance-none cursor-pointer accent-cyan-400 border border-[#1F2937]"
                />
              </div>

              {/* Tone Attributes Pills */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider">Tone Attributes</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {currentProfile.voice.toneAttributes?.map((attr, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] bg-[#0B0F17] border border-[#1F2937] text-xs text-slate-200 font-medium"
                    >
                      <span>{attr}</span>
                      <button
                        onClick={() => handleRemoveToneAttr(idx)}
                        className="text-slate-500 hover:text-rose-400 cursor-pointer transition-colors"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newToneAttr}
                    onChange={(e) => setNewToneAttr(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddToneAttr()}
                    placeholder="Add attribute (e.g. Tactile, Low latency, Quiet luxury)..."
                    className="flex-1 px-3 py-1.5 rounded-[4px] bg-[#0B0F17] border border-[#1F2937] text-xs text-white"
                  />
                  <button
                    onClick={handleAddToneAttr}
                    className="px-3.5 py-1.5 rounded-[4px] bg-[#1F2937] hover:bg-[#374151] border border-[#1F2937] text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </BorderGlow>
        )}

        {/* Tab 2: Forbidden & Preferred Vocabulary */}
        {activeTabSub === 'vocabulary' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Forbidden Vocabulary */}
            <BorderGlow borderRadius="rounded-[6px]" glowColor="rose" className="h-full">
              <div className="p-5 rounded-[6px] border border-[#1F2937] bg-[#111827] space-y-4 h-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-400 font-medium text-xs uppercase tracking-wider font-mono">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Forbidden Vocabulary ({currentProfile.vocabulary?.forbidden?.length || 0})</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Regex Scanned</span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {currentProfile.vocabulary?.forbidden?.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-[4px] bg-[#0B0F17] border border-[#1F2937] flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-mono font-semibold text-xs text-rose-300">&ldquo;{item.term}&rdquo;</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{item.reason}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveForbiddenTerm(idx)}
                        className="p-1 rounded-[4px] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-2 border-t border-[#1F2937]">
                  <input
                    type="text"
                    value={newForbiddenTerm}
                    onChange={(e) => setNewForbiddenTerm(e.target.value)}
                    placeholder="Forbidden term (e.g. supercharge, magic)..."
                    className="w-full px-3 py-1.5 rounded-[4px] bg-[#0B0F17] border border-[#1F2937] text-xs text-white"
                  />
                  <input
                    type="text"
                    value={newForbiddenReason}
                    onChange={(e) => setNewForbiddenReason(e.target.value)}
                    placeholder="Reason / Recommended alternative..."
                    className="w-full px-3 py-1.5 rounded-[4px] bg-[#0B0F17] border border-[#1F2937] text-xs text-white"
                  />
                  <button
                    onClick={handleAddForbiddenTerm}
                    className="w-full py-2 rounded-[4px] bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white transition-colors cursor-pointer"
                  >
                    Add Forbidden Term
                  </button>
                </div>
              </div>
            </BorderGlow>

            {/* Preferred Vocabulary */}
            <BorderGlow borderRadius="rounded-[6px]" glowColor="teal" className="h-full">
              <div className="p-5 rounded-[6px] border border-[#1F2937] bg-[#111827] space-y-4 h-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-teal-400 font-medium text-xs uppercase tracking-wider font-mono">
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                    <span>Preferred Brand Lexicon ({currentProfile.vocabulary?.preferred?.length || 0})</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Semantic Guidance</span>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {currentProfile.vocabulary?.preferred?.map((term, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-[4px] bg-[#0B0F17] border border-[#1F2937] flex items-center justify-between gap-2"
                    >
                      <span className="text-xs font-medium text-teal-300 font-mono">{term}</span>
                      <button
                        onClick={() => handleRemovePreferredTerm(idx)}
                        className="p-1 rounded-[4px] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2 border-t border-[#1F2937]">
                  <input
                    type="text"
                    value={newPreferredTerm}
                    onChange={(e) => setNewPreferredTerm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPreferredTerm()}
                    placeholder="Preferred phrase (e.g. Deterministic reliability)..."
                    className="flex-1 px-3 py-1.5 rounded-[4px] bg-[#0B0F17] border border-[#1F2937] text-xs text-white"
                  />
                  <button
                    onClick={handleAddPreferredTerm}
                    className="px-3.5 py-1.5 rounded-[4px] bg-teal-600 hover:bg-teal-500 text-xs font-medium text-white transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </BorderGlow>
          </div>
        )}

        {/* Tab 3: Colors & Palette */}
        {activeTabSub === 'colors' && (
          <BorderGlow borderRadius="rounded-[6px]" glowColor="teal">
            <div className="p-5 rounded-[6px] border border-[#1F2937] bg-[#111827] space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
                    Brand Color Palette Matrix
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Used by the HTML5 Canvas visual extractor and Delta-E (ΔE &lt; 16.0) perceptual distance engine.
                  </p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer bg-[#0B0F17] px-3 py-1.5 rounded-[4px] border border-[#1F2937]">
                  <input
                    type="checkbox"
                    checked={currentProfile.colors.strictCompliance}
                    onChange={(e) =>
                      handleUpdateProfile({
                        colors: { ...currentProfile.colors, strictCompliance: e.target.checked }
                      })
                    }
                    className="rounded bg-black/60 text-cyan-400 focus:ring-0"
                  />
                  <span className="text-xs font-medium text-slate-300">Strict Compliance (Flag &lt;5% area)</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Primary Hex Codes */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider">Primary Brand Colors</label>
                  <div className="flex flex-wrap gap-2">
                    {currentProfile.colors.primaryHex?.map((hex, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-[#0B0F17] border border-[#1F2937]"
                      >
                        <div className="w-3.5 h-3.5 rounded-[2px] border border-white/30" style={{ backgroundColor: hex }} />
                        <span className="text-xs font-mono font-medium text-white">{hex}</span>
                        <button onClick={() => handleRemovePrimaryHex(idx)} className="text-slate-500 hover:text-rose-400 text-xs cursor-pointer ml-1">
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={newPrimaryHex}
                      onChange={(e) => setNewPrimaryHex(e.target.value)}
                      className="w-9 h-8 rounded-[4px] bg-[#0B0F17] border border-[#1F2937] cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={newPrimaryHex}
                      onChange={(e) => setNewPrimaryHex(e.target.value)}
                      className="w-28 px-2.5 py-1 rounded-[4px] bg-[#0B0F17] border border-[#1F2937] text-xs text-white font-mono uppercase"
                    />
                    <button
                      onClick={handleAddPrimaryHex}
                      className="px-3 py-1 rounded-[4px] bg-[#1F2937] hover:bg-[#374151] border border-[#1F2937] text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                    >
                      Add Primary
                    </button>
                  </div>
                </div>

                {/* Secondary Hex Codes */}
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider">Secondary / Neutral Colors</label>
                  <div className="flex flex-wrap gap-2">
                    {currentProfile.colors.secondaryHex?.map((hex, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-2.5 py-1 rounded-[4px] bg-[#0B0F17] border border-[#1F2937]"
                      >
                        <div className="w-3.5 h-3.5 rounded-[2px] border border-white/30" style={{ backgroundColor: hex }} />
                        <span className="text-xs font-mono font-medium text-white">{hex}</span>
                        <button onClick={() => handleRemoveSecondaryHex(idx)} className="text-slate-500 hover:text-rose-400 text-xs cursor-pointer ml-1">
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={newSecondaryHex}
                      onChange={(e) => setNewSecondaryHex(e.target.value)}
                      className="w-9 h-8 rounded-[4px] bg-[#0B0F17] border border-[#1F2937] cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={newSecondaryHex}
                      onChange={(e) => setNewSecondaryHex(e.target.value)}
                      className="w-28 px-2.5 py-1 rounded-[4px] bg-[#0B0F17] border border-[#1F2937] text-xs text-white font-mono uppercase"
                    />
                    <button
                      onClick={handleAddSecondaryHex}
                      className="px-3 py-1 rounded-[4px] bg-[#1F2937] hover:bg-[#374151] border border-[#1F2937] text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                    >
                      Add Secondary
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </BorderGlow>
        )}

        {/* Tab 4: Evaluation Rules Matrix */}
        {activeTabSub === 'rules' && (
          <BorderGlow borderRadius="rounded-[6px]" glowColor="blue">
            <div className="p-5 rounded-[6px] border border-[#1F2937] bg-[#111827] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
                    Configurable Evaluation Rules
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Assign weights (0.1 to 5.0) and evaluator types (Deterministic vs Semantic) to steer compliance scoring.
                  </p>
                </div>
                <button
                  onClick={handleAddRule}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium text-[#0B0F17] bg-cyan-400 hover:bg-cyan-300 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Custom Rule</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {currentProfile.rules?.map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-[4px] bg-[#0B0F17] border border-[#1F2937] space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={rule.ruleId}
                          onChange={(e) => handleUpdateRule(idx, { ruleId: e.target.value })}
                          className="w-28 px-2 py-1 rounded-[4px] bg-[#111827] border border-[#1F2937] text-xs font-mono font-medium text-cyan-300"
                        />
                        <select
                          value={rule.category}
                          onChange={(e) => handleUpdateRule(idx, { category: e.target.value as any })}
                          className="px-2 py-1 rounded-[4px] bg-[#111827] border border-[#1F2937] text-xs text-slate-200 cursor-pointer font-mono"
                        >
                          <option value="Text" className="bg-[#111827]">Text</option>
                          <option value="Visual" className="bg-[#111827]">Visual</option>
                          <option value="Global" className="bg-[#111827]">Global</option>
                        </select>
                        <select
                          value={rule.evaluatorType}
                          onChange={(e) => handleUpdateRule(idx, { evaluatorType: e.target.value as any })}
                          className="px-2 py-1 rounded-[4px] bg-[#111827] border border-[#1F2937] text-xs font-medium text-teal-300 cursor-pointer font-mono"
                        >
                          <option value="Deterministic" className="bg-[#111827]">Deterministic (Regex/Canvas)</option>
                          <option value="Semantic" className="bg-[#111827]">Semantic (Gemini API)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                          <span>Weight:</span>
                          <span className="font-bold text-white text-xs font-mono">{rule.weight.toFixed(1)}</span>
                          <input
                            type="range"
                            min="0.1"
                            max="5.0"
                            step="0.1"
                            value={rule.weight}
                            onChange={(e) => handleUpdateRule(idx, { weight: parseFloat(e.target.value) })}
                            className="w-20 h-1 bg-[#111827] rounded accent-cyan-400 border border-[#1F2937] cursor-pointer"
                          />
                        </div>

                        <button
                          onClick={() => handleRemoveRule(idx)}
                          className="p-1 rounded-[4px] text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={rule.description}
                      onChange={(e) => handleUpdateRule(idx, { description: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-[4px] bg-[#111827] border border-[#1F2937] text-xs text-slate-200 focus:border-cyan-400"
                      placeholder="Rule description &amp; diagnostic objective..."
                    />
                  </div>
                ))}
              </div>
            </div>
          </BorderGlow>
        )}
      </div>
        </>
      )}
    </div>
  );
};
