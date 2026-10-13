import { ChevronDown, ChevronRight, ExternalLink, GitBranch, RotateCw } from "lucide-react";
import { useState, type ReactNode } from "react";

import type { ProjectInfo, WorktreeSession } from "@shared/schemas";

import { LiveTerminal } from "@/components/LiveTerminal";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm";
import { useBoard } from "@/hooks/useBoard";
import { api } from "@/lib/api";
import { boardStore } from "@/lib/store";
import { matchesQuery, normalizeSearch } from "@/lib/search";

interface WorktreeSessionsViewProps {
  projects: ProjectInfo[];
  projectFilter: string;
  searchQuery: string;
}

export function WorktreeSessionsView({ projects, projectFilter, searchQuery }: WorktreeSessionsViewProps): ReactNode {
  const { worktreeSessions } = useBoard();
  const [stopping, setStopping] = useState<number | null>(null);
  const [relaunching, setRelaunching] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<{ session: WorktreeSession; action: "stop" | "relaunch" } | null>(null);

  const labelFor = (key: string): string => projects.find((p) => p.key === key)?.label ?? key;
  const query = normalizeSearch(searchQuery);
  const visibleSessions = worktreeSessions.filter((session) => (projectFilter === "all" || session.project === projectFilter) && matchesQuery(query, session.branch, session.baseBranch, session.project, labelFor(session.project), session.sessionName, ...session.addresses.map((address) => `${address.label} ${address.url}`)));
  const scopeLabel = projectFilter === "all" ? "Tous les projets" : labelFor(projectFilter);
  const pendingStop = pendingAction?.action === "stop";
  let confirmationDescription: string | undefined;
  if (pendingAction !== null) {
    const consequence = pendingStop
      ? "La session est arrêtée, sa copie de travail isolée et sa branche locale sont supprimées. Les changements non enregistrés dans cette copie seront perdus."
      : "Le processus et son infrastructure sont redémarrés dans le même espace de travail. Sa branche et ses fichiers sont conservés.";
    confirmationDescription = `${labelFor(pendingAction.session.project)} · ${pendingAction.session.branch} · branche de départ ${pendingAction.session.baseBranch} · slot ${pendingAction.session.slotId}. ${consequence}`;
  }

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

  const relaunch = async (slotId: number): Promise<void> => {
    setRelaunching(slotId);
    try {
      await api.relaunchWorktreeSession(slotId);
    } catch (error) {
      boardStore.notify("Relance impossible", error instanceof Error ? error.message : "échec");
    } finally {
      setRelaunching(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      <header className="space-y-1"><h2 className="text-sm font-semibold">Espaces de travail · {visibleSessions.length}</h2><p className="text-xs text-muted-foreground">Sessions indépendantes dans des copies de travail isolées (worktrees).</p><p className="text-xs text-muted-foreground">{scopeLabel}{searchQuery.trim() && ` · Recherche : « ${searchQuery.trim()} »`} · {visibleSessions.length} sur {worktreeSessions.length} session(s)</p></header>
      {visibleSessions.length === 0 && <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-muted-foreground"><GitBranch className="h-8 w-8" /><p className="text-sm">Aucune session pour cette sélection.</p><p className="text-xs">Créez un espace de travail depuis le menu des outils.</p></div>}
      {visibleSessions.map((session) => {
        const isExpanded = expanded === session.slotId;
        return (
          <div key={session.slotId} className="rounded-md border bg-card">
            <div className="flex flex-col items-start justify-between gap-4 p-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => setExpanded((current) => (current === session.slotId ? null : session.slotId))}
                  className="flex min-w-0 items-center gap-2 text-left"
                  aria-expanded={isExpanded}
                  aria-controls={`worktree-terminal-${session.slotId}`}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-mono text-sm">{session.branch}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {labelFor(session.project)} · branche de départ {session.baseBranch} · slot {session.slotId} ·{" "}
                      {new Date(session.createdAt).toLocaleString()}
                    </p>
                  </div>
                </button>
                {session.addresses.length > 0 && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 pl-6">
                    {session.addresses.map((addr) => (
                      <a
                        key={addr.url}
                        href={addr.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span>{addr.label}</span>
                        <span className="font-mono">{addr.url}</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPendingAction({ session, action: "relaunch" })}
                  disabled={relaunching === session.slotId || stopping === session.slotId}
                >
                  <RotateCw className="h-4 w-4" />
                  Relancer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setPendingAction({ session, action: "stop" })}
                  disabled={stopping === session.slotId || relaunching === session.slotId}
                >
                  Arrêter
                </Button>
              </div>
            </div>
            {isExpanded && (
              <div id={`worktree-terminal-${session.slotId}`} className="border-t">
                <div className="p-3">
                  <dl className="mb-3 flex flex-wrap gap-x-6 gap-y-2 text-xs"><div><dt className="text-muted-foreground">Projet</dt><dd>{labelFor(session.project)}</dd></div><div><dt className="text-muted-foreground">Branche de départ</dt><dd className="font-mono">{session.baseBranch}</dd></div><div><dt className="text-muted-foreground">Session</dt><dd className="font-mono">{session.sessionName}</dd></div></dl>
                  <div className="h-[60vh]">
                    <LiveTerminal slotId={session.slotId} live fill />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingStop ? "Arrêter cet espace de travail" : "Relancer cette session"}
        description={confirmationDescription}
        confirmLabel={pendingStop ? "Arrêter" : "Relancer"}
        destructive={pendingStop}
        onCancel={() => setPendingAction(null)}
        onConfirm={async () => {
          if (pendingAction === null) return;
          const currentSession = worktreeSessions.find((session) => session.slotId === pendingAction.session.slotId);
          if (currentSession === undefined || currentSession.createdAt !== pendingAction.session.createdAt || currentSession.sessionName !== pendingAction.session.sessionName) {
            boardStore.notify("Session modifiée", "Vérifiez la session actuelle avant de relancer ou arrêter cet espace de travail.");
            return;
          }
          if (pendingStop) await stop(pendingAction.session.slotId);
          else await relaunch(pendingAction.session.slotId);
        }}
      />
    </div>
  );
}
