import { useState } from "react";

import type { ProjectInfo } from "@shared/schemas";

import { api } from "@/lib/api";

let cache: ProjectInfo[] | null = null;
const subscribers = new Set<(projects: ProjectInfo[]) => void>();

function loadOnce(): void {
  if (cache !== null) return;
  void api.projects().then((data) => {
    cache = data;
    for (const notify of subscribers) notify(data);
  });
}

/** Loads the static project list once and caches it at module scope. */
export function useProjects(): ProjectInfo[] {
  const [projects, setProjects] = useState<ProjectInfo[]>(cache ?? []);

  if (cache === null) {
    subscribers.add(setProjects);
    loadOnce();
  }

  return projects;
}
