import React from 'react';
import {
  ArrowRight,
  Shield,
  Zap,
  Sparkles,
  Layers,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  CheckCircle2,
  Lock,
  ChevronUp,
  Cpu
} from 'lucide-react';
import { useKeyContext } from '../../context/KeyContext';
import { LoomFrogLogo, LoomFrogIcon } from '../LoomFrogLogo';
import { FrogHero3D } from './FrogHero3D';
import { GhostFibers } from '../GhostFibers';

export const LandingPage: React.FC = () => {
  const { setActiveTab, setIsKeyModalOpen, setIsOnboardingModalOpen } = useKeyContext();

  const handleTryLoomFrog = () => {
    setActiveTab('audit');
    setIsOnboardingModalOpen(true);
  };

  const scrollToSection = (id: string) => {
    if (typeof document !== 'undefined') {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-[#F3F4F6] selection:bg-cyan-500/30 selection:text-cyan-200 flex flex-col font-sans">
      {/* STICKY TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 bg-[#030818]/80 backdrop-blur-xl border-b border-cyan-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4">
          {/* Brandmark / Logo */}
          <div
            onClick={scrollToTop}
            className="cursor-pointer transition-opacity hover:opacity-90"
            title="LoomFrog — Return to Top"
          >
            <LoomFrogLogo size="md" />
          </div>

          {/* Center/Right Anchor Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-slate-400 font-lexend">
            <button
              onClick={() => scrollToSection('why-loomfrog')}
              className="hover:text-cyan-300 transition-colors cursor-pointer py-1"
            >
              Why LoomFrog
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-cyan-300 transition-colors cursor-pointer py-1"
            >
              How it Works
            </button>
            <button
              onClick={() => scrollToSection('built-for-real-use')}
              className="hover:text-cyan-300 transition-colors cursor-pointer py-1"
            >
              Built for Real Use
            </button>
          </nav>

          {/* Action CTA Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleTryLoomFrog}
              className="neo-liquid-btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] font-lexend"
            >
              <span>Try LoomFrog</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#030818]" />
            </button>
          </div>
        </div>
      </header>

      {/* 1. HERO SECTION */}
      <section className="relative pt-12 sm:pt-16 lg:pt-20 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Ghost Fibers Living Visual Effect */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-60 mix-blend-screen">
          <GhostFibers
            lineColor="#140E35"
            glowColor="#00F0FF"
            speed={0.2}
            scale={2}
            rotationSpeed={0.2}
            glowIntensity={2.0}
            brightness={2.0}
            className="w-full h-full"
          />
        </div>

        {/* Clean Deep Obsidian Canvas & Ambient Radial Accents */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/50 via-transparent to-[#020617] pointer-events-none z-0" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[850px] h-[550px] bg-cyan-500/[0.08] rounded-full blur-[150px] pointer-events-none z-0" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[350px] bg-teal-500/[0.05] rounded-full blur-[120px] pointer-events-none z-0" />

        <div className="max-w-7xl mx-auto relative z-10">
          {/* TWO-COLUMN HERO GRID (Desktop Side-by-Side, Mobile Stacked) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-6 xl:gap-8 items-center mb-16 sm:mb-20">
            {/* Left Column: Value Proposition & CTAs */}
            <div className="lg:col-span-6 xl:col-span-5 text-left flex flex-col items-start">
              {/* Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.12] mb-5 font-lexend">
                Your brand&apos;s voice, verified — <br className="hidden sm:inline" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-200">
                  with real security
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed mb-8">
                LoomFrog audits your writing and visual assets against your own Brand DNA — combining instant rule-based checks with AI judgment, entirely in your browser. No account. No cost. For All.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full sm:w-auto">
                <button
                  onClick={handleTryLoomFrog}
                  className="w-full sm:w-auto neo-liquid-btn-primary inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-semibold cursor-pointer active:scale-95 transition-all shadow-[0_0_25px_rgba(6,182,212,0.35)] font-lexend"
                >
                  <span>Try LoomFrog</span>
                  <ArrowRight className="w-4 h-4 text-[#030818]" />
                </button>
                <button
                  onClick={() => scrollToSection('how-it-works')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-medium text-slate-200 bg-[#030818]/60 hover:bg-[#030818]/90 hover:text-white border border-cyan-500/20 hover:border-cyan-500/40 backdrop-blur-md transition-all cursor-pointer font-lexend"
                >
                  <span>How it works</span>
                </button>
              </div>
            </div>

            {/* Right Column: 3D Rotating Frog Visual (Wider box & bigger visual) */}
            <div className="lg:col-span-6 xl:col-span-7 w-full">
              <FrogHero3D className="w-full" />
            </div>
          </div>

          {/* Interactive Diagnostic Preview Card */}
          <div className="max-w-4xl mx-auto neo-liquid-panel rounded-3xl p-6 sm:p-7 text-left shadow-[0_0_50px_rgba(6,182,212,0.12)]">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-cyan-500/20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60 border border-rose-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60 border border-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500/60 border border-teal-400" />
                <span className="text-xs font-mono text-slate-400 ml-2">Live Compliance Diagnostic &bull; Dual-Tier Engine</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-300 bg-cyan-950/40 px-2.5 py-1 rounded-full border border-cyan-500/30">
                <Shield className="w-3.5 h-3.5 text-teal-400" />
                <span>Rule checks run on-device</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Draft sample */}
              <div className="bg-[#030818]/60 p-4 rounded-2xl border border-cyan-500/20 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                    <span>Draft Submission</span>
                    <span className="text-rose-400 font-medium">2 Issues Detected</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-mono">
                    &quot;Our revolutionary platform will{' '}
                    <mark className="bg-rose-500/20 text-rose-300 border-b border-rose-400 px-1 rounded-sm">synergize</mark>{' '}
                    your enterprise workflows and deliver{' '}
                    <mark className="bg-amber-500/20 text-amber-300 border-b border-amber-400 px-1 rounded-sm">cheap</mark>{' '}
                    turnaround times.&quot;
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-cyan-500/20 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Lexicon: Strict</span>
                  <span>Formality: 85%</span>
                </div>
              </div>

              {/* Verified Result */}
              <div className="bg-[#030818]/60 p-4 rounded-2xl border border-teal-500/30 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-teal-300 mb-2 flex items-center justify-between">
                    <span>Deterministic &amp; AI Diagnosis</span>
                    <span className="text-teal-400 font-medium">Verified Fix</span>
                  </div>
                  <ul className="text-xs space-y-2 text-slate-300">
                    <li className="flex items-start gap-1.5">
                      <span className="text-rose-400 font-bold shrink-0">&times;</span>
                      <span><strong>Banned Buzzword:</strong> &quot;synergize&quot; violates brand clarity guidelines.</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold shrink-0">&bull;</span>
                      <span><strong>Tone Upgrade:</strong> Replace &quot;cheap&quot; with &quot;cost-efficient&quot;.</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-4 pt-3 border-t border-cyan-500/20 flex items-center justify-between">
                  <span className="text-xs text-teal-300 font-medium">One-Click Rewrite Ready</span>
                  <span className="text-xs text-teal-400 font-mono font-medium">Score: 94 / 100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. SECTION: WHY LOOMFROG IS DIFFERENT */}
      <section id="why-loomfrog" className="py-24 sm:py-28 px-4 sm:px-6 lg:px-8 relative border-y border-cyan-500/20 bg-[#030818]/60 backdrop-blur-md">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
            <span className="text-xs font-mono font-medium tracking-wider text-cyan-400 uppercase mb-2 block">
              Core Principles
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3 font-lexend">
              Why LoomFrog is different
            </h2>
            <p className="text-slate-300 text-sm sm:text-base">
              Built from first principles for uncompromising privacy, mathematical rigor, and genuine utility.
            </p>
          </div>

          {/* Three Side-by-Side Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {/* Block 1: Actually free */}
            <div className="neo-liquid-panel rounded-3xl p-6 sm:p-7 flex flex-col justify-between group hover:border-cyan-500/40 transition-all">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-5 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2 tracking-tight font-lexend">Actually free</h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  No tiers, no &quot;free trial,&quot; no credit card. You bring your own Gemini key, so there&apos;s no server cost to pass on to you.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-cyan-500/20 flex items-center gap-2 text-[11px] font-mono text-cyan-300">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>Zero Subscription Lock-in</span>
              </div>
            </div>

            {/* Block 2: Actually private */}
            <div className="neo-liquid-panel rounded-3xl p-6 sm:p-7 flex flex-col justify-between group hover:border-teal-500/40 transition-all">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-teal-950/40 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-5 shadow-[0_0_15px_rgba(45,212,191,0.2)]">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2 tracking-tight font-lexend">Actually private</h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  There is no LoomFrog server. Rule-based checks run in your browser, while AI audits send your content to Google&apos;s Gemini API using your own key, and the key is held in memory only.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-cyan-500/20 flex items-center gap-2 text-[11px] font-mono text-teal-300">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>Volatile RAM Execution</span>
              </div>
            </div>

            {/* Block 3: Actually rigorous */}
            <div className="neo-liquid-panel rounded-3xl p-6 sm:p-7 flex flex-col justify-between group hover:border-cyan-500/40 transition-all">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-center text-cyan-300 mb-5 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2 tracking-tight font-lexend">Actually rigorous</h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Every audit runs two checks at once: exact rule-matching for hard requirements (banned words, brand colors) and AI judgment for tone and nuance — so you get both precision and context.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-cyan-500/20 flex items-center gap-2 text-[11px] font-mono text-cyan-300">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>Deterministic + LLM Hybrid</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SECTION: HOW IT WORKS */}
      <section id="how-it-works" className="py-24 sm:py-28 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
            <span className="text-xs font-mono font-medium tracking-wider text-teal-400 uppercase mb-2 block">
              Auditing Pipeline
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3 font-lexend">
              How it works
            </h2>
            <p className="text-slate-300 text-sm sm:text-base">
              Three straightforward steps from raw brand rules to instant, actionable diagnosis.
            </p>
          </div>

          {/* Three Numbered Steps */}
          <div className="space-y-4">
            {/* Step 1 */}
            <div className="neo-liquid-panel rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center gap-5 hover:border-cyan-500/40 transition-all">
              <div className="w-11 h-11 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                <span className="font-mono font-bold text-sm text-cyan-400">01</span>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-white mb-1 tracking-tight font-lexend">
                  Define your Brand DNA
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Your voice, banned words, approved colors, and any custom rules.
                </p>
              </div>
              <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-cyan-300 bg-cyan-950/40 px-3 py-1 rounded-full border border-cyan-500/30">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>JSON Profiles</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="neo-liquid-panel rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center gap-5 hover:border-teal-500/40 transition-all">
              <div className="w-11 h-11 rounded-2xl bg-teal-950/40 border border-teal-500/30 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(45,212,191,0.2)]">
                <span className="font-mono font-bold text-sm text-teal-400">02</span>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-white mb-1 tracking-tight font-lexend">
                  Drop in your content
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  Paste text, or upload a document, spreadsheet, or image.
                </p>
              </div>
              <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-teal-300 bg-teal-950/40 px-3 py-1 rounded-full border border-teal-500/30">
                <FileText className="w-3.5 h-3.5 text-teal-400" />
                <span>Multi-Modal Input</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="neo-liquid-panel rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center gap-5 hover:border-cyan-500/40 transition-all">
              <div className="w-11 h-11 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
                <span className="font-mono font-bold text-sm text-cyan-400">03</span>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-white mb-1 tracking-tight font-lexend">
                  Get a real diagnosis
                </h3>
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                  See exactly what&apos;s off, why, and how to fix it — with one-click suggested rewrites.
                </p>
              </div>
              <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-cyan-300 bg-cyan-950/40 px-3 py-1 rounded-full border border-cyan-500/30">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Auto-Fix Proposals</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SECTION: BUILT FOR REAL USE */}
      <section id="built-for-real-use" className="py-24 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-cyan-500/20 bg-[#030818]/60 backdrop-blur-md relative">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <span className="text-xs font-mono font-medium tracking-wider text-cyan-400 uppercase mb-2 block">
            Enterprise Utility
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-4 font-lexend">
            Built for real use, not a demo
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed mb-8">
            Supports text, Markdown, Word documents, spreadsheets, and images. No account required. No usage limits — you control your own Gemini quota.
          </p>

          {/* Supported format badges */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mb-12">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono text-cyan-200 backdrop-blur-md">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Documents (.docx, .txt, .md)</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-950/40 border border-teal-500/30 text-xs font-mono text-teal-200 backdrop-blur-md">
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
              <span>Spreadsheets (.xlsx, .csv)</span>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/40 border border-purple-500/30 text-xs font-mono text-purple-200 backdrop-blur-md">
              <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
              <span>Visual Assets (.png, .jpg, .webp)</span>
            </div>
          </div>

          {/* CTA Box */}
          <div className="neo-liquid-panel rounded-3xl p-8 sm:p-10 max-w-2xl mx-auto text-center shadow-[0_0_40px_rgba(6,182,212,0.15)]">
            <div className="w-14 h-14 rounded-2xl bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <LoomFrogIcon size={32} glow={true} />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight font-lexend">
              Ready to verify your brand compliance?
            </h3>
            <p className="text-slate-300 text-xs sm:text-sm max-w-md mx-auto mb-6">
              Start auditing instantly with preloaded demo guidelines, or connect your Gemini API key to evaluate your own live brand standards.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                onClick={handleTryLoomFrog}
                className="w-full sm:w-auto neo-liquid-btn-primary inline-flex items-center justify-center gap-2 px-7 py-3 rounded-2xl text-xs sm:text-sm font-semibold cursor-pointer active:scale-95 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] font-lexend"
              >
                <span>Try LoomFrog</span>
                <ArrowRight className="w-4 h-4 text-[#030818]" />
              </button>
              <button
                onClick={() => {
                  setActiveTab('audit');
                  setIsKeyModalOpen(true);
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl text-xs sm:text-sm font-medium text-slate-200 bg-[#030818]/60 hover:bg-[#030818]/90 border border-cyan-500/20 hover:border-cyan-500/40 hover:text-white backdrop-blur-md transition-all cursor-pointer font-lexend"
              >
                <span>Connect API Key</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-cyan-500/20 py-8 px-4 sm:px-6 lg:px-8 bg-[#020617] text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <LoomFrogIcon size={20} glow={true} />
            <span className="font-lexend font-semibold text-white">LoomFrog</span>
            <span>&bull;</span>
            <span>Brand DNA &amp; Tone Consistency Platform</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('audit')}
              className="text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer font-lexend"
            >
              Audit Studio
            </button>
            <button
              onClick={() => setActiveTab('brand_dna')}
              className="text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer font-lexend"
            >
              Brand DNA Manager
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className="text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer font-lexend"
            >
              Privacy Bounds
            </button>
            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer font-lexend"
            >
              <span>Back to top</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-5 pt-4 border-t border-cyan-500/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <div>
            &copy; 2026 LoomFrog. Zero-server browser execution. LoomFrog stores no customer data or credentials.
          </div>
          <div className="text-slate-400 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span>Designed and built by <span className="text-slate-200 font-medium">Amir Asadullah Chowdhury</span></span>
            <span className="text-slate-600">&bull;</span>
            <a
              href="https://github.com/kaimir-auth/LoomFrog"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2"
            >
              GitHub
            </a>
            <span className="text-slate-600">&bull;</span>
            <a
              href="https://www.linkedin.com/in/amir-asadullah-chowdhury-363976429"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2"
            >
              LinkedIn
            </a>
            <span className="text-slate-600">&bull;</span>
            <a
              href="https://kaiservahid.substack.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 transition-colors underline underline-offset-2"
            >
              Substack
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
