import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  Shield,
  FileText,
  Search,
  CheckCircle,
  ChevronDown,
  Zap,
  Eye,
  BarChart2,
  Sparkles,
  Layers,
  ArrowUpRight,
  Check,
  Scale,
} from 'lucide-react';
import { EvidencePrism } from '../EvidencePrism';

interface BrandtraceHeroProps {
  onEnterWorkspace: () => void;
}

interface StoryStep {
  step: string;
  label: string;
  icon: React.FC<{ size?: number; color?: string; className?: string }>;
  color: string;
  title: string;
  desc: string;
  pill: string;
  previewCode: {
    stage: string;
    target: string;
    evidence: string;
    verdict: string;
    audit: string;
  };
}

const STORY_STEPS: StoryStep[] = [
  {
    step: '01',
    label: 'THE DRAFT',
    icon: FileText,
    color: '#67e8f9',
    title: 'Content arrives for governance review',
    desc: 'Marketing copy, announcements, or documentation are submitted across distributed teams and AI tools before publication.',
    pill: 'IN_REVIEW',
    previewCode: {
      stage: 'INGESTION',
      target: '"Brandtrace is the best cheap platform on the market today."',
      evidence: 'Awaiting deterministic rule-matching & claim-ledger traversal...',
      verdict: 'STATUS: PENDING_ANALYSIS',
      audit: 'EVENT: DRAFT_VERSION_01_RECORDED',
    },
  },
  {
    step: '02',
    label: 'THE RULE',
    icon: Shield,
    color: '#2dd4bf',
    title: 'Brand constitution evaluates deterministically',
    desc: 'Active policies match exact prohibited phrases, required disclaimers, and forbidden terms without reliance on external AI.',
    pill: 'RULE_EVALUATION',
    previewCode: {
      stage: 'DETERMINISTIC_RULES',
      target: 'MATCH: prohibited_phrase -> "cheap" & superlative -> "best"',
      evidence: 'Rule R-VOICE-02 ("Value Framing") & R-VOICE-01 ("Superlatives")',
      verdict: 'SEVERITY: HIGH (Blocking Approval Gate)',
      audit: 'RULE_VERSION: v1.0 [APPROVED]',
    },
  },
  {
    step: '03',
    label: 'THE EVIDENCE',
    icon: Search,
    color: '#a7f3d0',
    title: 'Claims resolve against approved ledger',
    desc: 'Factual assertions are mapped to verified sources. Expired or unverified citations are explicitly tagged OUTDATED or UNSUPPORTED.',
    pill: 'EVIDENCE_RESOLUTION',
    previewCode: {
      stage: 'CLAIM_LEDGER',
      target: 'CLAIM: "Always available with zero risk"',
      evidence: 'No verified source found in approved claim ledger',
      verdict: 'STATUS: UNSUPPORTED_BY_APPROVED_EVIDENCE',
      audit: 'SOURCE_VALIDATION: UNVERIFIED_PROMOTIONAL_ASSERTION',
    },
  },
  {
    step: '04',
    label: 'THE FINDING',
    icon: Eye,
    color: '#fbbf24',
    title: 'Explorable findings with full provenance',
    desc: 'Each finding anchors to the exact affected passage, citation ID, rule version, and explanation — with no hallucinated references.',
    pill: 'FINDINGS_WORKSPACE',
    previewCode: {
      stage: 'STRUCTURED_FINDING',
      target: 'PASSAGE: "the best cheap platform"',
      evidence: 'Source: Brand Voice Standards 2026 (ID: rule_voice_02, v1.0)',
      verdict: 'EXPLANATION: "Cheap undermines quality positioning; use cost-effective."',
      audit: 'CONFIDENCE: 1.0 (DETERMINISTIC)',
    },
  },
  {
    step: '05',
    label: 'THE CORRECTION',
    icon: Zap,
    color: '#34d399',
    title: 'Minimal edits preserve creator intent',
    desc: 'Compare original versus proposed wording side by side. Reviewers accept, customize, or dismiss with a required reason.',
    pill: 'INTENT_CORRECTION',
    previewCode: {
      stage: 'DIFF_RESOLVER',
      target: 'PROPOSED: "a premier, cost-effective governance platform"',
      evidence: 'Replacement maintains original marketing intent with approved vocabulary',
      verdict: 'ACTION: ACCEPT_EDIT (Draft revision 2 created)',
      audit: 'EVENT: VERSION_INCREMENTED (v1 -> v2)',
    },
  },
  {
    step: '06',
    label: 'THE DECISION',
    icon: CheckCircle,
    color: '#4ade80',
    title: 'Human governance approval gate',
    desc: 'Brand managers sign off with immutable audit trails. The server rejects approval attempts (HTTP 409) if high-risk issues remain open.',
    pill: 'HUMAN_APPROVAL',
    previewCode: {
      stage: 'APPROVAL_GATE',
      target: 'SIGN-OFF: Brand Manager (role: brand_admin)',
      evidence: 'All HIGH & CRITICAL findings resolved or waived with recorded reason',
      verdict: 'STATE: APPROVED (Publication Ready)',
      audit: 'AUDIT_LEDGER: PERMANENT_DECISION_HASH_RECORDED',
    },
  },
  {
    step: '07',
    label: 'THE INSIGHT',
    icon: BarChart2,
    color: '#818cf8',
    title: 'Governance intelligence improves guidelines',
    desc: 'Track recurring violations, frequently dismissed rules, and expired-source impact maps to systematically evolve brand standards.',
    pill: 'GOVERNANCE_INTELLIGENCE',
    previewCode: {
      stage: 'IMPACT_MAP & INSIGHTS',
      target: 'RECURRING: "Superlative claims" flagged in 38% of campaigns',
      evidence: 'Impact Map tracks 3 drafts affected by retired Q3 benchmark',
      verdict: 'RECOMMENDATION: Clarify Rule R-VOICE-01 with marketing team',
      audit: 'HEALTH_SCORE_AGGREGATE: 94.2/100',
    },
  },
];

