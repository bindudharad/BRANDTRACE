export type LifecycleState = 'DRAFT' | 'AI_GENERATED' | 'USER_REVIEW' | 'APPROVED' | 'ACTIVE';

export interface BrandMetadata {
  brandName: string;
  brandVersion: string;
  schemaVersion: string;
  updatedAt: string;
  description?: string;
}

export interface VoiceProfile {
  primaryTone: string;
  formalityScore: number; // 0.0 to 1.0
  toneAttributes: string[];
}

export interface ForbiddenTerm {
  term: string;
  reason: string;
}

export interface VocabularyConfig {
  forbidden: ForbiddenTerm[];
  preferred: string[];
}

export interface ColorPaletteConfig {
  primaryHex: string[];
  secondaryHex: string[];
  strictCompliance: boolean;
}

export type RuleCategory = 'Text' | 'Visual' | 'Global';
export type EvaluatorType = 'Deterministic' | 'Semantic';

export interface BrandSource {
  id: string;
  url: string;
  title?: string;
  addedAt: string;
  status?: 'active' | 'error' | 'pending';
  errorMsg?: string;
}

export interface BrandRule {
  ruleId: string;
  category: RuleCategory;
  description: string;
  weight: number; // 0.1 to 5.0
  evaluatorType: EvaluatorType;
}

export interface BrandDNAProfile {
  metadata: BrandMetadata;
  lifecycleState: LifecycleState;
  voice: VoiceProfile;
  vocabulary: VocabularyConfig;
  colors: ColorPaletteConfig;
  rules: BrandRule[];
  sources?: BrandSource[];
  usedModel?: string;
  fallbackNotice?: string;
}

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ObservationItem {
  ruleId: string;
  complianceRating: number; // 0.0 to 1.0
  severity: SeverityLevel;
  confidence: number; // 0.0 to 1.0
  evidenceQuote: string;
  findingSummary: string;
  suggestedRewrite: string;
}

export interface LoomFrogObservationPayload {
  observations: ObservationItem[];
}

export interface DeterministicTextMatch {
  term: string;
  reason: string;
  startIndex: number;
  endIndex: number;
  line: number;
  surroundingContext: string;
}

export interface ExtractedColorCluster {
  hex: string;
  percentage: number;
  deltaE: number; // minimum distance to any approved brand color
  nearestBrandHex: string;
  isCompliant: boolean;
  name?: string;
}

export interface DeterministicResult {
  textMatches: DeterministicTextMatch[];
  colorClusters?: ExtractedColorCluster[];
  score: number; // 0 to 100
  confidence: number; // 0.0 to 1.0
  findingsCount: number;
}

export interface SemanticResult {
  observations: ObservationItem[];
  score: number; // 0 to 100
  confidence: number; // 0.0 to 1.0
  usedModel?: string;
  originalModel?: string;
  fallbackNotice?: string;
}

export interface AuditScoreMatrix {
  sDet: number; // Deterministic score (0-100)
  sSem: number; // Semantic score (0-100)
  sOverall: number; // (sDet * 0.4) + (sSem * 0.6)
  confidenceIndex: number; // 0.0 to 1.0
  overallRatingLabel: 'EXEMPLARY' | 'ALIGNED' | 'NEEDS_REVIEW' | 'CRITICAL_MISALIGNMENT';
}

export type DetectedInputType = 'plain_text' | 'document' | 'spreadsheet' | 'image' | 'webpage';

export interface ExtractedInputData {
  type: DetectedInputType;
  fileName?: string;
  fileSize?: number;
  textContent?: string;
  imageDataUrl?: string;
  rawImageFile?: File;
  sourceUrl?: string;
  pageTitle?: string;
  detectedColors?: string[];
  sourceLocationMap?: Array<{ line: number; sourceRef: string }>;
}

export interface AuditReport {
  id: string;
  timestamp: string;
  brandName: string;
  brandVersion: string;
  inputType: DetectedInputType;
  inputSnippet: string;
  contentContext?: string;
  scores: AuditScoreMatrix;
  deterministic: DeterministicResult;
  semantic: SemanticResult;
  usedModel?: string;
  fallbackNotice?: string;
}
