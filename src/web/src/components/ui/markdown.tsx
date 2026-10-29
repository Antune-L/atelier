import createDOMPurify from "dompurify";
import { Check, Copy, X } from "lucide-react";
import { marked } from "marked";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

interface MarkdownProps {
  content: string;
  className?: string;
  /** Adds a copy button in the top-right corner of each fenced code block. */
  copyableCode?: boolean;
}

interface LightboxImage {
  src: string;
  alt: string;
}

interface ImageLightboxProps {
  image: LightboxImage;
  onClose: () => void;
}

const OPEN_KEYS = ["Enter", " "];

// Accessible name for an interactive image button when it has no alt text.
const IMAGE_BUTTON_FALLBACK_LABEL = "Agrandir l'image";
// Accessible name for the lightbox overlay dialog.
const LIGHTBOX_DIALOG_LABEL = "Aperçu de l'image";

// Toggled per render so the IMG affordance below only applies when a caller opts
// into interactive images. sanitize() is synchronous, so this can't race.
let markImagesInteractive = false;

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
    if (markImagesInteractive) {
      // Make rendered images focusable and announced as buttons (they open a lightbox).
      node.setAttribute("role", "button");
      node.setAttribute("tabindex", "0");
      // Ensure a screen-reader name when the image has no alt text.
      if (!node.getAttribute("alt")) node.setAttribute("aria-label", IMAGE_BUTTON_FALLBACK_LABEL);
    }
  }
});

/**
 * Parses markdown to sanitized HTML. Exposed so annotation overlays can post-process the same output.
 * Pass `interactiveImages: true` to mark `<img>` as focusable buttons (used by the `Markdown` component).
 */
export function renderMarkdownToSafeHtml(content: string, options?: { interactiveImages?: boolean }): string {
  const parsed = marked.parse(content, { async: false });
  markImagesInteractive = options?.interactiveImages ?? false;
  try {
    return purifier.sanitize(parsed);
  } finally {
    markImagesInteractive = false;
  }
}

export const COPY_CODE_LABEL = "Copier le code";
export const COPY_CODE_DONE_LABEL = "Copié";
export const COPY_CODE_FAILED_LABEL = "Échec de la copie";
// How long the "copied"/"failed" feedback stays before the button reverts.
const COPY_FEEDBACK_MS = 1500;

export type CopyCodeStatus = "idle" | "copied" | "failed";

