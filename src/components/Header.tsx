import React from 'react';
import { Shield, Sparkles, Key, Cpu, FileCheck, Layers, HelpCircle } from 'lucide-react';
import { useKeyContext } from '../context/KeyContext';
import { AVAILABLE_MODELS } from '../services/geminiSemanticEngine';
import { LoomFrogLogo } from './LoomFrogLogo';

export const Header: React.FC = () => {
  const {
    hasApiKey,
    isDemoMode,
    toggleDemoMode,
    selectedModel,
    setSelectedModel,
    activeTab,
    setActiveTab,
    setIsKeyModalOpen,
    setIsOnboardingModalOpen,
    activeProfile,
    brandProfiles,
    setActiveProfileById
  } = useKeyContext();

  return (
    <header className="sticky top-0 z-40 bg-[#02050f]/80 backdrop-blur-xl border-b border-cyan-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      {/* TIER 1: Upper Ribbon (Brand Identity + Engine Controls) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/10">
        {/* Left: Brandmark & Custom Frog Logo */}
        <div className="cursor-pointer group" onClick={() => setActiveTab('landing')} title="LoomFrog — Return to Overview">
          <LoomFrogLogo size="md" />
        </div>

        {/* Right: DNA Selector, Model, Demo Mode, and BYOK Key */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Active DNA Quick Selector */}
          <div className="col-span-1 sm:col-auto flex items-center gap-1.5 bg-[#030818]/80 px-3 py-1.5 rounded-2xl border border-cyan-500/20 min-w-0 shadow-sm">
            <span className="text-[11px] text-cyan-400 font-semibold font-mono shrink-0">DNA:</span>
            <select
              value={activeProfile?.metadata?.brandName || ''}
              onChange={(e) => setActiveProfileById(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer pr-1 truncate w-full"
            >
              {brandProfiles.length === 0 ? (
                <option value="" className="bg-[#030818] text-slate-400">
                  + Create Brand Profile
                </option>
              ) : (
                brandProfiles.map((p) => (
                  <option key={p.metadata.brandName} value={p.metadata.brandName} className="bg-[#030818] text-white">
                    {p.metadata.brandName} (v{p.metadata.brandVersion})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Model Selector */}
          <div className="col-span-1 sm:col-auto flex items-center gap-1.5 bg-[#030818]/80 px-3 py-1.5 rounded-2xl border border-cyan-500/20 min-w-0 shadow-sm">
            <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-none cursor-pointer font-mono truncate w-full"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#030818] text-white">
                  {m.id}
                </option>
              ))}
            </select>
          </div>

          {/* Guide / 4-Step Quick Tour */}
          <button
            onClick={() => setIsOnboardingModalOpen(true)}
            className="col-span-1 sm:col-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold bg-[#030818]/80 text-slate-300 border border-cyan-500/20 hover:text-white hover:border-cyan-400/40 hover:bg-white/[0.05] transition-all cursor-pointer truncate min-w-0"
            title="Open 4-Step LoomFrog Guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Guide</span>
          </button>

          {/* Demo Mode / Live API Mode Indicator */}
          <div
            onClick={toggleDemoMode}
            className={`col-span-1 sm:col-auto cursor-pointer inline-flex items-center justify-center sm:justify-start gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold border transition-all truncate min-w-0 ${
              isDemoMode
                ? 'bg-teal-950/40 text-teal-300 border-teal-500/40 hover:bg-teal-900/40 shadow-[0_0_15px_rgba(20,184,166,0.2)]'
                : hasApiKey
                ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/40 hover:bg-cyan-900/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                : 'bg-rose-950/40 text-rose-300 border-rose-500/40 hover:bg-rose-900/40 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
            }`}
            title="Click to toggle Demo Mode"
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isDemoMode
                  ? 'bg-teal-400 animate-pulse'
                  : hasApiKey
                  ? 'bg-cyan-400 animate-pulse'
                  : 'bg-rose-400'
              }`}
            />
            <span className="truncate">
              {isDemoMode ? (
                <>
                  <span className="text-teal-400 font-mono">Demo Mode</span>
                </>
              ) : hasApiKey ? (
                <>
                  <span className="text-cyan-400 font-mono">Live API</span>
                </>
              ) : (
                <span className="text-rose-400 font-mono">No Key</span>
              )}
            </span>
          </div>

          {/* Set API Key Button */}
          <button
            onClick={() => setIsKeyModalOpen(true)}
            className={`col-span-1 sm:col-auto inline-flex items-center justify-center sm:justify-start gap-1.5 px-4 py-1.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer truncate min-w-0 active:scale-95 ${
              hasApiKey
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30 shadow-[0_0_15px_rgba(20,184,166,0.25)]'
                : 'neo-liquid-btn-primary'
            }`}
          >
            <Key className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{hasApiKey ? 'Key Active' : 'Set API Key'}</span>
          </button>
        </div>
      </div>

      {/* TIER 2: Lower Ribbon (Dedicated Main Navigation Bar) */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2 flex items-center justify-start sm:justify-center overflow-x-auto no-scrollbar w-full">
        <nav className="inline-flex items-center gap-1.5 bg-[#030818]/90 p-1.5 rounded-full border border-cyan-500/20 shadow-lg shrink-0 min-w-max">
          <button
            onClick={() => setActiveTab('landing')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
              activeTab === 'landing'
                ? 'neo-liquid-pill-active'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Overview
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
              activeTab === 'audit'
                ? 'neo-liquid-pill-active'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
            Audit Studio
          </button>

          <button
            onClick={() => setActiveTab('brand_dna')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
              activeTab === 'brand_dna'
                ? 'neo-liquid-pill-active'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-teal-400" />
            Brand DNA Manager
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-950/60 text-teal-300 border border-teal-500/30 font-mono">
              {activeProfile.lifecycleState}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
              activeTab === 'privacy'
                ? 'neo-liquid-pill-active'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            Privacy Bounds
          </button>
        </nav>
      </div>
    </header>
  );
};
