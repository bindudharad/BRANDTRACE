import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { BrandDNAProfile, AuditReport, LifecycleState } from '../types/brandDna';
import { DEFAULT_BRAND_PROFILES, PRECOMPUTED_DEMO_AUDIT, DEMO_SAMPLE_DRAFTS } from '../data/sampleBrandProfiles';
import { DEFAULT_MODEL } from '../services/geminiSemanticEngine';

interface KeyContextType {
  // In-Memory API Key (never written to storage)
  apiKey: string;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  hasApiKey: boolean;

  // Demo Mode State
  isDemoMode: boolean;
  setIsDemoMode: (val: boolean) => void;
  toggleDemoMode: () => void;

  // Onboarding Modal State
  isOnboardingModalOpen: boolean;
  setIsOnboardingModalOpen: (open: boolean) => void;
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (completed: boolean) => void;

  // Demo Output Prompt Modal State
  isDemoOutputPromptOpen: boolean;
  setIsDemoOutputPromptOpen: (open: boolean) => void;
  generateDemoOutput: () => void;
  dismissDemoOutputPrompt: () => void;

  // API Key Verified Success Modal State
  isApiKeySuccessModalOpen: boolean;
  setIsApiKeySuccessModalOpen: (open: boolean) => void;

  // Create Profile Modal State
  isCreateProfileModalOpen: boolean;
  setIsCreateProfileModalOpen: (open: boolean) => void;
  createNewBrandProfile: (name: string) => BrandDNAProfile;

  // Model Selection
  selectedModel: string;
  setSelectedModel: (model: string) => void;

  // Brand Profiles (Persisted locally in localStorage)
  brandProfiles: BrandDNAProfile[];
  userBrandProfiles: BrandDNAProfile[];
  activeProfile: BrandDNAProfile;
  setActiveProfileById: (brandName: string) => void;
  saveBrandProfile: (profile: BrandDNAProfile) => void;
  renameBrandProfile: (oldName: string, newName: string) => boolean;
  deleteBrandProfile: (brandName: string) => void;
  addBrandSource: (brandName: string, url: string) => void;
  removeBrandSource: (brandName: string, sourceId: string) => void;
  setProfileLifecycleState: (brandName: string, state: LifecycleState) => void;
  importProfilesFromJson: (jsonStr: string) => boolean;
  exportProfilesToJson: () => string;
  resetToDefaultProfiles: () => void;

  // Audit History (Persisted locally in localStorage)
  auditHistory: AuditReport[];
  addAuditToHistory: (report: AuditReport) => void;
  clearAuditHistory: () => void;

  // Current draft & report state
  currentDraftText: string;
  setCurrentDraftText: (text: string) => void;
  currentReport: AuditReport | null;
  setCurrentReport: (report: AuditReport | null) => void;

  // UI Navigation
  activeTab: 'landing' | 'audit' | 'brand_dna' | 'privacy';
  setActiveTab: (tab: 'landing' | 'audit' | 'brand_dna' | 'privacy') => void;

  // Key Modal Control
  isKeyModalOpen: boolean;
  setIsKeyModalOpen: (open: boolean) => void;
}

const LOCAL_STORAGE_USER_PROFILES_KEY = 'loomfrog_user_brand_profiles_v1';
const LOCAL_STORAGE_HISTORY_KEY = 'loomfrog_audit_history_v1';
const LOCAL_STORAGE_ACTIVE_PROFILE_KEY = 'loomfrog_active_profile_name';
const LOCAL_STORAGE_ONBOARDING_KEY = 'loomfrog_onboarding_completed_v1';

export const BLANK_BRAND_PROFILE: BrandDNAProfile = {
  metadata: {
    brandName: 'Untitled Brand',
    brandVersion: '1.0.0',
    schemaVersion: '1.0',
    updatedAt: new Date().toISOString(),
    description: 'Custom brand profile'
  },
  lifecycleState: 'DRAFT',
  voice: {
    primaryTone: 'Confident, clear, and authentic',
    formalityScore: 0.7,
    toneAttributes: ['Clear', 'Professional']
  },
  vocabulary: {
    forbidden: [],
    preferred: []
  },
  colors: {
    primaryHex: ['#06B6D4'],
    secondaryHex: ['#2DD4BF'],
    strictCompliance: false
  },
  rules: [],
  sources: []
};

