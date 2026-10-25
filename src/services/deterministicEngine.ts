import { BrandDNAProfile, DeterministicResult, DeterministicTextMatch, ExtractedColorCluster } from '../types/brandDna';

/**
 * Converts Hex to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace(/^#/, '');
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return { r, g, b };
  }
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

/**
 * Converts RGB to CIELAB (L*, a*, b*) for accurate perceptual color distance calculation
 */
export function rgbToLab(r: number, g: number, b: number): { L: number; a: number; b: number } {
  // Convert sRGB to linear RGB
  let rLin = r / 255;
  let gLin = g / 255;
  let bLin = b / 255;

  rLin = rLin > 0.04045 ? Math.pow((rLin + 0.055) / 1.055, 2.4) : rLin / 12.92;
  gLin = gLin > 0.04045 ? Math.pow((gLin + 0.055) / 1.055, 2.4) : gLin / 12.92;
  bLin = bLin > 0.04045 ? Math.pow((bLin + 0.055) / 1.055, 2.4) : bLin / 12.92;

  // Convert to XYZ using D65 illuminant
  const x = (rLin * 0.4124 + gLin * 0.3576 + bLin * 0.1805) / 0.95047;
  const y = (rLin * 0.2126 + gLin * 0.7152 + bLin * 0.0722) / 1.00000;
  const z = (rLin * 0.0193 + gLin * 0.1192 + bLin * 0.9505) / 1.08883;

  const fX = x > 0.008856 ? Math.pow(x, 1 / 3) : (7.787 * x) + (16 / 116);
  const fY = y > 0.008856 ? Math.pow(y, 1 / 3) : (7.787 * y) + (16 / 116);
  const fZ = z > 0.008856 ? Math.pow(z, 1 / 3) : (7.787 * z) + (16 / 116);

  const L = (116 * fY) - 16;
  const a = 500 * (fX - fY);
  const bVal = 200 * (fY - fZ);

  return { L, a, b: bVal };
}

/**
 * Calculates CIE76 Delta-E perceptual distance between two hex colors
 * ΔE < 2.3: JND (Just Noticeable Difference)
 * ΔE < 10: Perceptually similar
 * ΔE >= 20: Distinctly different color
 */
export function calculateDeltaE(hex1: string, hex2: string): number {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return 100;

  const lab1 = rgbToLab(rgb1.r, rgb1.g, rgb1.b);
  const lab2 = rgbToLab(rgb2.r, rgb2.g, rgb2.b);

  const dL = lab1.L - lab2.L;
  const da = lab1.a - lab2.a;
  const db = lab1.b - lab2.b;

  return Math.sqrt(dL * dL + da * da + db * db);
}

/**
 * Scans text content for forbidden brand terms using regex boundary rules
 */
