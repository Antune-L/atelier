import { useEffect, useState } from "react";

import type { Profile } from "@shared/schemas";

import { api } from "@/lib/api";

let cache: Profile[] | null = null;
let inflight: Promise<void> | null = null;
const subscribers = new Set<(profiles: Profile[]) => void>();

function emit(data: Profile[]): void {
  cache = data;
  for (const notify of subscribers) notify(data);
}

/** Re-fetch the profile list and notify every mounted consumer (call after a mutation). */
export async function refreshProfiles(): Promise<void> {
  emit(await api.profiles());
}

/** Load once, deduping concurrent first-paint mounts; clears the in-flight latch so a failed load retries. */
function loadOnce(): void {
  if (cache !== null || inflight !== null) return;
  inflight = api
    .profiles()
    .then(emit)
    .catch((error) => {
      // Surface a failed load; cache stays null so the next mount retries.
      console.error("Échec du chargement des profils", error);
    })
    .finally(() => {
      inflight = null;
    });
}

/** Loads the implementation-agent profiles, cached at module scope and live-refreshable. */
export function useProfiles(): Profile[] {
  const [profiles, setProfiles] = useState<Profile[]>(cache ?? []);

  useEffect(() => {
    subscribers.add(setProfiles);
    loadOnce();
    return () => {
      subscribers.delete(setProfiles);
    };
  }, []);

  return profiles;
}
