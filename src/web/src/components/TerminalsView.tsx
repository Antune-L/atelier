import { SquareTerminal } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import type { ProjectInfo } from "@shared/schemas";

import { QuitConfirmModal } from "@/components/QuitConfirmModal";
import { SplitTree } from "@/components/terminals/SplitTree";
import { collectTerminalIds } from "@/components/terminals/tree";
import { Button } from "@/components/ui/button";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useTerminalShortcuts } from "@/hooks/useTerminalShortcuts";
import { useTerminals } from "@/hooks/useTerminals";
import { api } from "@/lib/api";
import { boardStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface TerminalsViewProps {
  projects: ProjectInfo[];
  /** Current global project filter; seeds the default active tab when set. */
  projectFilter: string;
}

/**
 * The Terminals (CMUX) view: a tab per project, each a resizable split grid of interactive zsh cells
 * rooted at the project's repoPath. Tabs are independent workspaces; switching tabs unmounts the grid
 * but leaves the detached tmux sessions running (they re-seed on remount). Keyboard shortcuts
 * (⌘T/⌘W/⌘D/⌘⇧D) are handled globally while this view is mounted; ⌘W closes terminals, and a second
 * ⌘W with nothing left to close opens a quit confirmation (desktop).
 */
export function TerminalsView({ projects, projectFilter }: TerminalsViewProps): ReactNode {
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [quitOpen, setQuitOpen] = useState(false);
  const [quitPending, setQuitPending] = useState(false);
  const { canQuit } = useCapabilities();

  // Default the active tab to the global filter (when a single project) or the first project.
  useEffect(() => {
    if (activeProject && projects.some((p) => p.key === activeProject)) return;
    const seeded = projects.some((p) => p.key === projectFilter) ? projectFilter : projects[0]?.key ?? null;
    setActiveProject(seeded);
  }, [projects, projectFilter, activeProject]);

  const activeLabel = projects.find((p) => p.key === activeProject)?.label ?? "";
  const terminals = useTerminals(activeProject);
  const { tree, focusedLeafId, split, newTerminal, close, addRoot, resize, setFocusedLeafId } = terminals;

  const closeTerminal = useCallback(async (): Promise<boolean> => close(), [close]);

  const requestQuit = useCallback(() => {
    if (canQuit) setQuitOpen(true);
  }, [canQuit]);

  useTerminalShortcuts({
    newTerminal,
    split,
    closeTerminal,
    onRequestQuit: requestQuit,
  });

  const confirmQuit = useCallback(async () => {
    setQuitPending(true);
    try {
      await api.quitApp();
    } catch (error) {
      setQuitPending(false);
      boardStore.notify(
        "Impossible de quitter",
        error instanceof Error ? error.message : "échec",
      );
    }
  }, []);

  // terminalId → "repoLabel · #n" (1-based, left-to-right order in the tree).
  const titleFor = useMemo(() => {
    const ids = collectTerminalIds(tree);
    const index = new Map(ids.map((id, i) => [id, i + 1]));
    return (terminalId: string): string => `${activeLabel} · #${index.get(terminalId) ?? "?"}`;
  }, [tree, activeLabel]);

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b pb-2">
          {projects.map((project) => (
            <button
              key={project.key}
              type="button"
              onClick={() => setActiveProject(project.key)}
              aria-pressed={activeProject === project.key}
              className={cn(
                "shrink-0 rounded px-3 py-1 text-xs font-medium transition-colors",
                activeProject === project.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {project.label}
            </button>
          ))}
        </div>

        <div className="flex min-h-0 flex-1">
          {tree ? (
            <SplitTree
              node={tree}
              titleFor={titleFor}
              focusedLeafId={focusedLeafId}
              onFocusLeaf={setFocusedLeafId}
              onCloseLeaf={(leafId) => void close(leafId)}
              onSplitLeaf={(leafId, orientation) => void split(orientation, leafId)}
              onResize={resize}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
              <SquareTerminal className="h-8 w-8" />
              <p className="text-sm">Aucun terminal ouvert pour ce projet.</p>
              <Button onClick={() => void addRoot()} disabled={!activeProject}>
                <SquareTerminal className="h-4 w-4" />
                Nouveau terminal
              </Button>
              <p className="text-[11px]">Raccourci : ⌘T</p>
            </div>
          )}
        </div>
      </div>

      <QuitConfirmModal
        open={quitOpen}
        onClose={() => setQuitOpen(false)}
        onConfirm={() => void confirmQuit()}
        confirming={quitPending}
      />
    </>
  );
}
