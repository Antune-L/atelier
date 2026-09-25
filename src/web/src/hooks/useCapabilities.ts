import { useSyncExternalStore } from "react";

import { UNKNOWN_CODEX_RUNTIME_STATUS } from "@shared/codexCapabilities";
import type { CodexRuntimeStatus } from "@shared/codexCapabilities";
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
  canPickFolder: false,
  skills: [],
};

const RETRY_DELAYS_MS = [5_000, 15_000, 60_000] as const;
const RETRYABLE_CODEX_STATUSES: ReadonlySet<CodexRuntimeStatus["status"]> = new Set([
  "temporarily_unavailable",
  "unauthenticated",
]);

interface LoadOptions {
  probe: boolean;
  announce: boolean;
}

let cache: Capabilities | null = null;
let pending: Promise<void> | null = null;
let retryAttempt = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
const subscribers = new Set<() => void>();

function publish(data: Capabilities): void {
  cache = data;
  for (const notify of subscribers) notify();
}

function clearRetry(): void {
  if (retryTimer !== null) clearTimeout(retryTimer);
  retryTimer = null;
}

function scheduleRetry(status: CodexRuntimeStatus["status"]): void {
  if (status === "ready") retryAttempt = 0;
  if (retryTimer !== null || subscribers.size === 0 || !RETRYABLE_CODEX_STATUSES.has(status)) return;
  const delay = RETRY_DELAYS_MS[retryAttempt];
  if (delay === undefined) return;
  retryAttempt += 1;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void loadCapabilities({ probe: true, announce: false });
  }, delay);
}

function loadCapabilities({ probe, announce }: LoadOptions): Promise<void> {
  if (pending !== null) return pending;
  if (announce) {
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
    .capabilities(probe)
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
      if (cache !== null) scheduleRetry(cache.codex.status);
    });
  return pending;
}

function revalidateOnAttention(): void {
  if (document.visibilityState !== "visible") return;
  void loadCapabilities({ probe: false, announce: false });
}

function subscribe(notify: () => void): () => void {
  subscribers.add(notify);
  if (subscribers.size === 1) {
    window.addEventListener("focus", revalidateOnAttention);
    document.addEventListener("visibilitychange", revalidateOnAttention);
  }
  if (cache === null) void loadCapabilities({ probe: false, announce: false });
  return () => {
    subscribers.delete(notify);
    if (subscribers.size > 0) return;
    window.removeEventListener("focus", revalidateOnAttention);
    document.removeEventListener("visibilitychange", revalidateOnAttention);
    clearRetry();
  };
}

function snapshot(): Capabilities {
  return cache ?? UNKNOWN_CAPABILITIES;
}

/** Force a fresh runtime/auth/catalog probe and notify every mounted consumer. */
export function refreshCapabilities(): Promise<void> {
  clearRetry();
  retryAttempt = 0;
  return loadCapabilities({ probe: true, announce: true });
}

/** Subscribe to the refreshable backend capability snapshot without leaking render-time listeners. */
export function useCapabilities(): Capabilities {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
