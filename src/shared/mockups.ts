import { extractFigmaUrls } from "./figma.ts";

/** Inline markdown images `![alt](url)` — how pasted/uploaded mockups land in a description. */
const MARKDOWN_IMAGE_PATTERN = /!\[[^\]]*\]\([^)]+\)/;
/** Absolute local image paths (e.g. /Users/.../uploads/x.png) a description may reference directly. */
const LOCAL_IMAGE_PATH_PATTERN = /\/[^\s)]+\.(?:png|jpe?g|gif|webp|svg)\b/i;

/** Whether the description carries any mockup the agent can compare the result against. */
export function hasMockups(text: string): boolean {
  return (
    extractFigmaUrls(text).length > 0 ||
    MARKDOWN_IMAGE_PATTERN.test(text) ||
    LOCAL_IMAGE_PATH_PATTERN.test(text)
  );
}
