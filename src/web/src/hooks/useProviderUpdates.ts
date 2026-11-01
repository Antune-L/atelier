import { useEffect, useSyncExternalStore } from "react";

import { providerUpdatesSchema } from "@shared/providerUpdates";
import type { ProviderUpdates } from "@shared/providerUpdates";

import { request } from "@/lib/api";

interface UpdateSnapshot { data: ProviderUpdates | null; loading: boolean; error: string | null }
let snapshot: UpdateSnapshot = { data: null, loading: false, error: null };
let pending: Promise<void> | null = null;
const listeners = new Set<() => void>();
function publish(value: UpdateSnapshot): void { snapshot = value; for (const listener of listeners) listener(); }
export function refreshProviderUpdates(force = false): Promise<void> {
  if (pending) return pending;
  publish({ ...snapshot, loading: true, error: null });
  pending = request(`/api/provider-updates${force ? "?refresh=1" : ""}`, { signal: AbortSignal.timeout(30_000) }).then((value) => {
    publish({ data: providerUpdatesSchema.parse(value), loading: false, error: null });
  }).catch(() => {
    publish({ ...snapshot, loading: false, error: "Vérification indisponible. Réessayez ; les informations précédentes peuvent être périmées." });
  }).finally(() => { pending = null; });
  return pending;
}
export function useProviderUpdates(enabled = true): UpdateSnapshot {
  const state = useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => snapshot);
  useEffect(() => { if (enabled) void refreshProviderUpdates(); }, [enabled]);
  return state;
}
