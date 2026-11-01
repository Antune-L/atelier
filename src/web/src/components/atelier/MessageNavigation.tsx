import { useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import type { ConversationMessage } from "@shared/schemas";

interface MessageNavigationProps {
  messages: ConversationMessage[];
  threadRef: RefObject<HTMLDivElement>;
  onNavigate: () => void;
}

const READING_MARGIN_PX = 80;
const JUMP_MARGIN_PX = 24;
const BOTTOM_MARGIN_PX = 10;
const PREVIEW_MARGIN_PX = 12;
const PREVIEW_HEIGHT_PX = 120;

export function MessageNavigation({ messages, threadRef, onNavigate }: MessageNavigationProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ id: string; top: number } | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const userMessages = messages.filter((message) => message.role === "user");
  const signature = userMessages.map((message) => message.id).join(":");

  useLayoutEffect(() => {
    const thread = threadRef.current;
    const content = thread?.firstElementChild;
    if (!thread || !content) return;
    let frame = 0;
    const update = (): void => {
      const anchors = Array.from(thread.querySelectorAll<HTMLElement>("[data-user-message-id]"));
      const readingTop = thread.getBoundingClientRect().top + READING_MARGIN_PX;
      let active = anchors[0];
      for (const anchor of anchors) {
        if (anchor.getBoundingClientRect().top <= readingTop) active = anchor;
      }
      if (thread.scrollHeight - thread.scrollTop - thread.clientHeight < BOTTOM_MARGIN_PX) active = anchors.at(-1);
      setActiveId(active?.dataset.userMessageId ?? null);
    };
    const schedule = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(content);
    thread.addEventListener("scroll", schedule, { passive: true });
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      thread.removeEventListener("scroll", schedule);
    };
  }, [threadRef, signature]);

  useLayoutEffect(() => {
    const rail = railRef.current;
    const active = activeRef.current;
    if (!rail || !active || rail.contains(document.activeElement)) return;
    if (active.offsetTop < rail.scrollTop) rail.scrollTop = active.offsetTop;
    if (active.offsetTop + active.offsetHeight > rail.scrollTop + rail.clientHeight) {
      rail.scrollTop = active.offsetTop + active.offsetHeight - rail.clientHeight;
    }
  }, [activeId]);

  if (userMessages.length === 0) return null;
  const activeIndex = userMessages.findIndex((message) => message.id === activeId);
  const previewMessage = userMessages.find((message) => message.id === preview?.id);

  const showPreview = (id: string, button: HTMLButtonElement): void => {
    const body = railRef.current?.parentElement;
    if (!body) return;
    const top = button.getBoundingClientRect().top - body.getBoundingClientRect().top;
    setPreview({ id, top: Math.max(PREVIEW_MARGIN_PX, Math.min(top, body.clientHeight - PREVIEW_HEIGHT_PX)) });
  };

  const jump = (id: string): void => {
    const thread = threadRef.current;
    const target = thread?.querySelector<HTMLElement>(`[data-user-message-id="${CSS.escape(id)}"]`);
    if (!thread || !target) return;
    onNavigate();
    setPreview(null);
    thread.scrollTo({
      top: target.getBoundingClientRect().top - thread.getBoundingClientRect().top + thread.scrollTop - JUMP_MARGIN_PX,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  };

  return (
    <>
      <div ref={railRef} className="message-navigation-scroll" onScroll={() => {
        const focused = document.activeElement;
        if (focused instanceof HTMLButtonElement && railRef.current?.contains(focused)) {
          const id = focused.dataset.messageId;
          if (id) showPreview(id, focused);
        } else {
          setPreview(null);
        }
      }}>
        <nav className="message-navigation" aria-label="Vos messages" onKeyDown={(event) => {
          if (event.key === "Escape") setPreview(null);
        }}>
          {activeIndex >= 0 && <span aria-hidden className="message-navigation-current" style={{ transform: `translateY(calc(${activeIndex} * var(--message-pitch) + var(--message-half-pitch) - 1px))` }} />}
          {userMessages.map((message, index) => (
            <button
              key={message.id}
              ref={message.id === activeId ? activeRef : undefined}
              type="button"
              data-message-id={message.id}
              className="message-navigation-marker"
              aria-label={`Message ${index + 1} : ${message.content}`}
              aria-current={message.id === activeId ? "location" : undefined}
              onPointerEnter={(event) => showPreview(message.id, event.currentTarget)}
              onPointerLeave={() => setPreview(null)}
              onFocus={(event) => showPreview(message.id, event.currentTarget)}
              onBlur={() => setPreview(null)}
              onClick={() => jump(message.id)}
            ><span aria-hidden /></button>
          ))}
        </nav>
      </div>
      <div aria-hidden className="message-navigation-preview" data-open={Boolean(previewMessage)} style={{ top: preview?.top }}>
        {previewMessage?.content}
      </div>
    </>
  );
}
