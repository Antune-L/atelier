import { useSyncExternalStore } from "react";

import { UNKNOWN_CODEX_RUNTIME_STATUS } from "@shared/codexCapabilities";
import type { Capabilities } from "@shared/schemas";

import { api } from "@/lib/api";

const UNKNOWN_CAPABILITIES: Capabilities = {
  composerAvailable: false,
  codexAvailable: false,
  claudeAvailable: false,
  codex: UNKNOWN_CODEX_RUNTIME_STATUS,
  defaultModel: "",
  defaultEffort: "",
  defaultImplementerModel: "",
  defaultImplementerEffort: "",
  defaultCodexModel: "",
  defaultCodexEffort: "",
  defaultCodexFast: false,
  canUpdate: false,
  canQuit: false,
  canPickFolder: false,
};

let cache: Capabilities | null = null;
let pending: Promise<void> | null = null;
const subscribers = new Set<() => void>();

function publish(data: Capabilities): void {
  cache = data;
  for (const notify of subscribers) notify();
}

function loadCapabilities(refresh: boolean): Promise<void> {
  if (!refresh && cache !== null) return Promise.resolve();
  if (pending !== null) return pending;
  if (refresh) {
    publish({
      ...(cache ?? UNKNOWN_CAPABILITIES),
      codexAvailable: false,
      codex: {
        status: "checking",
        models: cache?.codex.models ?? [],
        checkedAt: Date.now(),
        message: "Vérification des capacités Codex…",
      },
    });
  }
  pending = api
    .capabilities(refresh)
    .then(publish)
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Vérification Codex impossible";
      publish({
        ...(cache ?? UNKNOWN_CAPABILITIES),
        codexAvailable: false,
        codex: {
          status: "temporarily_unavailable",
          models: cache?.codex.models ?? [],
          checkedAt: Date.now(),
          message,
        },
      });
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

function subscribe(notify: () => void): () => void {
  subscribers.add(notify);
  void loadCapabilities(false);
  return () => subscribers.delete(notify);
}

function snapshot(): Capabilities {
  return cache ?? UNKNOWN_CAPABILITIES;
}

/** Force a fresh runtime/auth/catalog probe and notify every mounted consumer. */
export function refreshCapabilities(): Promise<void> {
  return loadCapabilities(true);
}

/** Subscribe to the refreshable backend capability snapshot without leaking render-time listeners. */
export function useCapabilities(): Capabilities {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
