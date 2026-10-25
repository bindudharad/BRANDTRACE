import React, { useState } from 'react';
import { Shield, Lock, Eye, Server, RefreshCw, Cpu, Database, CheckCircle2, AlertTriangle, FileCode, AlertOctagon, Terminal } from 'lucide-react';
import { useKeyContext } from '../../context/KeyContext';
import { BorderGlow } from '../BorderGlow';

export const PrivacyPanel: React.FC = () => {
  const { hasApiKey, clearApiKey } = useKeyContext();
  const [activeDiagramNode, setActiveDiagramNode] = useState<'client' | 'key' | 'gemini' | 'storage'>('client');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
      {/* Top Title Banner */}
      <BorderGlow borderRadius="rounded-3xl" glowColor="cyan">
        <div className="p-6 rounded-3xl neo-liquid-panel border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/10 border border-cyan-500/30 text-cyan-400 shadow-md">
                <Shield className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white font-lexend tracking-tight">
                Privacy Bounds &amp; Security Transparency
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              LoomFrog operates on a zero-server on-device architecture. All preprocessing, Regex analysis, and Canvas color sampling execute locally in your browser. API keys are maintained exclusively in temporary application runtime memory.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2.5 rounded-2xl bg-[#030818]/80 border border-cyan-500/20 text-xs">
              <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Key Memory State</div>
              <div className="font-mono font-bold text-xs text-teal-300">
                {hasApiKey ? '1 Key in RAM' : '0 Keys (Demo Mode)'}
              </div>
            </div>

            {hasApiKey && (
              <button
                onClick={() => {
                  clearApiKey();
                  alert('In-memory API key has been immediately purged.');
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-300 hover:text-white bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer"
              >
                Purge RAM Key
              </button>
            )}
          </div>
        </div>
      </BorderGlow>

      {/* Critical Explicit Disclosures & Honest Risk Assessment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Risk Disclosure: Browser Extension Warning */}
        <div className="p-5 rounded-2xl neo-liquid-panel border border-teal-500/30 space-y-2">
          <div className="flex items-center gap-2.5 text-teal-300 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-teal-400 flex-shrink-0" />
            <span>Browser Environment Integrity</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Because LoomFrog executes on your device with no intermediary server, it cannot protect your API key or content if your browser itself is compromised (e.g. by malicious extensions with broad DOM-reading permissions). Always run audits in a trusted, isolated browser profile.
          </p>
        </div>

        {/* Sensitive Content Direct-to-Gemini Notice */}
        <div className="p-5 rounded-2xl neo-liquid-panel border border-cyan-500/30 space-y-2">
          <div className="flex items-center gap-2.5 text-cyan-300 font-bold text-xs uppercase tracking-wider">
            <Server className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>Direct-to-Google Gemini Transmission</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            When you run an audit, draft text and visual assets are dispatched directly from your browser to Google Gemini API endpoints using your personal API key. Do not upload strictly confidential or unreleased trade secrets without reviewing Google API data terms.
          </p>
        </div>
      </div>

      {/* Interactive Client-Side Execution Architecture Diagram */}
      <div className="p-6 rounded-3xl neo-liquid-panel border border-cyan-500/20 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-lexend">
              Interactive Execution &amp; Trust Boundaries
            </h2>
            <p className="text-xs text-slate-400 mt-1">Click any component to inspect data flow and isolation guarantees.</p>
          </div>
          <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
            100% Zero-Server
          </span>
        </div>

        {/* Diagram Visual Nodes */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
          {/* Node 1: Browser Runtime & Regex Engine */}
          <div
            onClick={() => setActiveDiagramNode('client')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeDiagramNode === 'client'
                ? 'bg-[#030818] border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/50'
                : 'bg-[#030818]/60 border-cyan-500/20 hover:border-cyan-500/40 hover:bg-[#030818]/80'
            }`}
          >
            <div className="flex items-center gap-2 mb-2 text-cyan-400">
              <Cpu className="w-4 h-4" />
              <span className="font-bold text-xs text-white">Browser Engine</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Local regex scanning, HTML5 Canvas pixel extraction, and Delta-E computations.
            </p>
          </div>

          {/* Node 2: BYOK Memory State */}
          <div
            onClick={() => setActiveDiagramNode('key')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeDiagramNode === 'key'
                ? 'bg-[#030818] border-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.25)] ring-1 ring-teal-400/50'
                : 'bg-[#030818]/60 border-cyan-500/20 hover:border-cyan-500/40 hover:bg-[#030818]/80'
            }`}
          >
            <div className="flex items-center gap-2 mb-2 text-teal-400">
              <Lock className="w-4 h-4" />
              <span className="font-bold text-xs text-white">In-Memory Key State</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Key held in React state RAM. Never saved to cookies or disk. Purged on tab close.
            </p>
          </div>

          {/* Node 3: Direct Gemini API Calls */}
          <div
            onClick={() => setActiveDiagramNode('gemini')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeDiagramNode === 'gemini'
                ? 'bg-[#030818] border-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.25)] ring-1 ring-blue-400/50'
                : 'bg-[#030818]/60 border-cyan-500/20 hover:border-cyan-500/40 hover:bg-[#030818]/80'
            }`}
          >
            <div className="flex items-center gap-2 mb-2 text-blue-400">
              <Server className="w-4 h-4" />
              <span className="font-bold text-xs text-white">Direct Gemini API</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Direct HTTPS fetch from browser to <code className="text-[10px] text-cyan-300 font-mono">generativelanguage.googleapis.com</code>.
            </p>
          </div>

          {/* Node 4: On-Device Profile Storage */}
          <div
            onClick={() => setActiveDiagramNode('storage')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              activeDiagramNode === 'storage'
                ? 'bg-[#030818] border-indigo-400 shadow-[0_0_20px_rgba(129,140,248,0.25)] ring-1 ring-indigo-400/50'
                : 'bg-[#030818]/60 border-cyan-500/20 hover:border-cyan-500/40 hover:bg-[#030818]/80'
            }`}
          >
            <div className="flex items-center gap-2 mb-2 text-indigo-400">
              <Database className="w-4 h-4" />
              <span className="font-bold text-xs text-white">Local Brand Storage</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Brand DNA profiles and audit logs stored on your device only (<code className="text-[10px] text-cyan-300 font-mono">localStorage</code>).
            </p>
          </div>
        </div>

        {/* Dynamic Detail Card */}
        <div className="p-4 rounded-2xl bg-[#030818]/80 border border-cyan-500/20 text-xs space-y-1.5">
          {activeDiagramNode === 'client' && (
            <div>
              <h4 className="font-bold text-cyan-300 mb-1 text-xs uppercase tracking-wider">Client-Side Isolation Verification</h4>
              <p className="text-slate-300 leading-relaxed">
                When you paste text, drop a document (.docx, .txt, .md), spreadsheet (.xlsx, .csv), or visual asset (.png, .jpg, .webp), all tokenization, regex matching, and canvas color extractions occur directly inside your browser’s JavaScript thread. No draft data passes through any middleman or third-party tracking servers.
              </p>
            </div>
          )}

          {activeDiagramNode === 'key' && (
            <div>
              <h4 className="font-bold text-teal-300 mb-1 text-xs uppercase tracking-wider">Strict Memory-Only Key Isolation (Zero Disk Persistence)</h4>
              <p className="text-slate-300 leading-relaxed">
                LoomFrog adheres to a strict zero-persistence rule for API credentials. Your Gemini API key is retained strictly in volatile browser RAM (<code className="text-cyan-300 font-mono">useState</code>). It is never saved to <code className="text-cyan-300 font-mono">localStorage</code>, <code className="text-cyan-300 font-mono">sessionStorage</code>, <code className="text-cyan-300 font-mono">IndexedDB</code>, or <code className="text-cyan-300 font-mono">cookies</code>. Refreshing the browser or closing the tab destroys the key immediately.
              </p>
            </div>
          )}

          {activeDiagramNode === 'gemini' && (
            <div>
              <h4 className="font-bold text-blue-300 mb-1 text-xs uppercase tracking-wider">Direct Google Gemini HTTPS Protocol</h4>
              <p className="text-slate-300 leading-relaxed">
                During an explicit audit action, requests are dispatched straight from your browser to Google’s official Gemini REST endpoints. Payloads are encapsulated inside structural <code className="text-cyan-300 font-mono">&lt;untrusted_user_draft&gt;</code> XML tags with prompt-injection defense directives and structured JSON schema enforcement.
              </p>
            </div>
          )}

          {activeDiagramNode === 'storage' && (
            <div>
              <h4 className="font-bold text-indigo-300 mb-1 text-xs uppercase tracking-wider">On-Device Brand Profile &amp; History Persistence</h4>
              <p className="text-slate-300 leading-relaxed">
                Unlike API keys (which are strictly temporary in-memory), Brand DNA profiles, rule configurations, and past audit reports are saved to your browser&rsquo;s on-device <code className="text-cyan-300 font-mono">localStorage</code>. This ensures your brand definitions survive page refreshes while remaining 100% private to your machine. You can export or import these profiles at any time via JSON.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Security Threat Model & Defense Table */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-lexend">
          Plain-Terms Privacy &amp; Security Specification Table
        </h2>

        <div className="overflow-x-auto rounded-3xl border border-cyan-500/20 neo-liquid-panel">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-cyan-500/20 bg-[#030818]/80 text-slate-300">
                <th className="px-5 py-3.5 font-mono font-bold text-xs uppercase tracking-wider">Privacy Domain</th>
                <th className="px-5 py-3.5 font-mono font-bold text-xs uppercase tracking-wider">What is Processed &amp; Where</th>
                <th className="px-5 py-3.5 font-mono font-bold text-xs uppercase tracking-wider">Implementation Guarantee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/10 text-slate-300">
              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3.5 font-semibold text-white flex items-center gap-2.5">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span>Local Preprocessing</span>
                </td>
                <td className="px-5 py-3.5 text-slate-300">
                  100% client-side. Regex forbidden word scans, Canvas color sampling, and deltaE calculations execute in local browser memory.
                </td>
                <td className="px-5 py-3.5 font-mono text-teal-300 text-[11px] font-bold">
                  Zero Server Intermediaries
                </td>
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3.5 font-semibold text-white flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-teal-400" />
                  <span>API Key Handling</span>
                </td>
                <td className="px-5 py-3.5 text-slate-300">
                  Keys live only in browser temporary memory for that session. Never written to localStorage, cookies, or disk. Wiped upon tab close or reload.
                </td>
                <td className="px-5 py-3.5 font-mono text-teal-300 text-[11px] font-bold">
                  Temporary RAM Only
                </td>
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3.5 font-semibold text-white flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-indigo-400" />
                  <span>Profile &amp; History Storage</span>
                </td>
                <td className="px-5 py-3.5 text-slate-300">
                  Brand DNA profiles and audit logs are saved locally in browser localStorage so work isn't lost on refresh. Export/import available as JSON.
                </td>
                <td className="px-5 py-3.5 font-mono text-teal-300 text-[11px] font-bold">
                  On-Device LocalStorage
                </td>
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3.5 font-semibold text-white flex items-center gap-2.5">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span>Remote Network Traffic</span>
                </td>
                <td className="px-5 py-3.5 text-slate-300">
                  Nothing is ever sent to any server except Google's Gemini API, and only when you actively trigger an audit. No tracking or telemetry scripts.
                </td>
                <td className="px-5 py-3.5 font-mono text-teal-300 text-[11px] font-bold">
                  0 Analytics &amp; 0 Trackers
                </td>
              </tr>

              <tr className="hover:bg-white/[0.02] transition-colors">
                <td className="px-5 py-3.5 font-semibold text-white flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-teal-400" />
                  <span>Untrusted Input &amp; Output</span>
                </td>
                <td className="px-5 py-3.5 text-slate-300">
                  Pasted text and files are treated as untrusted data wrapped in safe XML tags to prevent prompt injection. All AI outputs are sanitized before DOM rendering.
                </td>
                <td className="px-5 py-3.5 font-mono text-teal-300 text-[11px] font-bold">
                  Prompt-Defended &amp; Sanitized
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