const KeyContext = createContext<KeyContextType | undefined>(undefined);

export const KeyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. IN-MEMORY KEY ONLY - Absolutely NO localStorage/sessionStorage persistence
  const [apiKey, setApiKeyState] = useState<string>('');

  const setApiKey = (key: string) => {
    setApiKeyState(key.trim());
  };

  const clearApiKey = () => {
    setApiKeyState('');
  };

  const hasApiKey = Boolean(apiKey && apiKey.length > 5);

  // 2. Demo Mode
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);

  // Demo Output Prompt State
  const [isDemoOutputPromptOpen, setIsDemoOutputPromptOpen] = useState<boolean>(false);

  // API Key Verified Success Modal State
  const [isApiKeySuccessModalOpen, setIsApiKeySuccessModalOpen] = useState<boolean>(false);

  // Create Profile Modal State
  const [isCreateProfileModalOpen, setIsCreateProfileModalOpen] = useState<boolean>(false);

  // Onboarding Modal State - Opens on guide click or user prompt
  const [hasCompletedOnboarding, setHasCompletedOnboardingState] = useState<boolean>(false);
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState<boolean>(false);

  const setHasCompletedOnboarding = (completed: boolean) => {
    setHasCompletedOnboardingState(completed);
  };

  const toggleDemoMode = () => {
    setIsDemoMode((prev) => {
      const nextVal = !prev;
      if (nextVal) {
        setIsDemoOutputPromptOpen(true);
      }
      return nextVal;
    });
  };

  // 3. Model Configuration
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);

  // Automatically migrate any legacy/deprecated model selection (e.g. gemini-2.5-flash) to DEFAULT_MODEL
  useEffect(() => {
    if (selectedModel === 'gemini-2.5-flash') {
      setSelectedModel(DEFAULT_MODEL);
    }
  }, [selectedModel]);

  // 4. Navigation
  const [activeTab, setActiveTab] = useState<'landing' | 'audit' | 'brand_dna' | 'privacy'>('landing');
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);

  // 5. Current Draft & Report in editor (clean slate by default)
  const [currentDraftText, setCurrentDraftText] = useState<string>('');
  const [currentReport, setCurrentReport] = useState<AuditReport | null>(null);

  // Demo Prompt Handlers
  const generateDemoOutput = () => {
    setIsDemoMode(true);
    setCurrentDraftText(DEMO_SAMPLE_DRAFTS[0].content);
    setCurrentReport(PRECOMPUTED_DEMO_AUDIT);
    setIsDemoOutputPromptOpen(false);
  };

  const dismissDemoOutputPrompt = () => {
    setIsDemoMode(true);
    setCurrentDraftText('');
    setCurrentReport(null);
    setIsDemoOutputPromptOpen(false);
  };

  // 6. User Custom Brand Profiles (Persisted locally)
  const [userBrandProfiles, setUserBrandProfiles] = useState<BrandDNAProfile[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(LOCAL_STORAGE_USER_PROFILES_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_BRAND_PROFILES;
  });

  const [activeProfileName, setActiveProfileName] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(LOCAL_STORAGE_ACTIVE_PROFILE_KEY);
        if (saved) return saved;
      }
    } catch {
      // fallback
    }
    return DEFAULT_BRAND_PROFILES[0]?.metadata.brandName || 'Apex Cloud Systems';
  });

  // Effective brand profiles: user profiles take precedence, initialized with defaults
  const brandProfiles: BrandDNAProfile[] = userBrandProfiles.length > 0 ? userBrandProfiles : DEFAULT_BRAND_PROFILES;

  // 7. Audit History (Persisted locally)
  const [auditHistory, setAuditHistory] = useState<AuditReport[]>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      }
    } catch {
      // fallback
    }
    return [PRECOMPUTED_DEMO_AUDIT];
  });

  // Sync User Profiles to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_USER_PROFILES_KEY, JSON.stringify(userBrandProfiles));
    } catch (e) {
      console.warn('Failed to save user profiles to localStorage', e);
    }
  }, [userBrandProfiles]);

  // Sync Active Profile Name to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_PROFILE_KEY, activeProfileName);
    } catch (e) {
      console.warn('Failed to save active profile name', e);
    }
  }, [activeProfileName]);

  // Sync Audit History to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(auditHistory));
    } catch (e) {
      console.warn('Failed to save history to localStorage', e);
    }
  }, [auditHistory]);

  const activeProfile =
    brandProfiles.find((p) => p.metadata.brandName === activeProfileName) ||
    brandProfiles[0] ||
    BLANK_BRAND_PROFILE;

  const setActiveProfileById = (brandName: string) => {
    setActiveProfileName(brandName);
  };

  const createNewBrandProfile = (name: string): BrandDNAProfile => {
    const trimmed = name.trim();
    const newProf: BrandDNAProfile = {
      metadata: {
        brandName: trimmed,
        brandVersion: '1.0.0',
        schemaVersion: '1.0',
        updatedAt: new Date().toISOString(),
        description: 'New custom brand profile draft.'
      },
      lifecycleState: 'DRAFT',
      voice: {
        primaryTone: 'Confident, clear, and authentic',
        formalityScore: 0.7,
        toneAttributes: ['Clear', 'Direct', 'Engaging']
      },
      vocabulary: {
        forbidden: [],
        preferred: []
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
          description: 'Zero tolerance for unapproved or forbidden buzzwords.',
          weight: 2.5,
          evaluatorType: 'Deterministic'
        },
        {
          ruleId: 'R-TONE-01',
          category: 'Text',
          description: 'Maintain authentic and clear voice tone across messaging.',
          weight: 2.0,
          evaluatorType: 'Semantic'
        }
      ],
      sources: []
    };

    if (isDemoMode) {
      setIsDemoMode(false);
    }

    setUserBrandProfiles((prev) => {
      const filtered = prev.filter((p) => p.metadata.brandName !== trimmed);
      return [newProf, ...filtered];
    });
    setActiveProfileName(trimmed);
    return newProf;
  };

  const saveBrandProfile = (updatedProfile: BrandDNAProfile) => {
    const brandName = updatedProfile.metadata.brandName;
    setUserBrandProfiles((prev) => {
      const existingIdx = prev.findIndex((p) => p.metadata.brandName === brandName);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = {
          ...updatedProfile,
          metadata: {
            ...updatedProfile.metadata,
            updatedAt: new Date().toISOString()
          }
        };
        return copy;
      }
      return [updatedProfile, ...prev];
    });
    if (brandName) {
      setActiveProfileName(brandName);
    }
  };

  const renameBrandProfile = (oldName: string, newName: string): boolean => {
    const trimmedNew = newName.trim();
    if (!trimmedNew || oldName === trimmedNew) return false;

    // Check if another profile already has the new name
    const exists = userBrandProfiles.some(
      (p) => p.metadata.brandName.toLowerCase() === trimmedNew.toLowerCase() && p.metadata.brandName !== oldName
    );
    if (exists) return false;

    setUserBrandProfiles((prev) =>
      prev.map((p) => {
        if (p.metadata.brandName === oldName) {
          return {
            ...p,
            metadata: {
              ...p.metadata,
              brandName: trimmedNew,
              updatedAt: new Date().toISOString()
            }
          };
        }
        return p;
      })
    );

    if (activeProfileName === oldName) {
      setActiveProfileName(trimmedNew);
    }
    return true;
  };

  const addBrandSource = (brandName: string, url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setUserBrandProfiles((prev) =>
      prev.map((p) => {
        if (p.metadata.brandName === brandName) {
          const sources = p.sources || [];
          if (sources.some((s) => s.url.toLowerCase() === trimmed.toLowerCase())) {
            return p; // duplicate
          }
          const newSource = {
            id: `src_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            url: trimmed,
            addedAt: new Date().toISOString(),
            status: 'active' as const
          };
          return {
            ...p,
            sources: [...sources, newSource],
            metadata: {
              ...p.metadata,
              updatedAt: new Date().toISOString()
            }
          };
        }
        return p;
      })
    );
  };

  const removeBrandSource = (brandName: string, sourceId: string) => {
    setUserBrandProfiles((prev) =>
      prev.map((p) => {
        if (p.metadata.brandName === brandName) {
          return {
            ...p,
            sources: (p.sources || []).filter((s) => s.id !== sourceId),
            metadata: {
              ...p.metadata,
              updatedAt: new Date().toISOString()
            }
          };
        }
        return p;
      })
    );
  };

  const deleteBrandProfile = (brandName: string) => {
    setUserBrandProfiles((prev) => prev.filter((p) => p.metadata.brandName !== brandName));
    if (activeProfileName === brandName) {
      const remaining = userBrandProfiles.filter((p) => p.metadata.brandName !== brandName);
      if (remaining[0]) {
        setActiveProfileName(remaining[0].metadata.brandName);
      } else {
        setActiveProfileName('');
      }
    }
  };

  const setProfileLifecycleState = (brandName: string, newState: LifecycleState) => {
    setUserBrandProfiles((prev) =>
      prev.map((p) => {
        if (p.metadata.brandName === brandName) {
          // If setting to ACTIVE, demote other ACTIVE profiles to APPROVED
          return { ...p, lifecycleState: newState };
        }
        if (newState === 'ACTIVE' && p.lifecycleState === 'ACTIVE') {
          return { ...p, lifecycleState: 'APPROVED' };
        }
        return p;
      })
    );
  };

  const importProfilesFromJson = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      const profilesToImport = Array.isArray(data) ? data : [data];

      // Simple schema validation
      const validProfiles = profilesToImport.filter(
        (p) => p.metadata?.brandName && p.voice && p.vocabulary && p.rules
      );

      if (validProfiles.length === 0) return false;

      setUserBrandProfiles((prev) => {
        const merged = [...prev];
        validProfiles.forEach((newP) => {
          const idx = merged.findIndex((m) => m.metadata.brandName === newP.metadata.brandName);
          if (idx >= 0) {
            merged[idx] = newP;
          } else {
            merged.push(newP);
          }
        });
        return merged;
      });

      setActiveProfileName(validProfiles[0].metadata.brandName);
      return true;
    } catch {
      return false;
    }
  };

  const exportProfilesToJson = (): string => {
    return JSON.stringify(brandProfiles, null, 2);
  };

  const resetToDefaultProfiles = () => {
    setUserBrandProfiles(DEFAULT_BRAND_PROFILES);
    setActiveProfileName(DEFAULT_BRAND_PROFILES[0].metadata.brandName);
  };

  const addAuditToHistory = (report: AuditReport) => {
    setAuditHistory((prev) => [report, ...prev.slice(0, 19)]); // keep last 20 reports
  };

  const clearAuditHistory = () => {
    setAuditHistory([]);
  };

  return (
    <KeyContext.Provider
      value={{
        apiKey,
        setApiKey,
        clearApiKey,
        hasApiKey,
        isDemoMode,
        setIsDemoMode,
        toggleDemoMode,
        isOnboardingModalOpen,
        setIsOnboardingModalOpen,
        hasCompletedOnboarding,
        setHasCompletedOnboarding,
        selectedModel,
        setSelectedModel,
        brandProfiles,
        userBrandProfiles,
        activeProfile,
        setActiveProfileById,
        saveBrandProfile,
        renameBrandProfile,
        deleteBrandProfile,
        addBrandSource,
        removeBrandSource,
        setProfileLifecycleState,
        importProfilesFromJson,
        exportProfilesToJson,
        resetToDefaultProfiles,
        createNewBrandProfile,
        auditHistory,
        addAuditToHistory,
        clearAuditHistory,
        currentDraftText,
        setCurrentDraftText,
        currentReport,
        setCurrentReport,
        isDemoOutputPromptOpen,
        setIsDemoOutputPromptOpen,
        generateDemoOutput,
        dismissDemoOutputPrompt,
        isApiKeySuccessModalOpen,
        setIsApiKeySuccessModalOpen,
        isCreateProfileModalOpen,
        setIsCreateProfileModalOpen,
        activeTab,
        setActiveTab,
        isKeyModalOpen,
        setIsKeyModalOpen
      }}
    >
      {children}
    </KeyContext.Provider>
  );
};

export const useKeyContext = (): KeyContextType => {
  const context = useContext(KeyContext);
  if (!context) {
    throw new Error('useKeyContext must be used within a KeyProvider');
  }
  return context;
};
