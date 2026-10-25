import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Plus, Layers } from 'lucide-react';
import { useKeyContext } from '../context/KeyContext';

export const CreateProfileModal: React.FC = () => {
  const {
    isCreateProfileModalOpen,
    setIsCreateProfileModalOpen,
    createNewBrandProfile,
    setActiveTab
  } = useKeyContext();

  const [profileName, setProfileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreateProfileModalOpen) {
      setProfileName('');
      setError(null);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isCreateProfileModalOpen]);

  if (!isCreateProfileModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = profileName.trim();
    if (!trimmed) {
      setError('Please enter a profile name.');
      return;
    }

    try {
      createNewBrandProfile(trimmed);
      setIsCreateProfileModalOpen(false);
      setActiveTab('brand_dna');
    } catch (err: any) {
      setError(err?.message || 'Failed to create brand profile.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl neo-liquid-panel border border-cyan-500/30 shadow-[0_20px_70px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-cyan-500/20 bg-[#030818]/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/10 border border-cyan-500/30 text-cyan-400 shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-lexend">Create Brand DNA profile</h2>
              <p className="text-xs text-slate-400">Establish standard voice &amp; compliance rules</p>
            </div>
          </div>
          <button
            onClick={() => setIsCreateProfileModalOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Brand Profile Name
              </label>
              <input
                ref={inputRef}
                type="text"
                value={profileName}
                onChange={(e) => {
                  setProfileName(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="e.g. Acme Corp Guidelines, Nova Health..."
                className="w-full px-4 py-3 rounded-2xl neo-liquid-input text-xs text-white placeholder-slate-500 focus:outline-none"
              />
              {error && (
                <p className="text-xs text-rose-400 mt-1 font-medium">{error}</p>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Once created, you can tune tone attributes, forbidden terms, color palettes, and evaluation rules in the Brand DNA Manager.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-cyan-500/20">
              <button
                type="button"
                onClick={() => setIsCreateProfileModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/[0.08] border border-cyan-500/20 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!profileName.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white neo-liquid-btn-primary shadow-lg shadow-cyan-500/30 disabled:opacity-50 disabled:pointer-events-none cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4 text-cyan-200" />
                <span>Create Profile</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
