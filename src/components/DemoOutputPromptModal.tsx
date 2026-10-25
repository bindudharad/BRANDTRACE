import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Dna, ArrowRight, X } from 'lucide-react';
import { useKeyContext } from '../context/KeyContext';

export const DemoOutputPromptModal: React.FC = () => {
  const {
    isDemoOutputPromptOpen,
    generateDemoOutput,
    dismissDemoOutputPrompt
  } = useKeyContext();

  if (!isDemoOutputPromptOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md rounded-3xl neo-liquid-panel p-6 sm:p-7 space-y-5 shadow-2xl border border-cyan-500/30 overflow-hidden"
        >
          {/* Ambient Glow Gradient */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent pointer-events-none" />

          {/* Close button */}
          <button
            onClick={dismissDemoOutputPrompt}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon and Title */}
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/10 border border-cyan-500/30 text-cyan-300 shadow-md shrink-0">
              <Sparkles className="w-6 h-6 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-400">
                Demo Exploration
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white font-lexend tracking-tight leading-snug mt-0.5">
                Generate a output from the given sample DNA?
              </h3>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Would you like to populate the editor with the sample Apex Cloud Systems draft and generate the live audit diagnostic report and score matrix?
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={dismissDemoOutputPrompt}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-[#02050f]/80 hover:bg-white/[0.08] border border-cyan-500/20 transition-all cursor-pointer text-center"
            >
              No, Keep Blank
            </button>

            <button
              type="button"
              onClick={generateDemoOutput}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white neo-liquid-btn-primary shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
              <span>Yes, Generate Output</span>
              <ArrowRight className="w-3.5 h-3.5 text-cyan-200" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
