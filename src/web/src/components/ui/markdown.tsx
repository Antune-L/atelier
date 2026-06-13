import DOMPurify from "dompurify";
import { marked } from "marked";
import { useMemo } from "react";

import { cn } from "@/lib/utils";

interface MarkdownProps {
  content: string;
  className?: string;
}

marked.setOptions({ breaks: true, gfm: true });

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
