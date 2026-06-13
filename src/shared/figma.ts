const FIGMA_URL_PATTERN = /https?:\/\/(?:www\.)?figma\.com\/[^\s)\]>"']+/g;

/** Figma links live inline in the ticket description (several nodes per ticket). */
export function extractFigmaUrls(text: string): string[] {
  const matches = text.match(FIGMA_URL_PATTERN) ?? [];
  return [...new Set(matches)];
}
