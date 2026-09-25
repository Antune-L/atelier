import { useEffect, useRef, useState } from "react";

import type { Conversation, ConversationMessage, PrdDocumentRecord } from "@shared/schemas";

import { useBoard } from "@/hooks/useBoard";
import { api } from "@/lib/api";
import { boardStore } from "@/lib/store";

interface WithId {
  id: string;
}

interface DetailState {
  loadedId: string | null;
  loaded: boolean;
  fetched: Conversation | null;
  messages: ConversationMessage[];
  prds: PrdDocumentRecord[];
  error: string | null;
}

export interface ConversationDetailView {
  conversation: Conversation | null;
  messages: ConversationMessage[];
  prds: PrdDocumentRecord[];
  loaded: boolean;
  error: string | null;
  reload: () => void;
  applyPrd: (prd: PrdDocumentRecord) => void;
}

const EMPTY_STATE: DetailState = {
  loadedId: null,
  loaded: false,
  fetched: null,
  messages: [],
  prds: [],
  error: null,
};

function mergeById<T extends WithId>(existing: T[], incoming: T[], order: (a: T, b: T) => number): T[] {
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()].sort(order);
}

function byCreatedAt(a: ConversationMessage, b: ConversationMessage): number {
  return a.createdAt - b.createdAt;
}

function byRevision(a: PrdDocumentRecord, b: PrdDocumentRecord): number {
  return a.revision - b.revision;
}

function withMessage(message: ConversationMessage): (prev: DetailState) => DetailState {
  return (prev) => ({ ...prev, messages: mergeById(prev.messages, [message], byCreatedAt) });
}

function withPrd(prd: PrdDocumentRecord): (prev: DetailState) => DetailState {
  return (prev) => ({ ...prev, prds: mergeById(prev.prds, [prd], byRevision) });
}

/**
 * One Atelier conversation: loaded once per id (render-phase guard), then kept fresh by the WS
 * message/PRD streams. The conversation row itself comes from the board store when available.
 */
export function useConversationDetail(id: string | null): ConversationDetailView {
  const { conversations } = useBoard();
  const [state, setState] = useState<DetailState>(EMPTY_STATE);
  const latestId = useRef<string | null>(null);

  const load = (target: string): void => {
    latestId.current = target;
    void api
      .atelierConversation(target)
      .then((detail) => {
        if (latestId.current !== target) return;
        setState((prev) => ({
          loadedId: target,
          loaded: true,
          fetched: detail.conversation,
          messages: mergeById(prev.messages, detail.messages, byCreatedAt),
          prds: mergeById(prev.prds, detail.prds, byRevision),
          error: null,
        }));
      })
      .catch((error: unknown) => {
        if (latestId.current !== target) return;
        setState((prev) => ({
          ...prev,
          loaded: true,
          error: error instanceof Error ? error.message : "Conversation introuvable",
        }));
      });
  };

  if (id !== state.loadedId) {
    setState({ ...EMPTY_STATE, loadedId: id });
    if (id === null) latestId.current = null;
    else load(id);
  }

  useEffect(() => {
    if (id === null) return;
    const stopMessages = boardStore.subscribeConversationMessages((message) => {
      if (message.conversationId === id) setState(withMessage(message));
    });
    const stopPrds = boardStore.subscribePrdDocuments((prd) => {
      if (prd.conversationId === id) setState(withPrd(prd));
    });
    return () => {
      stopMessages();
      stopPrds();
    };
  }, [id]);

  const live = id === null ? undefined : conversations.find((c) => c.id === id);

  return {
    conversation: live ?? state.fetched,
    messages: state.messages,
    prds: state.prds,
    loaded: state.loaded && state.loadedId === id,
    error: state.error,
    reload: () => {
      if (id !== null) load(id);
    },
    applyPrd: (prd) => {
      if (prd.conversationId === id) setState(withPrd(prd));
    },
  };
}
