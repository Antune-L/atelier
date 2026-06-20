import { SquareTerminal } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { ProjectInfo } from "@shared/schemas";

import { SplitTree } from "@/components/terminals/SplitTree";
import { collectTerminalIds } from "@/components/terminals/tree";
import { Button } from "@/components/ui/button";
import { useTerminals } from "@/hooks/useTerminals";
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
 * (⌘T/⌘W/⌘D/⌘⇧D) are scoped to this view via a capture-phase listener on its container.
 */
export function TerminalsView({ projects, projectFilter }: TerminalsViewProps): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeProject, setActiveProject] = useState<string | null>(null);

  // Default the active tab to the global filter (when a single project) or the first project.
  useEffect(() => {
    if (activeProject && projects.some((p) => p.key === activeProject)) return;
    const seeded = projects.some((p) => p.key === projectFilter) ? projectFilter : projects[0]?.key ?? null;
    setActiveProject(seeded);
  }, [projects, projectFilter, activeProject]);

  const activeLabel = projects.find((p) => p.key === activeProject)?.label ?? "";
  const terminals = useTerminals(activeProject);
  const { tree, focusedLeafId, split, newTerminal, close, addRoot, resize, setFocusedLeafId } = terminals;

  // terminalId → "repoLabel · #n" (1-based, left-to-right order in the tree).
  const titleFor = useMemo(() => {
    const ids = collectTerminalIds(tree);
    const index = new Map(ids.map((id, i) => [id, i + 1]));
    return (terminalId: string): string => `${activeLabel} · #${index.get(terminalId) ?? "?"}`;
  }, [tree, activeLabel]);

  // Shortcuts are active only while this view is mounted; capture-phase + preventDefault keeps
  // them from reaching the app/browser (⌘W best-effort: the desktop intercepts it, a plain browser
  // tab may still close — documented limitation).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!event.metaKey) return;
      const key = event.key.toLowerCase();
      if (key === "t") {
        event.preventDefault();
        void newTerminal();
      } else if (key === "w") {
        event.preventDefault();
        void close();
      } else if (key === "d") {
        event.preventDefault();
        void split(event.shiftKey ? "column" : "row");
      }
    };
    container.addEventListener("keydown", onKeyDown, true);
    return () => container.removeEventListener("keydown", onKeyDown, true);
  }, [newTerminal, close, split]);

  return (
    <div ref={containerRef} className="flex h-full min-h-0 flex-col gap-3">
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
  );
}