const LEGEND = [
  { color: '#2dd4bf', label: 'Verified Source (Teal)' },
  { color: '#fbbf24', label: 'Needs Review (Amber)' },
  { color: '#f87171', label: 'Contradicted Rule (Red)' },
  { color: '#4ade80', label: 'Approved Decision (Green)' },
  { color: '#67e8f9', label: 'Evidence Link (Cyan)' },
];

export const BrandtraceHero: React.FC<BrandtraceHeroProps> = ({ onEnterWorkspace }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-advance workflow demonstration
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % STORY_STEPS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const currentStep = STORY_STEPS[activeStep];

  return (
    <div
      ref={containerRef}
      style={{
        background: '#04080f',
        minHeight: '100vh',
        color: '#e8f0f8',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        overflowX: 'hidden',
      }}
    >
      {/* 1. Global Notice Strip (Demo Mode) */}
      <header
        style={{
          background: 'rgba(6, 24, 38, 0.85)',
          borderBottom: '1px solid #1a3045',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#8da4bc',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'blur(16px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              background: '#0d9488',
              color: '#ccfbf1',
              padding: '3px 10px',
              borderRadius: 5,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.08em',
            }}
          >
            DEMO MODE
          </span>
          <span style={{ color: '#8da4bc' }}>
            Local execution with zero cloud lock-in. Sample data is fictional.
          </span>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span
            style={{
              color: '#2dd4bf',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#2dd4bf',
                boxShadow: '0 0 10px #2dd4bf',
              }}
            />
            FastAPI 0.115 Connected
          </span>
          <button
            onClick={onEnterWorkspace}
            className="btn-secondary btn-sm"
            style={{
              fontSize: 12,
              padding: '6px 14px',
              minHeight: 32,
              borderColor: '#1a3045',
            }}
          >
            Skip to Workspace →
          </button>
        </div>
      </header>

      {/* 2. Hero Section: Cinematic 3D Presentation */}
      <section
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '60px 40px 40px',
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          gap: 48,
          alignItems: 'center',
          minHeight: 'calc(100vh - 52px)',
        }}
        className="hero-grid"
      >
        {/* Left Column: Brand, Value Proposition & Actions */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Brand Identity Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <div
              style={{
                width: 48,
                height: 48,
                background: 'linear-gradient(135deg, #0d9488, #2dd4bf)',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                color: '#ffffff',
                boxShadow: '0 0 24px rgba(45, 212, 191, 0.35)',
              }}
            >
              ◈
            </div>
            <div>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 20,
                  letterSpacing: '0.12em',
                  color: '#e8f0f8',
                  lineHeight: 1.1,
                }}
              >
                BRANDTRACE
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: '#2dd4bf',
                  letterSpacing: '0.08em',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                EVIDENCE-LINKED BRAND GOVERNANCE
              </div>
            </div>
          </div>

          {/* Main Headline */}
          <h1
            style={{
              fontSize: 'clamp(38px, 4.6vw, 62px)',
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: '-0.035em',
              margin: '0 0 24px',
              color: '#f0f8ff',
            }}
          >
            Every finding <br />
            <span style={{ color: '#2dd4bf' }}>has a source.</span> <br />
            Every decision <br />
            <span
              style={{
                background: 'linear-gradient(90deg, #67e8f9 0%, #a7f3d0 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              has an owner.
            </span>
          </h1>

          <p
            style={{
              fontSize: 18,
              color: '#8da4bc',
              lineHeight: 1.65,
              margin: '0 0 36px',
              maxWidth: 540,
            }}
          >
            Review content before publication against approved guidelines, verified facts, and brand assets.
            Eliminate hallucinated citations, enforce deterministic rules, and manage human approval with immutable audit history.
          </p>

          {/* Primary Action Hierarchy (Buttons >= 48px) */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 44 }}>
            <button
              className="btn-primary"
              onClick={onEnterWorkspace}
              style={{
                fontSize: 15,
                padding: '14px 32px',
                minHeight: 52,
                borderRadius: 12,
              }}
            >
              Enter the Workspace <ArrowRight size={18} />
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                const el = document.getElementById('story-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{
                fontSize: 15,
                padding: '14px 28px',
                minHeight: 52,
                borderRadius: 12,
              }}
            >
              <Sparkles size={16} /> Explore the Experience
            </button>
          </div>

          {/* Operational Metrics Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 20,
              paddingTop: 28,
              borderTop: '1px solid #1a3045',
              maxWidth: 520,
            }}
          >
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#2dd4bf', letterSpacing: '-0.03em' }}>
                65
              </div>
              <div style={{ fontSize: 12, color: '#5a7a96', marginTop: 2, fontWeight: 500 }}>
                Tests Passing (1 Skipped)
              </div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#67e8f9', letterSpacing: '-0.03em' }}>
                27/27
              </div>
              <div style={{ fontSize: 12, color: '#5a7a96', marginTop: 2, fontWeight: 500 }}>
                Smoke Assertions
              </div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#a7f3d0', letterSpacing: '-0.03em' }}>
                0
              </div>
              <div style={{ fontSize: 12, color: '#5a7a96', marginTop: 2, fontWeight: 500 }}>
                API Keys for Local Demo
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Original 3D Evidence Prism */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          style={{ position: 'relative', width: '100%' }}
        >
          {/* Glow backdrop */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at center, rgba(45, 212, 191, 0.12) 0%, transparent 70%)',
              filter: 'blur(40px)',
              pointerEvents: 'none',
            }}
          />

          <EvidencePrism height={520} />

          {/* Spatial Legend Overlay */}
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              background: 'rgba(6, 13, 22, 0.88)',
              backdropFilter: 'blur(16px)',
              border: '1px solid #1a3045',
              borderRadius: 12,
              padding: '12px 16px',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: '#5a7a96',
                fontWeight: 800,
                letterSpacing: '0.08em',
                marginBottom: 8,
                textTransform: 'uppercase',
              }}
            >
              Evidence Prism Visual Legend
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {LEGEND.map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: color,
                      boxShadow: `0 0 8px ${color}`,
                      display: 'inline-block',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#cbd5e1' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Orbit Stage Indicator */}
          <div
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'rgba(6, 13, 22, 0.88)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(45, 212, 191, 0.3)',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 12,
              color: '#2dd4bf',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#2dd4bf',
                display: 'inline-block',
                boxShadow: '0 0 8px #2dd4bf',
              }}
            />
            {currentStep.label} ACTIVE
          </div>
        </motion.div>
      </section>

      {/* Scroll Down Prompt */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
          padding: '20px 0 40px',
          color: '#5a7a96',
          fontSize: 13,
          cursor: 'pointer',
        }}
        onClick={() => document.getElementById('story-section')?.scrollIntoView({ behavior: 'smooth' })}
      >
        <ChevronDown size={18} />
        <span>Scroll to inspect the 7-stage governance narrative</span>
      </div>

      {/* 3. Interactive Scroll Storytelling Section */}
      <section
        id="story-section"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '80px 40px 100px',
        }}
      >
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="section-eyebrow">Interactive Governance Architecture</div>
          <h2
            style={{
              fontSize: 'clamp(30px, 3.8vw, 48px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#e8f0f8',
              margin: '8px 0 16px',
            }}
          >
            From Draft to Decision — Traceable at Every Step
          </h2>
          <p style={{ fontSize: 17, color: '#8da4bc', maxWidth: 640, margin: '0 auto', lineHeight: 1.6 }}>
            Step through how submitted content connects to constitution rules, verifies against approved facts,
            and secures human approval with immutable audit history.
          </p>
        </div>

        {/* Step Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: 44,
          }}
        >
          {STORY_STEPS.map((s, i) => {
            const isActive = activeStep === i;
            return (
              <button
                key={s.step}
                onClick={() => {
                  setActiveStep(i);
                  setIsAutoPlaying(false);
                }}
                style={{
                  background: isActive ? '#0a2233' : 'rgba(13, 26, 42, 0.6)',
                  border: `1px solid ${isActive ? s.color : '#1a3045'}`,
                  color: isActive ? s.color : '#8da4bc',
                  padding: '10px 18px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  transition: 'all 200ms ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: isActive ? s.color : 'transparent',
                    border: `1px solid ${s.color}`,
                  }}
                />
                {s.step}. {s.label}
              </button>
            );
          })}
        </div>

        {/* Story Step Card with Animated Transitions */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="card-premium"
            style={{
              padding: '40px',
              display: 'grid',
              gridTemplateColumns: '1.1fr 0.9fr',
              gap: 48,
              alignItems: 'center',
              borderColor: `${currentStep.color}35`,
              boxShadow: `0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px ${currentStep.color}15`,
            }}
          >
            {/* Step Content */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: `${currentStep.color}18`,
                    border: `1px solid ${currentStep.color}50`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <currentStep.icon size={24} color={currentStep.color} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: '0.12em',
                      color: currentStep.color,
                      textTransform: 'uppercase',
                    }}
                  >
                    STAGE {currentStep.step} OF 07
                  </div>
                  <div style={{ fontSize: 14, color: '#8da4bc', fontWeight: 600 }}>
                    {currentStep.label}
                  </div>
                </div>
              </div>

              <h3
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: '#f0f8ff',
                  letterSpacing: '-0.02em',
                  margin: '0 0 16px',
                }}
              >
                {currentStep.title}
              </h3>

              <p
                style={{
                  color: '#8da4bc',
                  fontSize: 16,
                  lineHeight: 1.7,
                  margin: '0 0 28px',
                }}
              >
                {currentStep.desc}
              </p>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <span
                  style={{
                    background: `${currentStep.color}18`,
                    color: currentStep.color,
                    border: `1px solid ${currentStep.color}40`,
                    padding: '4px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                  }}
                >
                  {currentStep.pill}
                </span>
                <span style={{ fontSize: 13, color: '#5a7a96' }}>
                  Auto-validated on the server
                </span>
              </div>
            </div>

            {/* Evidence & Provenance Inspector Box */}
            <div
              style={{
                background: '#060d16',
                border: '1px solid #1a3045',
                borderRadius: 12,
                padding: '24px',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: 13,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #1a3045',
                  paddingBottom: 12,
                  marginBottom: 16,
                }}
              >
                <span style={{ color: '#5a7a96', fontSize: 11, fontWeight: 700 }}>
                  EVIDENCE TELEMETRY
                </span>
                <span style={{ color: currentStep.color, fontSize: 11, fontWeight: 700 }}>
                  STAGE::{currentStep.previewCode.stage}
                </span>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <div style={{ color: '#5a7a96', fontSize: 11, marginBottom: 4 }}>TARGET EXCERPT:</div>
                  <div style={{ color: '#cbd5e1', background: '#0a1726', padding: '8px 12px', borderRadius: 6 }}>
                    {currentStep.previewCode.target}
                  </div>
                </div>

                <div>
                  <div style={{ color: '#5a7a96', fontSize: 11, marginBottom: 4 }}>EVIDENCE RESOLUTION:</div>
                  <div style={{ color: currentStep.color, background: '#0a1726', padding: '8px 12px', borderRadius: 6 }}>
                    {currentStep.previewCode.evidence}
                  </div>
                </div>

                <div>
                  <div style={{ color: '#5a7a96', fontSize: 11, marginBottom: 4 }}>VERDICT / GATE:</div>
                  <div style={{ color: '#f8fafc', background: '#0a1726', padding: '8px 12px', borderRadius: 6, fontWeight: 600 }}>
                    {currentStep.previewCode.verdict}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #1a3045', paddingTop: 10, marginTop: 4 }}>
                  <div style={{ color: '#34d399', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Check size={14} /> {currentStep.previewCode.audit}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Step Navigation Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 32 }}>
          <button
            className="btn-secondary btn-sm"
            onClick={() => {
              setActiveStep((prev) => (prev - 1 + STORY_STEPS.length) % STORY_STEPS.length);
              setIsAutoPlaying(false);
            }}
          >
            ← Previous Stage
          </button>
          <button
            className="btn-secondary btn-sm"
            onClick={() => {
              setActiveStep((prev) => (prev + 1) % STORY_STEPS.length);
              setIsAutoPlaying(false);
            }}
          >
            Next Stage →
          </button>
          <button
            className="btn-secondary btn-sm"
            onClick={() => setIsAutoPlaying((p) => !p)}
            style={{ color: isAutoPlaying ? '#2dd4bf' : '#8da4bc' }}
          >
            {isAutoPlaying ? 'Pause Auto-Play' : 'Resume Auto-Play'}
          </button>
        </div>
      </section>

      {/* 4. Pre-Launch Workspace Call To Action */}
      <section
        style={{
          background: 'linear-gradient(180deg, #04080f 0%, #081a2e 50%, #04080f 100%)',
          borderTop: '1px solid #1a3045',
          padding: '90px 40px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div
            style={{
              width: 56,
              height: 56,
              margin: '0 auto 20px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, #0f766e, #2dd4bf)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              boxShadow: '0 0 30px rgba(45, 212, 191, 0.4)',
            }}
          >
            ◈
          </div>
          <h2
            style={{
              fontSize: 'clamp(28px, 3.6vw, 42px)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: '#f0f8ff',
              margin: '0 0 16px',
            }}
          >
            Experience Local Brand Governance
          </h2>
          <p
            style={{
              color: '#8da4bc',
              fontSize: 17,
              lineHeight: 1.65,
              margin: '0 0 36px',
            }}
          >
            The workspace is seeded with active rules, approved claims, and an intentional test draft.
            Resolve violations, inspect the immutable audit history, and approve as Brand Manager.
          </p>
          <button
            className="btn-primary"
            onClick={onEnterWorkspace}
            style={{
              fontSize: 16,
              padding: '16px 44px',
              minHeight: 56,
              borderRadius: 12,
            }}
          >
            Launch the Governance Workspace <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Responsive adjustments */}
      <style>{`
        @media (max-width: 960px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            padding-top: 40px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default BrandtraceHero;
