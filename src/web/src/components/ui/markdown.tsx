import createDOMPurify from "dompurify";
import { X } from "lucide-react";
import { marked } from "marked";
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

interface MarkdownProps {
  content: string;
  className?: string;
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

/** Full-screen overlay showing a single image; closes on backdrop click, Escape, or the close button. */
function ImageLightbox({ image, onClose }: ImageLightboxProps) {
  const [closeButton, setCloseButton] = useState<HTMLButtonElement | null>(null);

  // Capture-phase Escape: runs before the underlying Modal's bubble-phase window
  // listener, so stopPropagation prevents Escape from also closing the detail modal.
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
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
    // event so it never reaches the Modal's onMouseDown (which closes the detail).
    event.stopPropagation();
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
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
export function Markdown({ content, className }: MarkdownProps) {
  const html = useMemo(() => renderMarkdownToSafeHtml(content, { interactiveImages: true }), [content]);
  const [lightbox, setLightbox] = useState<LightboxImage | null>(null);

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
        className={cn("markdown", "[&_img]:cursor-zoom-in", className)}
        onClick={onContentClick}
        onKeyDown={onContentKeyDown}
        // Sanitized above with DOMPurify.
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {lightbox && <ImageLightbox image={lightbox} onClose={closeLightbox} />}
    </>
  );
}
