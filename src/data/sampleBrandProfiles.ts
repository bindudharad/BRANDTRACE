import { BrandDNAProfile, AuditReport } from '../types/brandDna';

export const DEFAULT_BRAND_PROFILES: BrandDNAProfile[] = [
  {
    metadata: {
      brandName: 'Apex Cloud Systems',
      brandVersion: '2.4.0',
      schemaVersion: '1.0',
      updatedAt: '2026-08-28T14:30:00Z',
      description: 'Enterprise B2B infrastructure platform. Tone is authoritative, concise, and engineering-precise.'
    },
    lifecycleState: 'ACTIVE',
    voice: {
      primaryTone: 'Authoritative, precise, pragmatic and empowering',
      formalityScore: 0.85,
      toneAttributes: ['Engineering-grade clarity', 'Objective metrics', 'No marketing fluff', 'Empowering technical leaders']
    },
    vocabulary: {
      forbidden: [
        { term: 'supercharge', reason: 'Banned SaaS cliché. Use "accelerate", "optimize", or specific performance metrics.' },
        { term: 'magic', reason: 'Unverifiable hyperbole. Detail technical mechanisms instead.' },
        { term: 'game changer', reason: 'Trite promotional jargon. Explain architectural impact.' },
        { term: 'cheap', reason: 'Diminishes enterprise value perception. Use "cost-efficient" or "ROI-positive".' },
        { term: 'easy-peasy', reason: 'Undermines professional technical gravity.' },
        { term: 'synergy', reason: 'Vague corporate buzzword. Name the concrete cross-system integration.' }
      ],
      preferred: [
        'Deterministic reliability',
        'Sub-millisecond latency',
        'Architectural resilience',
        'Cost-efficient scale',
        'Verifiable SLA'
      ]
    },
    colors: {
      primaryHex: ['#0F172A', '#2563EB', '#38BDF8'],
      secondaryHex: ['#F8FAFC', '#64748B', '#059669'],
      strictCompliance: true
    },
    rules: [
      {
        ruleId: 'R-VOCAB-01',
        category: 'Text',
        description: 'Zero tolerance for banned marketing buzzwords (e.g. supercharge, magic, synergy).',
        weight: 3.0,
        evaluatorType: 'Deterministic'
      },
      {
        ruleId: 'R-TONE-01',
        category: 'Text',
        description: 'Maintain high formality (>=0.80) with authoritative engineering-centric framing.',
        weight: 2.5,
        evaluatorType: 'Semantic'
      },
      {
        ruleId: 'R-PRECISION-02',
        category: 'Text',
        description: 'Avoid ungrounded superlatives; substantiate claims with concrete figures or benchmark qualifiers.',
        weight: 2.0,
        evaluatorType: 'Semantic'
      },
      {
        ruleId: 'R-COLOR-01',
        category: 'Visual',
        description: 'Visual assets must conform to Apex Navy (#0F172A), Cobalt (#2563EB), and Cyan (#38BDF8) with ΔE < 15.',
        weight: 2.0,
        evaluatorType: 'Deterministic'
      },
      {
        ruleId: 'R-CLARITY-03',
        category: 'Global',
        description: 'Concise syntax with active voice and straightforward technical explanations.',
        weight: 1.5,
        evaluatorType: 'Semantic'
      }
    ]
  },
  {
    metadata: {
      brandName: 'Aura Artisan Living',
      brandVersion: '1.2.0',
      schemaVersion: '1.0',
      updatedAt: '2026-08-25T11:00:00Z',
      description: 'Quiet luxury and sustainable home decor. Tone is poetic, warm, serene, and understated.'
    },
    lifecycleState: 'APPROVED',
    voice: {
      primaryTone: 'Serene, sensory, understated luxury and contemplative',
      formalityScore: 0.65,
      toneAttributes: ['Tactile descriptions', 'Organic rhythm', 'Subdued confidence', 'Warm minimalism']
    },
    vocabulary: {
      forbidden: [
        { term: 'flash sale', reason: 'High-pressure retail urgency violates timeless luxury ethos.' },
        { term: 'buy now', reason: 'Use contemplative invitation phrases like "Discover the collection" or "Acquire".' },
        { term: 'crazy deal', reason: 'Cheapens handmade heirloom craftsmanship.' },
        { term: 'disruptive', reason: 'Tech jargon incongruent with organic, slow-crafted aesthetics.' }
      ],
      preferred: [
        'Heirloom craftsmanship',
        'Textured linen',
        'Earthy provenance',
        'Sensory warmth',
        'Quiet elegance'
      ]
    },
    colors: {
      primaryHex: ['#292524', '#78716C', '#D6D3D1'],
      secondaryHex: ['#E7E5E4', '#A8A29E', '#57534E'],
      strictCompliance: false
    },
    rules: [
      {
        ruleId: 'R-VOCAB-01',
        category: 'Text',
        description: 'Avoid high-pressure or aggressive retail conversion jargon.',
        weight: 3.0,
        evaluatorType: 'Deterministic'
      },
      {
        ruleId: 'R-TONE-01',
        category: 'Text',
        description: 'Reflect serene, contemplative pacing and tactile sensory prose.',
        weight: 2.5,
        evaluatorType: 'Semantic'
      },
      {
        ruleId: 'R-COLOR-01',
        category: 'Visual',
        description: 'Muted stone, warm linen, and neutral earth palette adherence.',
        weight: 2.0,
        evaluatorType: 'Deterministic'
      }
    ]
  }
];

