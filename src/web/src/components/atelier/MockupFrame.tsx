import createDOMPurify from "dompurify";
import type { DOMPurify } from "dompurify";
import { Code, Eye, Maximize2, Minimize2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCaptureEscape } from "@/hooks/useCaptureEscape";
import { MOCKUP_SANDBOX, buildMockupSrcdoc, isMockupTooLarge } from "@/lib/mockupBlocks";
import { cn } from "@/lib/utils";

interface MockupFrameProps {
  title: string;
  html: string;
  complete: boolean;
  running: boolean;
}

const SAFE_HREF = /^#[\w-]+$/;

// Dedicated instance: the Markdown purifier has hooks (target=_blank, upload paths) that must not apply here.
// Created lazily so importing this module never touches `window` (SSR tests).
let mockupPurifier: DOMPurify | null = null;

function getPurifier(): DOMPurify {
  if (mockupPurifier) return mockupPurifier;
  const purifier = createDOMPurify(window);
  purifier.addHook("uponSanitizeAttribute", (_node, data) => {
    const name = data.attrName.toLowerCase();
    const value = data.attrValue.trim();
    if (name.startsWith("on")) data.keepAttr = false;
    else if ((name === "href" || name === "xlink:href") && !SAFE_HREF.test(value)) data.keepAttr = false;
    else if (name === "src" && !value.toLowerCase().startsWith("data:")) data.keepAttr = false;
  });
  mockupPurifier = purifier;
  return purifier;
}

// DOMPurify serializes `<html>…</html>` without the doctype: restore it to stay out of quirks mode.
function sanitizeMockup(html: string): string {
  return "<!DOCTYPE html>" + getPurifier().sanitize(html, {
    WHOLE_DOCUMENT: true,
    FORCE_BODY: false,
    ADD_TAGS: ["style"],
    FORBID_TAGS: ["script", "meta", "base", "link", "form", "iframe", "object", "embed"],
    FORBID_ATTR: ["target", "action", "formaction"],
  });
}

const FRAME_HEIGHT = "h-[420px]";

/** Static HTML mockup from the agent, sanitized then rendered in a script-less, opaque-origin iframe. */
export function MockupFrame({ title, html, complete, running }: MockupFrameProps) {
  const tooLarge = isMockupTooLarge(html);
  const [showCode, setShowCode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const exitFullscreen = useCallback(() => setFullscreen(false), []);
  useCaptureEscape(fullscreen, exitFullscreen);

  // Sanitize first, then inject the CSP so the sanitizer can never strip it.
  const srcdoc = useMemo(() => (complete && !tooLarge ? buildMockupSrcdoc(sanitizeMockup(html)) : ""), [html, complete, tooLarge]);

  const bodyHeight = fullscreen ? "min-h-0 flex-1" : FRAME_HEIGHT;
  const codeView = (
    <pre className={cn("overflow-auto bg-muted/40 p-3 font-mono text-2xs", bodyHeight)}>
      <code>{html}</code>
    </pre>
  );

  let body;
  if (!complete && running) {
    body = <div className={cn("flex items-center justify-center text-xs text-muted-foreground", bodyHeight)}>Maquette en cours…</div>;
  } else if (showCode || tooLarge) {
    body = codeView;
  } else if (!complete) {
    body = <div className={cn("flex items-center justify-center text-xs text-muted-foreground", bodyHeight)}>Maquette incomplète</div>;
  } else {
    body = <iframe sandbox={MOCKUP_SANDBOX} srcDoc={srcdoc} referrerPolicy="no-referrer" title={title} className={cn("w-full border-0 bg-white", bodyHeight)} />;
  }

  return (
    <>
      {fullscreen && <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={exitFullscreen} aria-hidden />}
      <div className={cn("flex w-full flex-col overflow-hidden rounded-md border border-border bg-background", fullscreen && "fixed inset-4 z-50 shadow-lg")}>
        <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
          <span className="truncate text-xs font-medium" title={title}>
            {title}
          </span>
          <Badge variant="outline" className="shrink-0 text-2xs">
            Maquette illustrative
          </Badge>
          <div className="ml-auto flex items-center gap-1">
            {!tooLarge && (complete || !running) && (
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setShowCode((value) => !value)}>
                {showCode ? <Eye className="h-3.5 w-3.5" /> : <Code className="h-3.5 w-3.5" />}
                {showCode ? (complete ? "Aperçu" : "Masquer le code") : "Code"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => setFullscreen((value) => !value)}
              aria-label={fullscreen ? "Quitter le plein écran" : "Plein écran"}
              title={fullscreen ? "Quitter le plein écran" : "Plein écran"}
            >
              {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
        {tooLarge && <p className="border-b border-border px-3 py-1 text-2xs text-muted-foreground">Maquette trop volumineuse (&gt; 64 Ko) : code seul</p>}
        {body}
      </div>
    </>
  );
}
