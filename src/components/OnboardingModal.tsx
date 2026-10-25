import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, X, Key, ArrowRight } from 'lucide-react';
import { LoomFrogIcon } from './LoomFrogLogo';
import { useKeyContext } from '../context/KeyContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { 
    setIsDemoMode, 
    setActiveTab, 
    setIsKeyModalOpen, 
    setCurrentDraftText,
    setCurrentReport,
    setIsDemoOutputPromptOpen,
    setHasCompletedOnboarding
  } = useKeyContext();

  if (!isOpen) return null;

  const handleTryDemo = () => {
    setIsDemoMode(true);
    setHasCompletedOnboarding(true);
    setActiveTab('audit');
    setCurrentDraftText('');
    setCurrentReport(null);
    onClose();
    setIsDemoOutputPromptOpen(true);
  };

  const handleGetStarted = () => {
    setIsDemoMode(false);
    setHasCompletedOnboarding(true);
    setActiveTab('audit');
    setCurrentDraftText(''); // Clean fresh draft
    onClose();
    setIsKeyModalOpen(true); // Direct prompt to set API Key
  };

  const steps = [
    {
      num: '01',
      title: 'Brand DNA',
      desc: 'Define your Brand DNA. Tell us what to keep in mind as the standard.'
    },
    {
      num: '02',
      title: 'Content',
      desc: 'Paste text or upload a visual.'
    },
    {
      num: '03',
      title: 'Audit',
      desc: 'Run the deterministic and AI-powered checks.'
    },
    {
      num: '04',
      title: 'Improve',
      desc: 'Review findings and apply suggested fixes.'
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="w-full max-w-xl neo-liquid-panel border border-cyan-500/30 rounded-3xl shadow-[0_20px_70px_rgba(0,0,0,0.9)] p-7 relative overflow-hidden text-left"
        >
          {/* Close 'X' Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.08] transition-all cursor-pointer"
            title="Close guide"
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3.5 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-md">
              <LoomFrogIcon size={28} glow={true} />
            </div>
            <div>
              <h2 className="text-xl font-bold font-lexend text-white tracking-tight">
                New to LoomFrog?
              </h2>
              <p className="text-xs text-slate-400 font-normal mt-0.5">
                Deterministic rules &amp; semantic alignment in four steps.
              </p>
            </div>
          </div>

          {/* 4 Steps (2x2 Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-6">
            {steps.map((step) => (
              <div
                key={step.num}
                className="bg-[#030818]/60 border border-cyan-500/20 hover:border-cyan-500/40 rounded-2xl p-4 transition-all group"
              >
                <div className="flex items-baseline gap-2 mb-1.5">
                  <span className="font-mono text-xs font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors">
                    {step.num}
                  </span>
                  <h3 className="text-xs font-bold text-white tracking-tight font-lexend">
                    {step.title}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed pl-5">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-5 border-t border-cyan-500/20">
            <button
              onClick={handleTryDemo}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-cyan-300 border border-cyan-500/20 text-xs font-semibold transition-all cursor-pointer"
            >
              <Play size={14} className="text-cyan-400" />
              <span>Try Demo</span>
            </button>

            <button
              onClick={handleGetStarted}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl neo-liquid-btn-primary shadow-lg shadow-cyan-500/30 text-white text-xs font-bold transition-all cursor-pointer"
            >
              <Key size={14} />
              <span>Get Started</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
