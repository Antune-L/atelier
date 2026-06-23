import { GitBranch } from "lucide-react";
import { useState, type ReactNode } from "react";

import type { ProjectInfo } from "@shared/schemas";

import { Button } from "@/components/ui/button";
import { useBoard } from "@/hooks/useBoard";
import { api } from "@/lib/api";
import { boardStore } from "@/lib/store";

interface WorktreeSessionsViewProps {
  projects: ProjectInfo[];
}

/**
 * Lists the active standalone (ticket-less) worktree sessions: project, fresh branch, base branch and
 * creation time, each with a Stop button that tears the session down and frees its slot.
 */
export function WorktreeSessionsView({ projects }: WorktreeSessionsViewProps): ReactNode {
  const { worktreeSessions } = useBoard();
  const [stopping, setStopping] = useState<number | null>(null);

  const labelFor = (key: string): string => projects.find((p) => p.key === key)?.label ?? key;

  const stop = async (slotId: number): Promise<void> => {
    setStopping(slotId);
    try {
      await api.stopWorktreeSession(slotId);
    } catch (error) {
      boardStore.notify("Arrêt impossible", error instanceof Error ? error.message : "échec");
    } finally {
      setStopping(null);
    }
  };

  if (worktreeSessions.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <GitBranch className="h-8 w-8" />
        <p className="text-sm">Aucune session worktree active.</p>
        <p className="text-[11px]">Lance-en une depuis l'onglet « Worktree » du bouton +.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-y-auto">
      {worktreeSessions.map((session) => (
        <div
          key={session.slotId}
          className="flex items-center justify-between gap-4 rounded-md border bg-card p-3"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-mono text-sm">{session.branch}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {labelFor(session.project)} · base {session.baseBranch} · slot {session.slotId} ·{" "}
              {new Date(session.createdAt).toLocaleString()}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => void stop(session.slotId)}
            disabled={stopping === session.slotId}
          >
            Stop
          </Button>
        </div>
      ))}
    </div>
  );
}
