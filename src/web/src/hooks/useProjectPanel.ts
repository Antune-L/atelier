import { useCallback, useState } from "react";

import type { OpenPr, ProjectInfo } from "@shared/schemas";

import { api } from "@/lib/api";

const LOAD_ERROR = "Échec du chargement des PRs";

export interface ProjectPanelState {
  /** Active project key (explicit choice, else the first loaded project). */
  project: string;
  setProjectChoice: (key: string) => void;
  /** Open PRs of the active project; null while loading. */
  prs: OpenPr[] | null;
  /** True until the first fetch resolves (or errors). */
  loading: boolean;
  /** Numbers of the PRs the user has ticked. */
  selected: Set<number>;
  toggle: (n: number) => void;
  /** Reload the active project's PRs from scratch. */
  refresh: () => void;
  error: string | null;
  setError: (message: string | null) => void;
  busy: boolean;
  setBusy: (busy: boolean) => void;
}

/**
 * Shared state for the "pick a project, then its open PRs" panels (review / clean): project
 * selection, the PR list with its no-useEffect load-on-render, multi-select, and busy/error flags.
 */
export function useProjectPanel(projects: ProjectInfo[]): ProjectPanelState {
  const [projectChoice, setProjectChoice] = useState<string | null>(null);
  const project = projectChoice ?? projects[0]?.key ?? "";
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [prs, setPrs] = useState<OpenPr[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (key: string): Promise<void> => {
    try {
      const data = await api.projectPrs(key);
      setPrs(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : LOAD_ERROR);
      setPrs([]);
    }
  }, []);

  const refresh = (): void => {
    setPrs(null);
    setError(null);
    setSelected(new Set());
    void load(project);
  };

  // Load PRs for the active project on first render and on each project change (no useEffect).
  if (project && project !== loadedKey) {
    setLoadedKey(project);
    setPrs(null);
    setError(null);
    setSelected(new Set());
    void load(project);
  }

  const loading = prs === null && error === null;

  const toggle = (n: number): void =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });

  return { project, setProjectChoice, prs, loading, selected, toggle, refresh, error, setError, busy, setBusy };
}
