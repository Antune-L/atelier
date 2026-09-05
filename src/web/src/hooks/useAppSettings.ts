import { useSyncExternalStore } from "react";

import type { AppSettings, UpdateAppSettingsInput } from "@shared/schemas";

import { SAVED_FEEDBACK_MS } from "@/hooks/useSavedFlash";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

export interface AppSettingsState {
  /** null until the first load resolves; every consumer renders an unhighlighted picker meanwhile. */
  settings: AppSettings | null;
  error: string | null;
  saved: boolean;
}

let state: AppSettingsState = { settings: null, error: null, saved: false };
let inflight: Promise<void> | null = null;
let savedTimer: ReturnType<typeof setTimeout> | null = null;
const subscribers = new Set<() => void>();

function publish(next: AppSettingsState): void {
  state = next;
  for (const notify of subscribers) notify();
}

/** Load once, deduping concurrent first-paint mounts; clears the latch so a failed load retries. */
function loadOnce(): void {
  if (state.settings !== null || inflight !== null) return;
  inflight = api
    .settings()
    .then((settings) => publish({ ...state, settings, error: null }))
    .catch((error: unknown) => publish({ ...state, error: errorMessage(error) }))
    .finally(() => {
      inflight = null;
    });
}

function flashSaved(): void {
  if (savedTimer !== null) clearTimeout(savedTimer);
  publish({ ...state, saved: true, error: null });
  savedTimer = setTimeout(() => {
    savedTimer = null;
    publish({ ...state, saved: false });
  }, SAVED_FEEDBACK_MS);
}

/** Optimistic PATCH /settings: applies the patch, rolls it back and surfaces the message on failure. */
export async function patchAppSettings(patch: UpdateAppSettingsInput): Promise<void> {
  const previous = state.settings;
  if (previous === null) return;
  publish({ settings: { ...previous, ...patch }, error: null, saved: false });
  try {
    await api.updateSettings(patch);
    flashSaved();
  } catch (error) {
    publish({ settings: previous, error: errorMessage(error), saved: false });
  }
}

function subscribe(notify: () => void): () => void {
  subscribers.add(notify);
  loadOnce();
  return () => {
    subscribers.delete(notify);
  };
}

function snapshot(): AppSettingsState {
  return state;
}

/** App-wide settings, cached at module scope and patched optimistically from any settings surface. */
export function useAppSettings(): AppSettingsState {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