export function scanForbiddenVocabulary(text: string, profile: BrandDNAProfile): DeterministicTextMatch[] {
  if (!text || !profile.vocabulary?.forbidden) return [];

  const matches: DeterministicTextMatch[] = [];
  const lines = text.split('\n');

  profile.vocabulary.forbidden.forEach((item) => {
    if (!item.term.trim()) return;

    // Escape regex special characters in term
    const escapedTerm = item.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedTerm}\\b`, 'gi');

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const startIndex = match.index;
      const endIndex = startIndex + match[0].length;

      // Find line number
      const textBefore = text.substring(0, startIndex);
      const lineNumber = (textBefore.match(/\n/g) || []).length + 1;

      // Context snippet (up to 30 chars before and after)
      const snippetStart = Math.max(0, startIndex - 25);
      const snippetEnd = Math.min(text.length, endIndex + 25);
      const surroundingContext = `...${text.substring(snippetStart, startIndex)}[${match[0]}]${text.substring(endIndex, snippetEnd)}...`;

      matches.push({
        term: match[0],
        reason: item.reason,
        startIndex,
        endIndex,
        line: lineNumber,
        surroundingContext
      });
    }
  });

  return matches;
}

/**
 * Samples canvas image colors, builds dominant color clusters, and evaluates Delta-E against brand palette
 */
export async function sampleImageColors(
  imageSource: string | HTMLImageElement,
  profile: BrandDNAProfile
): Promise<ExtractedColorCluster[]> {
  return new Promise((resolve) => {
    const img = typeof imageSource === 'string' ? new Image() : imageSource;
    if (typeof imageSource === 'string') {
      img.crossOrigin = 'anonymous';
      img.src = imageSource;
    }

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve([]);
        return;
      }

      // Downscale to max 120x120 for fast client-side clustering
      const scale = Math.min(1, 120 / Math.max(img.naturalWidth || 100, img.naturalHeight || 100));
      const width = Math.max(10, Math.floor((img.naturalWidth || 100) * scale));
      const height = Math.max(10, Math.floor((img.naturalHeight || 100) * scale));
      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels = imageData.data;
      const totalPixels = width * height;

      const colorMap = new Map<string, number>();

      // Quantize colors (step of 16 in RGB)
      for (let i = 0; i < pixels.length; i += 4) {
        const a = pixels[i + 3];
        if (a < 64) continue; // Ignore transparent pixels

        const r = Math.round(pixels[i] / 16) * 16;
        const g = Math.round(pixels[i + 1] / 16) * 16;
        const b = Math.round(pixels[i + 2] / 16) * 16;

        const hex = `#${Math.min(255, r).toString(16).padStart(2, '0')}${Math.min(255, g).toString(16).padStart(2, '0')}${Math.min(255, b).toString(16).padStart(2, '0')}`.toUpperCase();
        colorMap.set(hex, (colorMap.get(hex) || 0) + 1);
      }

      // Sort by area coverage
      const sortedColors = Array.from(colorMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8); // top 8 clusters

      const approvedPalette = [
        ...(profile.colors?.primaryHex || []),
        ...(profile.colors?.secondaryHex || [])
      ];

      const clusters: ExtractedColorCluster[] = sortedColors.map(([hex, count]) => {
        const percentage = Math.round((count / totalPixels) * 100);
        let minDeltaE = 100;
        let nearestHex = approvedPalette[0] || '#000000';

        approvedPalette.forEach((brandHex) => {
          const dE = calculateDeltaE(hex, brandHex);
          if (dE < minDeltaE) {
            minDeltaE = dE;
            nearestHex = brandHex;
          }
        });

        // Compliant if Delta E is within tolerance (e.g., < 16.0)
        const isCompliant = minDeltaE < 16.0;

        return {
          hex,
          percentage,
          deltaE: Math.round(minDeltaE * 10) / 10,
          nearestBrandHex: nearestHex,
          isCompliant
        };
      });

      // Filter clusters >= 3% coverage
      resolve(clusters.filter((c) => c.percentage >= 3));
    };

    img.onerror = () => {
      resolve([]);
    };
  });
}

/**
 * Runs full Tier 1 Deterministic evaluation
 */
export async function runTier1DeterministicAudit(
  text: string,
  imageDataUrl: string | undefined,
  profile: BrandDNAProfile
): Promise<DeterministicResult> {
  const textMatches = scanForbiddenVocabulary(text, profile);
  let colorClusters: ExtractedColorCluster[] | undefined;

  if (imageDataUrl) {
    colorClusters = await sampleImageColors(imageDataUrl, profile);
  }

  // Calculate Deterministic Score S_det based on deterministic rules
  const deterministicRules = profile.rules.filter((r) => r.evaluatorType === 'Deterministic');
  const totalWeight = deterministicRules.reduce((acc, r) => acc + r.weight, 0) || 1.0;

  let passedWeight = totalWeight;

  // Penalty for text vocabulary violations
  const vocabRule = deterministicRules.find((r) => r.ruleId.includes('VOCAB') || r.category === 'Text');
  if (vocabRule && textMatches.length > 0) {
    // Penalty proportional to number of findings
    const penaltyRatio = Math.min(1.0, textMatches.length * 0.35);
    passedWeight -= vocabRule.weight * penaltyRatio;
  }

  // Penalty for color compliance violations
  const colorRule = deterministicRules.find((r) => r.ruleId.includes('COLOR') || r.category === 'Visual');
  if (colorRule && colorClusters && colorClusters.length > 0) {
    const nonCompliant = colorClusters.filter((c) => !c.isCompliant && c.percentage > 5);
    if (nonCompliant.length > 0) {
      const nonCompliantArea = nonCompliant.reduce((sum, c) => sum + c.percentage, 0);
      const colorPenaltyRatio = Math.min(1.0, nonCompliantArea / 60);
      passedWeight -= colorRule.weight * colorPenaltyRatio;
    }
  }

  const sDet = Math.max(0, Math.min(100, Math.round((passedWeight / totalWeight) * 1000) / 10));
  const findingsCount = textMatches.length + (colorClusters?.filter((c) => !c.isCompliant).length || 0);

  return {
    textMatches,
    colorClusters,
    score: sDet,
    confidence: 1.0, // Local regex and canvas are 100% deterministic
    findingsCount
  };
}
