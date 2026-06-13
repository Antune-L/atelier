import DOMPurify from "dompurify";
import { marked } from "marked";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

interface MarkdownProps {
  content: string;
  className?: string;
}

marked.setOptions({ breaks: true, gfm: true });

// Render links (e.g. a PR url posted in a comment) in a new tab so clicking one
// never navigates the board away from itself.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A") {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noreferrer noopener");
  }
});

/** Renders trusted-but-sanitized markdown as styled HTML. Storage stays markdown. */
export function Markdown({ content, className }: MarkdownProps) {
  const html = useMemo(() => {
    const parsed = marked.parse(content, { async: false });
    return DOMPurify.sanitize(parsed);
  }, [content]);

  return (
    <div
      className={cn("markdown", className)}
      // Sanitized above with DOMPurify.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
