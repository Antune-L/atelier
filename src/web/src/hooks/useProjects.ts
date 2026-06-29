import { useEffect, useState } from "react";

import type { ProjectInfo } from "@shared/schemas";

import { api } from "@/lib/api";

let cache: ProjectInfo[] | null = null;
let inflight: Promise<void> | null = null;
const subscribers = new Set<(projects: ProjectInfo[]) => void>();
const loadedSubscribers = new Set<() => void>();

function emit(data: ProjectInfo[]): void {
  cache = data;
  for (const notify of subscribers) notify(data);
  for (const notify of loadedSubscribers) notify();
}

/** Re-fetch the project list and notify every mounted consumer (call after a mutation). */
export async function refreshProjects(): Promise<void> {
  emit(await api.projects());
}

/** Load once, deduping concurrent first-paint mounts; clears the in-flight latch so a failed load retries. */
function loadOnce(): void {
  if (cache !== null || inflight !== null) return;
  inflight = api
    .projects()
    .then(emit)
    .catch((error) => {
      console.error("Échec du chargement des projets", error);
    })
    .finally(() => {
      inflight = null;
    });
}

/** Loads the project list once, cached at module scope and live-refreshable. */
export function useProjects(): ProjectInfo[] {
  const [projects, setProjects] = useState<ProjectInfo[]>(cache ?? []);

  useEffect(() => {
    subscribers.add(setProjects);
    loadOnce();
    return () => {
      subscribers.delete(setProjects);
    };
  }, []);

  return projects;
}

/** Whether the project list has finished its first load (true even if the result is empty). */
export function useProjectsLoaded(): boolean {
  const [loaded, setLoaded] = useState(cache !== null);

  useEffect(() => {
    if (cache !== null) {
      setLoaded(true);
      return;
    }
    const onLoaded = (): void => setLoaded(true);
    loadedSubscribers.add(onLoaded);
    loadOnce();
    return () => {
      loadedSubscribers.delete(onLoaded);
    };
  }, []);

  return loaded;
}
