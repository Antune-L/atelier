import createDOMPurify from "dompurify";
import { marked } from "marked";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

interface MarkdownProps {
  content: string;
  className?: string;
}

marked.setOptions({ breaks: true, gfm: true });

const UPLOADS_DIR = "uploads";
// Matches an absolute on-disk uploads path, e.g. /Users/.../uploads/<name>.png
const ABSOLUTE_UPLOAD_PATH = new RegExp(`/${UPLOADS_DIR}/([\\w.-]+)$`);

// Pasted media is stored in the markdown as an absolute on-disk path so the
// agent's Read tool can open it; the browser can only fetch the public
// /uploads/<name> URL. Map the former to the latter, leaving already-public
// ("/uploads/...") and remote ("http(s)://") references untouched.
function toPublicUploadPath(value: string): string | null {
  if (!value.startsWith("/") || value.startsWith(`/${UPLOADS_DIR}/`)) return null;
  const match = ABSOLUTE_UPLOAD_PATH.exec(value);
  return match ? `/${UPLOADS_DIR}/${match[1]}` : null;
}

// Module-local instance so our hook never mutates the shared default singleton
// (avoids leaking this behavior to other sanitize callers and hook stacking on HMR).
const purifier = createDOMPurify(window);

// Render links (e.g. a PR url posted in a comment) in a new tab so clicking one
// never navigates the board away from itself, and rewrite pasted-media paths to
// their fetchable public URL.
purifier.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noreferrer noopener");
    const href = node.getAttribute("href");
    const mappedHref = href && toPublicUploadPath(href);
    if (mappedHref) node.setAttribute("href", mappedHref);
  }
  if (node.tagName === "IMG") {
    const src = node.getAttribute("src");
    const mappedSrc = src && toPublicUploadPath(src);
    if (mappedSrc) node.setAttribute("src", mappedSrc);
  }
});

/** Parses markdown to sanitized HTML. Exposed so annotation overlays can post-process the same output. */
export function renderMarkdownToSafeHtml(content: string): string {
  const parsed = marked.parse(content, { async: false });
  return purifier.sanitize(parsed);
}

/** Renders trusted-but-sanitized markdown as styled HTML. Storage stays markdown. */
export function Markdown({ content, className }: MarkdownProps) {
  const html = useMemo(() => renderMarkdownToSafeHtml(content), [content]);

  return (
    <div
      className={cn("markdown", className)}
      // Sanitized above with DOMPurify.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
