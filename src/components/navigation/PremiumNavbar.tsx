import React, { useState } from 'react';
import {
  Shield,
  ArrowRight,
  Menu,
  X,
  Sparkles,
  UserCheck,
  Activity,
  Layers,
  Database,
  Lock,
} from 'lucide-react';
import { SystemStatusData } from '../../services/environment';

interface PremiumNavbarProps {
  systemStatus: SystemStatusData;
  onEnterWorkspace: () => void;
  onOpenJudgeAccess: () => void;
  onOpenTour: () => void;
}

export const PremiumNavbar: React.FC<PremiumNavbarProps> = ({
  systemStatus,
  onEnterWorkspace,
  onOpenJudgeAccess,
  onOpenTour,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#070B12]/85 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)] transition-all">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
        {/* Left: BRANDTRACE Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00E6A0]/20 to-[#00C8F0]/10 border border-[#00E6A0]/40 flex items-center justify-center text-[#00E6A0] shadow-[0_0_20px_rgba(0,230,160,0.25)]">
            <Shield size={22} className="text-[#00E6A0]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white block leading-none">
                BRANDTRACE
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-[#00E6A0]/15 text-[#00E6A0] border border-[#00E6A0]/30 hidden sm:inline-block">
                EVIDENCE INTELLIGENCE
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#9AAABD] block mt-1">
              Brand Governance Platform
            </span>
          </div>
        </div>

        {/* Center: Desktop Navigation Links (Satisfies QA-01 expectations) */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#9AAABD]">
          <a href="#how-it-works" className="hover:text-white transition-colors">
            How It Works
          </a>
          <a href="#system-architecture" className="hover:text-white transition-colors">
            Architecture
          </a>
          <a href="#platform-modules" className="hover:text-white transition-colors">
            Capabilities
          </a>
          <a href="#evidence-trace" className="hover:text-white transition-colors">
            Evidence Model
          </a>
          <a href="#round3-roadmap" className="hover:text-white transition-colors">
            Round 3 Roadmap
          </a>
        </nav>

        {/* Right: Actions */}
        <div className="hidden sm:flex items-center gap-2.5">
          {/* Judge Access Button */}
          <button
            type="button"
            onClick={onOpenJudgeAccess}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#111D2A] hover:bg-[#1A2C3F] border border-white/10 text-xs font-bold text-[#F4F8FC] transition-all cursor-pointer"
            aria-label="Open Judge Access and Credentials Panel"
          >
            <UserCheck size={14} className="text-[#00C8F0]" />
            <span>Judge Mode</span>
          </button>

          {/* Judge Tour Button */}
          <button
            type="button"
            onClick={onOpenTour}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#00E6A0]/10 hover:bg-[#00E6A0]/20 border border-[#00E6A0]/30 text-xs font-bold text-[#00E6A0] transition-all cursor-pointer"
            aria-label="Launch Guided Judge Tour"
          >
            <Sparkles size={14} className="text-[#00E6A0]" />
            <span>Tour</span>
          </button>

          {/* Open Workspace Primary CTA (Satisfies QA-01 and QA-03) */}
          <button
            type="button"
            onClick={onEnterWorkspace}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#00E6A0] hover:bg-[#00c88a] text-[#070B12] text-xs font-bold transition-all shadow-[0_0_20px_rgba(0,230,160,0.35)] cursor-pointer"
            aria-label="Open Governance Workspace"
          >
            <span>Open Workspace</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-xl text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-[#0C1420]/95 backdrop-blur-2xl px-5 py-5 space-y-3.5 animate-in slide-in-from-top-2 duration-150">
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1.5 text-sm font-medium text-[#9AAABD] hover:text-white"
          >
            How It Works
          </a>
          <a
            href="#system-architecture"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1.5 text-sm font-medium text-[#9AAABD] hover:text-white"
          >
            Architecture
          </a>
          <a
            href="#platform-modules"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1.5 text-sm font-medium text-[#9AAABD] hover:text-white"
          >
            Capabilities
          </a>
          <a
            href="#evidence-trace"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1.5 text-sm font-medium text-[#9AAABD] hover:text-white"
          >
            Evidence Model
          </a>
          <a
            href="#round3-roadmap"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-1.5 text-sm font-medium text-[#9AAABD] hover:text-white"
          >
            Round 3 Roadmap
          </a>

          <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenJudgeAccess();
              }}
              className="py-2.5 px-3 rounded-xl bg-[#111D2A] text-xs font-bold text-white flex items-center justify-center gap-1.5 border border-white/10"
            >
              <UserCheck size={14} className="text-[#00C8F0]" />
              <span>Judge Mode</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenTour();
              }}
              className="py-2.5 px-3 rounded-xl bg-[#00E6A0]/15 text-xs font-bold text-[#00E6A0] flex items-center justify-center gap-1.5 border border-[#00E6A0]/40"
            >
              <Sparkles size={14} />
              <span>Judge Tour</span>
            </button>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onEnterWorkspace();
              }}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-[#00E6A0] text-[#070B12] text-sm font-bold shadow-lg"
            >
              <span>Open Workspace</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
