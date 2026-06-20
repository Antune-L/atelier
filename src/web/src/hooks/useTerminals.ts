import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/lib/api";
import { boardStore } from "@/lib/store";

import {
  applySizes,
  collectTerminalIds,
  findLeaf,
  firstLeafId,
  makeLeaf,
  parseTree,
  pruneToLive,
  removeLeaf,
  splitLeaf,
  type SplitOrientation,
  type TreeNode,
} from "@/components/terminals/tree";

const STORAGE_PREFIX = "atelier.terminals.";
const DEFAULT_ORIENTATION: SplitOrientation = "row";

function storageKey(projectKey: string): string {
  return `${STORAGE_PREFIX}${projectKey}`;
}

function loadTree(projectKey: string): TreeNode | null {
  try {
    const raw = localStorage.getItem(storageKey(projectKey));
    if (!raw) return null;
    return parseTree(JSON.parse(raw));
  } catch {
    return null;
  }
}

function saveTree(projectKey: string, tree: TreeNode | null): void {
  try {
    if (tree) localStorage.setItem(storageKey(projectKey), JSON.stringify(tree));
    else localStorage.removeItem(storageKey(projectKey));
  } catch {
    // Storage unavailable (private mode / quota); the layout is best-effort persistence.
  }
}

export interface UseTerminals {
  tree: TreeNode | null;
  focusedLeafId: string | null;
  setFocusedLeafId: (id: string | null) => void;
  /** Create the first cell when the workspace is empty. */
  addRoot: () => Promise<void>;
  /** Split the focused (or given) leaf, opening a fresh session as its new sibling. */
  split: (orientation: SplitOrientation, leafId?: string) => Promise<void>;
  /** Open a new terminal: split the focused leaf, or seed the root when empty. */
  newTerminal: () => Promise<void>;
  /** Close the focused (or given) leaf and kill its session. Returns false when nothing to close. */
  close: (leafId?: string) => Promise<boolean>;
  resize: (splitId: string, sizes: number[]) => void;
}

/**
 * Owns one project's terminal split-tree: persists the layout in localStorage, reconciles it against
 * the live server sessions on mount, and exposes structural operations (create/split/close/resize)
 * that drive the matching tmux session lifecycle via the REST API.
 */
export function useTerminals(projectKey: string | null): UseTerminals {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [focusedLeafId, setFocusedLeafId] = useState<string | null>(null);
  const lastOrientationRef = useRef<SplitOrientation>(DEFAULT_ORIENTATION);

  // Persist on every structural change.
  const commit = useCallback(
    (next: TreeNode | null) => {
      setTree(next);
      if (projectKey) saveTree(projectKey, next);
    },
    [projectKey],
  );

  // Load the persisted layout and prune leaves whose session no longer lives (backend restart).
  useEffect(() => {
    if (!projectKey) {
      setTree(null);
      setFocusedLeafId(null);
      return;
    }
    let cancelled = false;
    const persisted = loadTree(projectKey);
    setTree(persisted);
    setFocusedLeafId(firstLeafId(persisted));
    void api.listTerminals(projectKey).then((live) => {
      if (cancelled) return;
      const liveIds = new Set(live.map((t) => t.id));
      const pruned = pruneToLive(persisted, liveIds);
      setTree(pruned);
      setFocusedLeafId((current) => (current && findLeaf(pruned, current) ? current : firstLeafId(pruned)));
      saveTree(projectKey, pruned);
    });
    return () => {
      cancelled = true;
    };
  }, [projectKey]);

  const addRoot = useCallback(async () => {
    if (!projectKey) return;
    try {
      const descriptor = await api.createTerminal(projectKey);
      const leaf = makeLeaf(descriptor.id);
      commit(leaf);
      setFocusedLeafId(leaf.id);
    } catch (error) {
      boardStore.notify("Terminal impossible", error instanceof Error ? error.message : "échec");
    }
  }, [projectKey, commit]);

  const split = useCallback(
    async (orientation: SplitOrientation, leafId?: string) => {
      if (!projectKey) return;
      const targetId = leafId ?? focusedLeafId;
      lastOrientationRef.current = orientation;
      if (!tree || !targetId) {
        await addRoot();
        return;
      }
      try {
        const descriptor = await api.createTerminal(projectKey);
        const leaf = makeLeaf(descriptor.id);
        commit(splitLeaf(tree, targetId, orientation, leaf));
        setFocusedLeafId(leaf.id);
      } catch (error) {
        boardStore.notify("Terminal impossible", error instanceof Error ? error.message : "échec");
      }
    },
    [projectKey, focusedLeafId, tree, commit, addRoot],
  );

  const newTerminal = useCallback(async () => {
    if (!tree || !focusedLeafId) {
      await addRoot();
      return;
    }
    await split(lastOrientationRef.current, focusedLeafId);
  }, [tree, focusedLeafId, addRoot, split]);

  const close = useCallback(
    async (leafId?: string): Promise<boolean> => {
      const targetId = leafId ?? focusedLeafId;
      if (!tree || !targetId) return false;
      const leaf = findLeaf(tree, targetId);
      const next = removeLeaf(tree, targetId);
      commit(next);
      setFocusedLeafId((current) => (current === targetId ? firstLeafId(next) : current));
      if (leaf) await api.deleteTerminal(leaf.terminalId).catch(() => undefined);
      return true;
    },
    [tree, focusedLeafId, commit],
  );

  const resize = useCallback(
    (splitId: string, sizes: number[]) => {
      if (!tree) return;
      commit(applySizes(tree, splitId, sizes));
    },
    [tree, commit],
  );

  return {
    tree,
    focusedLeafId,
    setFocusedLeafId,
    addRoot,
    split,
    newTerminal,
    close,
    resize,
  };
}

export { collectTerminalIds };