export const DEMO_SAMPLE_DRAFTS = [
  {
    title: 'Marketing Email Draft (High Misalignment)',
    content: `Hey team! We are thrilled to announce that our new platform will supercharge your entire workflow with pure magic! It is a total game changer that provides cheap cloud compute for everyone. With cross-system synergy, deployment is easy-peasy and delivers unmatched results instantly.`
  },
  {
    title: 'Technical Press Release (Compliant)',
    content: `Apex Cloud Systems today unveiled the NextGen Architecture framework, engineered to accelerate distributed transaction pipelines with verifiable sub-millisecond latency. By streamlining data planes across regional clusters, organizations achieve cost-efficient scale while maintaining strict 99.999% SLA uptime guarantees.`
  }
];

export const PRECOMPUTED_DEMO_AUDIT: AuditReport = {
  id: 'demo-audit-001',
  timestamp: '2026-08-29T10:45:00Z',
  brandName: 'Apex Cloud Systems',
  brandVersion: '2.4.0',
  inputType: 'plain_text',
  inputSnippet: 'Hey team! We are thrilled to announce that our new platform will supercharge your entire workflow with pure magic! It is a total game changer that provides cheap cloud compute for everyone...',
  scores: {
    sDet: 40.0,
    sSem: 48.5,
    sOverall: 45.1,
    confidenceIndex: 0.94,
    overallRatingLabel: 'NEEDS_REVIEW'
  },
  deterministic: {
    findingsCount: 5,
    score: 40.0,
    confidence: 1.0,
    textMatches: [
      {
        term: 'supercharge',
        reason: 'Banned SaaS cliché. Use "accelerate", "optimize", or specific performance metrics.',
        startIndex: 64,
        endIndex: 75,
        line: 1,
        surroundingContext: '...platform will [supercharge] your entire...'
      },
      {
        term: 'magic',
        reason: 'Unverifiable hyperbole. Detail technical mechanisms instead.',
        startIndex: 104,
        endIndex: 109,
        line: 1,
        surroundingContext: '...workflow with pure [magic]! It is a total...'
      },
      {
        term: 'game changer',
        reason: 'Trite promotional jargon. Explain architectural impact.',
        startIndex: 126,
        endIndex: 138,
        line: 1,
        surroundingContext: '...is a total [game changer] that provides...'
      },
      {
        term: 'cheap',
        reason: 'Diminishes enterprise value perception. Use "cost-efficient" or "ROI-positive".',
        startIndex: 153,
        endIndex: 158,
        line: 1,
        surroundingContext: '...that provides [cheap] cloud compute for...'
      },
      {
        term: 'easy-peasy',
        reason: 'Undermines professional technical gravity.',
        startIndex: 242,
        endIndex: 252,
        line: 1,
        surroundingContext: '...deployment is [easy-peasy] and delivers...'
      }
    ]
  },
  semantic: {
    score: 48.5,
    confidence: 0.92,
    observations: [
      {
        ruleId: 'R-TONE-01',
        complianceRating: 0.40,
        severity: 'HIGH',
        confidence: 0.95,
        evidenceQuote: 'Hey team! We are thrilled to announce that our new platform will supercharge your entire workflow with pure magic!',
        findingSummary: 'Tone is excessively casual and relies on sensationalized consumer-marketing tropes rather than engineering precision.',
        suggestedRewrite: 'We are pleased to introduce our upgraded platform architecture, engineered to accelerate mission-critical deployment pipelines.'
      },
      {
        ruleId: 'R-PRECISION-02',
        complianceRating: 0.45,
        severity: 'MEDIUM',
        confidence: 0.90,
        evidenceQuote: 'provides cheap cloud compute for everyone',
        findingSummary: 'Ungrounded cost claim diminishes enterprise positioning and fails to cite measurable total-cost-of-ownership efficiencies.',
        suggestedRewrite: 'delivers cost-efficient cloud compute with predictable workload economics'
      },
      {
        ruleId: 'R-CLARITY-03',
        complianceRating: 0.60,
        severity: 'MEDIUM',
        confidence: 0.92,
        evidenceQuote: 'With cross-system synergy, deployment is easy-peasy and delivers unmatched results instantly.',
        findingSummary: 'Vague corporate phrasing ("cross-system synergy") and colloquialism ("easy-peasy") obscure genuine architectural integration.',
        suggestedRewrite: 'With unified API orchestration, deployment cycles are streamlined for immediate production readiness.'
      }
    ]
  }
};