/** Writes `text` to the clipboard and reports the outcome instead of rejecting. */
export async function copyCodeText(
  text: string,
  writeText: (text: string) => Promise<void>,
): Promise<Exclude<CopyCodeStatus, "idle">> {
  try {
    await writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

function writeToClipboard(text: string): Promise<void> {
  if (!navigator.clipboard) return Promise.reject(new Error("Clipboard unavailable"));
  return navigator.clipboard.writeText(text);
}

export function copyButtonLabel(status: CopyCodeStatus): string {
  if (status === "copied") return COPY_CODE_DONE_LABEL;
  if (status === "failed") return COPY_CODE_FAILED_LABEL;
  return COPY_CODE_LABEL;
}

/** Text a code block's copy button puts on the clipboard (the <code> child, never the button). */
export function codeBlockText(pre: Element): string {
  return (pre.querySelector("code") ?? pre).textContent ?? "";
}

interface CopyCodeButtonProps {
  getText: () => string;
  writeText?: (text: string) => Promise<void>;
}

/** Small ghost button copying a code block's text, with transient React-managed feedback. */
export function CopyCodeButton({ getText, writeText = writeToClipboard }: CopyCodeButtonProps) {
  const [status, setStatus] = useState<CopyCodeStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const onClick = (): void => {
    void copyCodeText(getText(), writeText).then((next) => {
      setStatus(next);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setStatus("idle"), COPY_FEEDBACK_MS);
    });
  };

  const label = copyButtonLabel(status);
  const Icon = status === "copied" ? Check : Copy;
  return (
    <button
      type="button"
      // Visibility (hidden until the block is hovered/focused) lives in index.css.
      className="markdown-copy-button absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded border border-border bg-background/80 text-muted-foreground transition-opacity hover:text-foreground"
      data-copy-status={status}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

/** Full-screen overlay showing a single image; closes on backdrop click, Escape, or the close button. */
function ImageLightbox({ image, onClose }: ImageLightboxProps) {
  const [closeButton, setCloseButton] = useState<HTMLButtonElement | null>(null);

  // NOTE: Radix's dismissable layer listens for Escape on `document` in the capture phase
  // (@radix-ui/react-dismissable-layer). The capture path runs window before document, so this
  // window-capture listener fires first and stopPropagation keeps Escape from also closing the
  // sheet behind the lightbox.
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      event.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose]);

  // Move focus into the lightbox on open and restore it on close.
  useEffect(() => {
    const previous = document.activeElement;
    closeButton?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [closeButton]);

  const closeFromBackdrop = (event: MouseEvent): void => {
    // Synthetic events bubble through the React tree across the portal; stop the
    // event so it never reaches the sheet behind the lightbox (which would close it).
    event.stopPropagation();
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-fullscreen flex items-center justify-center bg-black/80 p-4"
      onMouseDown={closeFromBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label={LIGHTBOX_DIALOG_LABEL}
    >
      <button
        ref={setCloseButton}
        type="button"
        className="absolute right-4 top-4 rounded-md p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        onClick={onClose}
        onMouseDown={(e) => e.stopPropagation()}
        aria-label="Fermer l'aperçu"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
      <img
        src={image.src}
        alt={image.alt}
        className="max-h-[90vh] max-w-[90vw] cursor-zoom-out object-contain"
        onMouseDown={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  );
}

/** Renders trusted-but-sanitized markdown as styled HTML. Storage stays markdown. */
export function Markdown({ content, className, copyableCode = false }: MarkdownProps) {
  const html = useMemo(() => renderMarkdownToSafeHtml(content, { interactiveImages: true }), [content]);
  const [lightbox, setLightbox] = useState<LightboxImage | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [codeBlocks, setCodeBlocks] = useState<HTMLPreElement[]>([]);

  // The sanitized HTML is left untouched; copy buttons are portaled into each <pre>.
  // innerHTML is only replaced when `html` changes, so re-collect the blocks then.
  useLayoutEffect(() => {
    setCodeBlocks(copyableCode && container ? Array.from(container.querySelectorAll("pre")) : []);
  }, [container, html, copyableCode]);

  const openLightbox = useCallback((image: HTMLImageElement) => {
    const src = image.getAttribute("src");
    if (!src) return;
    setLightbox({ src, alt: image.getAttribute("alt") ?? "" });
  }, []);

  // Delegated click on the rendered HTML: open the lightbox when an image is clicked.
  const onContentClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (event.target instanceof HTMLImageElement) openLightbox(event.target);
    },
    [openLightbox],
  );

  // Keyboard equivalent: open the lightbox when an image is activated via Enter/Space.
  const onContentKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!(event.target instanceof HTMLImageElement) || !OPEN_KEYS.includes(event.key)) return;
      event.preventDefault();
      openLightbox(event.target);
    },
    [openLightbox],
  );

  const closeLightbox = useCallback(() => setLightbox(null), []);

  return (
    <>
      <div
        ref={setContainer}
        className={cn("markdown", "[&_img]:cursor-zoom-in", copyableCode && "markdown-copyable", className)}
        onClick={onContentClick}
        onKeyDown={onContentKeyDown}
        // Sanitized above with DOMPurify.
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {codeBlocks.map((pre, index) =>
        createPortal(<CopyCodeButton getText={() => codeBlockText(pre)} />, pre, `copy-code-${index}`),
      )}
      {lightbox && <ImageLightbox image={lightbox} onClose={closeLightbox} />}
    </>
  );
}
