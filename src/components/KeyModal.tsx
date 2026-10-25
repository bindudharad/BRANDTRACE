import React, { useState } from 'react';
import { Key, Shield, CheckCircle2, X, Eye, EyeOff, Sparkles, ExternalLink } from 'lucide-react';
import { useKeyContext } from '../context/KeyContext';
import { AVAILABLE_MODELS } from '../services/geminiSemanticEngine';

export const KeyModal: React.FC = () => {
  const {
    apiKey,
    setApiKey,
    clearApiKey,
    hasApiKey,
    isKeyModalOpen,
    setIsKeyModalOpen,
    isDemoMode,
    setIsDemoMode,
    setIsApiKeySuccessModalOpen,
    selectedModel,
    setSelectedModel
  } = useKeyContext();

  const [inputKey, setInputKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [isSavedFlash, setIsSavedFlash] = useState(false);

  if (!isKeyModalOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim()) {
      setApiKey(inputKey.trim());
      setIsDemoMode(false); // Switch to live mode when key is provided
      setIsSavedFlash(true);
      setTimeout(() => {
        setIsSavedFlash(false);
        setIsKeyModalOpen(false);
        setIsApiKeySuccessModalOpen(true);
      }, 500);
    }
  };

  const handleClear = () => {
    setInputKey('');
    clearApiKey();
    setIsDemoMode(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl neo-liquid-panel border border-cyan-500/30 shadow-[0_20px_70px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between p-5 border-b border-cyan-500/20 bg-[#030818]/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/10 border border-cyan-500/30 text-cyan-400 shadow-md">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-lexend">API Key Settings &amp; Security</h2>
              <p className="text-xs text-slate-400">100% In-Memory Client-Side Security</p>
            </div>
          </div>
          <button
            onClick={() => setIsKeyModalOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Disclosures Alert Box */}
        <div className="p-6 space-y-5">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-950/40 to-cyan-950/30 border border-teal-500/30 text-xs space-y-2">
            <div className="flex items-center gap-2 text-teal-300 font-bold uppercase tracking-wider text-[11px] font-mono">
              <Shield className="w-4 h-4 text-teal-400" />
              <span>Hard Security Boundary: 100% In-Memory Only</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Your Google Gemini API key is maintained <strong className="text-white">strictly in browser runtime memory</strong> (React state). It is never written to disk, <code className="bg-black/40 px-1.5 py-0.5 rounded text-cyan-300 font-mono">localStorage</code>, or cookies. Closing or reloading this tab purges the key immediately.
            </p>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* API Key Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Gemini API Key</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono text-[11px]"
                >
                  Get key from Google AI Studio <ExternalLink className="w-3 h-3" />
                </a>
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-4 py-3 rounded-2xl neo-liquid-input text-xs text-white placeholder-slate-500 font-mono pr-16 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-cyan-400" />}
                </button>
              </div>
            </div>

            {/* Model Architecture Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Target Evaluation Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl neo-liquid-input text-xs text-white cursor-pointer focus:outline-none"
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#030818] text-white">
                    {m.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1.5">
                LoomFrog enforces structured JSON schemas with Gemini&apos;s native <code className="text-cyan-300">responseSchema</code>.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-cyan-500/20">
              {hasApiKey ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                >
                  Clear Memory Key
                </button>
              ) : (
                <span className="text-xs text-slate-500">No key in memory</span>
              )}

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsDemoMode(true);
                    setIsKeyModalOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/[0.08] border border-cyan-500/20 transition-all cursor-pointer"
                >
                  Use Demo Mode
                </button>
                <button
                  type="submit"
                  disabled={!inputKey.trim()}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-lg shadow-cyan-500/30 ${
                    isSavedFlash
                      ? 'bg-teal-600'
                      : 'neo-liquid-btn-primary disabled:opacity-50 disabled:pointer-events-none'
                  }`}
                >
                  {isSavedFlash ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Saved in Memory
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-cyan-200" />
                      Save Key in Memory
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
