/**
 * Webpage Extractor for LoomFrog Zero-Server Brand Guardian
 * Extracts visible text, semantic hierarchy, buttons/CTAs, image alt texts, and detected colors from any public URL.
 */

export interface ExtractedWebpageData {
  url: string;
  title: string;
  description: string;
  headings: string[];
  bodyParagraphs: string[];
  ctaButtons: string[];
  imageAlts: string[];
  detectedColors: string[];
  fullFormattedText: string;
  wordCount: number;
}

export class WebExtractionError extends Error {
  url?: string;
  constructor(message: string, url?: string) {
    super(message);
    this.name = 'WebExtractionError';
    this.url = url;
  }
}

/**
 * Validates whether a string is a well-formed HTTP/HTTPS URL
 */
export function isValidHttpUrl(string: string): boolean {
  try {
    const url = new URL(string.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalizes a URL input (e.g., prepending https:// if missing)
 */
export function normalizeUrl(input: string): string {
  let trimmed = input.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }
  return trimmed;
}

/**
 * Fetches HTML from a target URL with resilient CORS proxy fallback
 */
async function fetchHtmlWithFallback(targetUrl: string): Promise<string> {
  const normalized = normalizeUrl(targetUrl);

  // Strategy 1: Direct fetch (works for same-origin or CORS-enabled sites)
  try {
    const directRes = await fetch(normalized, {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      signal: AbortSignal.timeout(8000)
    });
    if (directRes.ok) {
      const html = await directRes.text();
      if (html && html.length > 50) return html;
    }
  } catch {
    // Direct fetch failed (likely CORS), proceed to proxies
  }

  // Strategy 2: AllOrigins proxy
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(normalized)}`;
    const proxyRes = await fetch(proxyUrl, {
      signal: AbortSignal.timeout(10000)
    });
    if (proxyRes.ok) {
      const html = await proxyRes.text();
      if (html && html.length > 50) return html;
    }
  } catch {
    // Strategy 2 failed
  }

  // Strategy 3: JSDelivr / CorsProxy fallback
  try {
    const fallbackProxy = `https://corsproxy.io/?${encodeURIComponent(normalized)}`;
    const fbRes = await fetch(fallbackProxy, {
      signal: AbortSignal.timeout(10000)
    });
    if (fbRes.ok) {
      const html = await fbRes.text();
      if (html && html.length > 50) return html;
    }
  } catch {
    // Strategy 3 failed
  }

  throw new WebExtractionError(
    `Unable to retrieve content from "${normalized}". The server may be blocking automated web readers or is offline. You can also copy and paste the page text directly into the Text input.`,
    normalized
  );
}

/**
 * Parses raw HTML string into structured auditable copy and visual metadata
 */
export function parseHtmlContent(rawHtml: string, sourceUrl: string): ExtractedWebpageData {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');

    // Remove script, style, svg, noscript, and iframe tags to avoid noisy code
    doc.querySelectorAll('script, style, noscript, iframe, svg, canvas, link').forEach((el) => el.remove());

    // 1. Page Title
    const title = doc.querySelector('title')?.textContent?.trim() || 
                  doc.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() || 
                  'Untitled Webpage';

    // 2. Description
    const description = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || 
                        doc.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim() || 
                        '';

    // 3. Headings (H1, H2, H3, H4)
    const headings: string[] = [];
    doc.querySelectorAll('h1, h2, h3, h4').forEach((el) => {
      const text = el.textContent?.replace(/\s+/g, ' ').trim();
      if (text && text.length > 2 && !headings.includes(text)) {
        headings.push(text);
      }
    });

    // 4. Buttons and CTAs
    const ctaButtons: string[] = [];
    doc.querySelectorAll('button, a[role="button"], .btn, .button, input[type="submit"]').forEach((el) => {
      const text = el.textContent?.replace(/\s+/g, ' ').trim();
      if (text && text.length > 1 && text.length < 60 && !ctaButtons.includes(text)) {
        ctaButtons.push(text);
      }
    });

    // 5. Image Alt attributes
    const imageAlts: string[] = [];
    doc.querySelectorAll('img[alt]').forEach((el) => {
      const alt = el.getAttribute('alt')?.replace(/\s+/g, ' ').trim();
      if (alt && alt.length > 3 && !imageAlts.includes(alt)) {
        imageAlts.push(alt);
      }
    });

    // 6. Body Paragraphs & key text blocks
    const bodyParagraphs: string[] = [];
    doc.querySelectorAll('p, li, blockquote, figcaption, td, article span').forEach((el) => {
      const text = el.textContent?.replace(/\s+/g, ' ').trim();
      if (text && text.length > 15 && !bodyParagraphs.includes(text)) {
        bodyParagraphs.push(text);
      }
    });

    // 7. Extract detectable color hex codes from inline styles & markup
    const detectedColors: string[] = [];
    const hexRegex = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
    const matches = rawHtml.match(hexRegex);
    if (matches) {
      matches.forEach((hex) => {
        const normalizedHex = hex.toUpperCase();
        if (!detectedColors.includes(normalizedHex) && detectedColors.length < 12) {
          detectedColors.push(normalizedHex);
        }
      });
    }

    // Compose formatted text for audit engine
    const sections: string[] = [];
    sections.push(`[SOURCE URL]: ${sourceUrl}`);
    sections.push(`[PAGE TITLE]: ${title}`);
    if (description) {
      sections.push(`[META DESCRIPTION]: ${description}`);
    }
    if (headings.length > 0) {
      sections.push(`[KEY HEADINGS & SECTIONS]:\n${headings.map((h) => `• ${h}`).join('\n')}`);
    }
    if (ctaButtons.length > 0) {
      sections.push(`[CALL TO ACTIONS & BUTTONS]:\n${ctaButtons.map((b) => `[${b}]`).join(' ')}`);
    }
    if (imageAlts.length > 0) {
      sections.push(`[IMAGE ALT & ACCESSIBILITY TEXT]:\n${imageAlts.map((a) => `• "${a}"`).join('\n')}`);
    }
    if (bodyParagraphs.length > 0) {
      sections.push(`[BODY CONTENT]:\n${bodyParagraphs.slice(0, 50).join('\n\n')}`);
    }

    const fullFormattedText = sections.join('\n\n');
    const wordCount = fullFormattedText.split(/\s+/).filter(Boolean).length;

    return {
      url: sourceUrl,
      title,
      description,
      headings,
      bodyParagraphs,
      ctaButtons,
      imageAlts,
      detectedColors,
      fullFormattedText,
      wordCount
    };
  } catch (err) {
    throw new WebExtractionError(
      `Failed to parse webpage markup: ${err instanceof Error ? err.message : 'Invalid HTML document'}`,
      sourceUrl
    );
  }
}

/**
 * Main function to fetch and extract content from a URL
 */
export async function extractWebpage(url: string): Promise<ExtractedWebpageData> {
  const normalizedUrl = normalizeUrl(url);
  if (!isValidHttpUrl(normalizedUrl)) {
    throw new WebExtractionError(`"${url}" is not a valid web URL. Please provide a full address such as https://example.com`, url);
  }

  const html = await fetchHtmlWithFallback(normalizedUrl);
  return parseHtmlContent(html, normalizedUrl);
}
