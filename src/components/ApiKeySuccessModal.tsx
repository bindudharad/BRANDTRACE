import React from 'react';
import { Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { useKeyContext } from '../context/KeyContext';
import { LoomFrogIcon } from './LoomFrogLogo';

export const ApiKeySuccessModal: React.FC = () => {
  const {
    isApiKeySuccessModalOpen,
    setIsApiKeySuccessModalOpen,
    setActiveTab,
    setIsCreateProfileModalOpen
  } = useKeyContext();

  if (!isApiKeySuccessModalOpen) return null;

  const handleDefineBrand = () => {
    setIsApiKeySuccessModalOpen(false);
    setActiveTab('brand_dna');
    setIsCreateProfileModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl neo-liquid-panel shadow-[0_20px_70px_rgba(0,0,0,0.9)] overflow-hidden text-center p-7 space-y-6">
        {/* Glowing Icon Header */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-teal-500/30 to-cyan-500/20 border border-teal-500/40 flex items-center justify-center shadow-[0_0_30px_rgba(45,212,191,0.3)]">
              <LoomFrogIcon size={34} glow={true} />
            </div>
            <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-teal-500 text-black shadow-[0_0_10px_rgba(45,212,191,0.8)]">
              <ShieldCheck className="w-4 h-4 text-[#02050f] stroke-[2.5]" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-950/60 text-teal-300 border border-teal-500/30 text-xs font-semibold font-mono">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            API Key Verified &amp; Synced
          </div>

          <h2 className="text-xl font-bold text-white font-lexend leading-snug">
            Great! Your API Key is successfully synced.
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed">
            Let's set up the Brand standards right now.
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleDefineBrand}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-white neo-liquid-btn-primary shadow-[0_0_25px_rgba(6,182,212,0.4)] cursor-pointer active:scale-95 transition-all"
          >
            <span>Define my Brand</span>
            <ArrowRight className="w-4 h-4 text-cyan-200" />
          </button>
        </div>
      </div>
    </div>
  );
};
