import {
  Check,
  FlaskConical,
  GitMerge,
  GitPullRequest,
  MoreHorizontal,
  Rocket,
  RotateCw,
  Split,
  Square,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { ACTIVE_STAGES, PR_STATE_LABELS, SPLIT_BRANCH_PREFIX } from "@shared/constants";
import type { Ticket } from "@shared/schemas";
import { canMergePr, canResolveConflicts, canUpdateDependencyBase } from "@shared/ticketMerge";

import { LaunchSplitButton } from "@/components/ticket-detail/LaunchSplitButton";
import { Button } from "@/components/ui/button";
import {
  CONFIRM_POPOVER_CLASSES,
  ConfirmBody,
  ConfirmDialog,
  ConfirmPopover,
} from "@/components/ui/confirm";
import { Popover, PopoverContent, PopoverMenuItem, PopoverTrigger } from "@/components/ui/popover";
import { useCapabilities } from "@/hooks/useCapabilities";
import { api } from "@/lib/api";
import { canRecoverImplementation } from "@/lib/implementationRecovery";
import { formatScheduleDate, formatScheduleTime } from "@/lib/scheduledLaunch";
import { boardStore } from "@/lib/store";

interface ConfirmSpec {
  title: string;
  description: string;
  confirmLabel: string;
  /** Irreversible: use the centered dialog instead of the anchored popover. */
  dialog?: boolean;
}

interface TicketAction {
  id: string;
  label: string;
  Icon?: LucideIcon;
  title?: string;
  disabled?: boolean;
  destructive?: boolean;
  confirm?: ConfirmSpec;
  run: () => Promise<void>;
}

interface TicketActionsProps {
  ticket: Ticket;
  onRefresh: () => void;
  onClose: () => void;
  onError: (message: string) => void;
  onRecovery: () => void;
}

const RETRY_STAGES: Ticket["stage"][] = ["failed", "interrupted", "stalled"];
const IMPLEMENT_ACTION_ID = "implement";


/**
 * The ticket's action block: the first applicable action as a primary button, the rest behind an
 * « Actions ⋯ » popover menu. Visibility conditions mirror the board's own rules per column/stage.
 */
export function TicketActions({ ticket, onRefresh, onClose, onError, onRecovery }: TicketActionsProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState<TicketAction | null>(null);
  const [conflictTicketId, setConflictTicketId] = useState<string | null>(null);
  const { prOnly } = useCapabilities();

  const hasConflicts = conflictTicketId === ticket.id;
  const actions = buildActions(ticket, {
    prOnly,
    onRefresh,
    onClose,
    onError,
    onRecovery,
    hasConflicts,
    onConflicts: () => setConflictTicketId(ticket.id),
  });
  const dependencyReason = ticket.dependencyStatus?.reason;
  const dependencyManualCommand = ticket.dependencyStatus?.manualCommand;
  if (actions.length === 0 && !dependencyReason && !dependencyManualCommand) return null;

  // A destructive action is never the primary button: it stays behind the menu.
  const primary = actions.find((action) => action.destructive !== true) ?? null;
  const rest = actions.filter((action) => action !== primary);

  const runAction = async (action: TicketAction): Promise<void> => {
    setBusyId(action.id);
    try {
      await action.run();
    } finally {
      setBusyId(null);
    }
  };

  const trigger = (action: TicketAction): void => {
    setMenuOpen(false);
    if (action.confirm === undefined) {
      void runAction(action);
      return;
    }
    setPending(action);
  };

  const confirmPending = (): Promise<void> => {
    if (pending === null) return Promise.resolve();
    const action = pending;
    setPending(null);
    return runAction(action);
  };

  const pendingDialog = pending !== null && pending.confirm?.dialog === true;
  // A confirmation opened from the « Actions » menu replaces the menu list inside the same popover,
  // so it stays anchored to the trigger without a second layer.
  const menuConfirm =
    pending !== null && pending.id !== primary?.id && !pendingDialog ? pending.confirm : undefined;

  const renderPrimary = (action: TicketAction): ReactNode => {
    if (action.id === IMPLEMENT_ACTION_ID && ticket.kind === "feature" && action.confirm !== undefined) {
      return (
        <LaunchSplitButton
          ticket={ticket}
          label={action.label}
          Icon={action.Icon}
          title={action.title}
          confirm={action.confirm}
          startDisabled={action.disabled === true}
          busy={busyId !== null}
          onStart={() => runAction(action)}
          onError={onError}
        />
      );
    }
    const button = (
      <Button
        size="sm"
        className="w-full"
        title={action.title}
        disabled={action.disabled === true || busyId !== null}
        onClick={() => trigger(action)}
      >
        {action.Icon !== undefined && <action.Icon className="h-3.5 w-3.5" />}
        {action.label}
      </Button>
    );
    if (action.confirm === undefined || pending?.id !== action.id || pendingDialog) return button;
    return (
      <ConfirmPopover
        open
        onOpenChange={(next) => {
          if (!next) setPending(null);
        }}
        title={action.confirm.title}
        description={action.confirm.description}
        confirmLabel={action.confirm.confirmLabel}
        onConfirm={confirmPending}
      >
        {button}
      </ConfirmPopover>
    );
  };

  return (
    <div className="space-y-2">
      {dependencyReason && <p className="text-sm text-warning">{dependencyReason}</p>}
      {dependencyManualCommand && (
        <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-muted p-2 text-xs"><code>{dependencyManualCommand}</code></pre>
      )}
      {hasConflicts && (
        <p className="text-sm text-warning">
          Conflits détectés avec la branche de base : la PR ne peut pas être mergée.
        </p>
      )}
      {primary !== null && renderPrimary(primary)}

      {rest.length > 0 && (
        <Popover
          open={menuOpen || menuConfirm !== undefined}
          onOpenChange={(next) => {
            setMenuOpen(next);
            if (!next) setPending(null);
          }}
        >
          <PopoverTrigger>
            <Button size="sm" variant="outline" className="w-full" disabled={busyId !== null}>
              <MoreHorizontal className="h-3.5 w-3.5" />
              Actions
            </Button>
          </PopoverTrigger>
          <PopoverContent className={menuConfirm === undefined ? "w-56" : CONFIRM_POPOVER_CLASSES}>
            {menuConfirm === undefined ? (
              rest.map((action) => (
                <PopoverMenuItem
                  key={action.id}
                  destructive={action.destructive === true}
                  title={action.title}
                  disabled={action.disabled === true}
                  onClick={() => trigger(action)}
                >
                  {action.Icon !== undefined && <action.Icon className="h-3.5 w-3.5" />}
                  {action.label}
                </PopoverMenuItem>
              ))
            ) : (
              <ConfirmBody
                title={menuConfirm.title}
                description={menuConfirm.description}
                confirmLabel={menuConfirm.confirmLabel}
                destructive={pending?.destructive === true}
                onConfirm={confirmPending}
                onDismiss={() => setPending(null)}
              />
            )}
          </PopoverContent>
        </Popover>
      )}

      {pending !== null && pending.confirm !== undefined && pendingDialog && (
        <ConfirmDialog
          open
          title={pending.confirm.title}
          description={pending.confirm.description}
          confirmLabel={pending.confirm.confirmLabel}
          destructive={pending.destructive === true}
          onCancel={() => setPending(null)}
          onConfirm={confirmPending}
        />
      )}
    </div>
  );
}

interface ActionContext {
  /** Cloud host: no automatic merge after a conflict resolution, the user merges by hand. */
  prOnly: boolean;
  onRefresh: () => void;
  onClose: () => void;
  onError: (message: string) => void;
  onRecovery: () => void;
  hasConflicts: boolean;
  onConflicts: () => void;
}

const RESOLVE_CONFLICTS_FAILED_TITLE =
  "Lancer une session Opus (effort bas) qui rebase la branche, résout les conflits et repousse la PR pour relancer le merge auto";
const RESOLVE_CONFLICTS_DONE_TITLE =
  "Lancer une session Opus (effort bas) qui rebase la branche, résout les conflits, repousse la PR puis relance le merge";
const RESOLVE_CONFLICTS_PR_ONLY_TITLE =
  "Lancer une session Opus (effort bas) qui rebase la branche, résout les conflits et repousse la PR, à merger ensuite à la main";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function buildActions(ticket: Ticket, ctx: ActionContext): TicketAction[] {
  const actions: TicketAction[] = [];
  const recovering = canRecoverImplementation(ticket) && Boolean(ticket.implementationPlan?.recovery);

  if (canRecoverImplementation(ticket)) {
    actions.push({
      id: "implementation-recovery",
      label: recovering ? "Suivre la reprise" : "Reprendre les lots",
      Icon: RotateCw,
      run: async () => ctx.onRecovery(),
    });
  }

  if (ticket.column === "todo") {
    const scheduledAt = ticket.scheduledStartAt;
    actions.push({
      id: IMPLEMENT_ACTION_ID,
      label: scheduledAt === null ? "Lancer l'implémentation" : "Lancer maintenant",
      Icon: Rocket,
      disabled: ticket.triageStatus === "running",
      confirm: {
        title: scheduledAt === null ? "Lancer l'implémentation" : "Lancer maintenant",
        description:
          scheduledAt === null
            ? "L'agent d'implémentation va être lancé sur cette carte et occupera un slot."
            : `L'agent d'implémentation va être lancé maintenant et occupera un slot. Le lancement programmé du ${formatScheduleDate(scheduledAt)} à ${formatScheduleTime(scheduledAt)} sera annulé.`,
        confirmLabel: "Lancer",
      },
      run: async () => {
        try {
          await api.moveTicket(ticket.id, "implementing");
        } catch (error) {
          ctx.onError(errorMessage(error, "Déplacement refusé"));
        }
      },
    });
  }

  if (canUpdateDependencyBase(ticket)) {
    actions.push({
      id: "update-base",
      label: "Mettre à jour la base",
      Icon: RotateCw,
      title: "Rebaser la branche sur la base actuelle sans merger la PR",
      confirm: {
        title: "Mettre à jour la base",
        description: "La branche sera rebasée sur sa nouvelle base puis repoussée avec protection contre les modifications concurrentes. La PR restera ouverte.",
        confirmLabel: "Mettre à jour",
      },
      run: async () => {
        try {
          const result = await api.updateDependencyBase(ticket.id);
          if (!result.ok) ctx.onError(result.reason);
          ctx.onRefresh();
        } catch (error) {
          ctx.onError(errorMessage(error, "Mise à jour de la base refusée"));
        }
      },
    });
  }

  const resolveConflictsAction: TicketAction | null = canResolveConflicts(ticket)
    ? {
      id: "resolve-conflicts",
      label: "Résoudre les conflits",
      Icon: GitMerge,
      title: ctx.prOnly
        ? RESOLVE_CONFLICTS_PR_ONLY_TITLE
        : ticket.column === "done" ? RESOLVE_CONFLICTS_DONE_TITLE : RESOLVE_CONFLICTS_FAILED_TITLE,
      run: async () => {
        try {
          await api.resolveConflicts(ticket.id);
          ctx.onRefresh();
        } catch (error) {
          ctx.onError(errorMessage(error, "Résolution des conflits refusée"));
        }
      },
    }
    : null;
  const resolveConflictsFirst = resolveConflictsAction !== null && (ticket.column !== "done" || ctx.hasConflicts);
  if (resolveConflictsFirst) actions.push(resolveConflictsAction);

  // A retry on an already-pushed PR would re-spawn a session for an existing PR: hide it there.
  const canRetry =
    !recovering &&
    ticket.stage !== null &&
    RETRY_STAGES.includes(ticket.stage) &&
    !(ticket.slotId === null && ticket.prUrl !== null);
  if (canRetry) {
    actions.push({
      id: "retry",
      label: "Relancer",
      run: async () => {
        await api.retry(ticket.id);
        ctx.onRefresh();
      },
    });
  }

  // Escape hatch for a stuck running card: the session spawned but its contract never landed.
  const canRelaunch =
    !recovering &&
    ticket.column === "implementing" &&
    ticket.slotId !== null &&
    ticket.stage !== null &&
    ACTIVE_STAGES.includes(ticket.stage);
  if (canRelaunch) {
    actions.push({
      id: "relaunch",
      label: "Relancer la session",
      Icon: RotateCw,
      title: "Tuer la session et la relancer dans le même slot (réenvoie l'instruction)",
      confirm: {
        title: "Relancer la session",
        description:
          "La session en cours est tuée et relancée dans le même slot, et l'instruction est renvoyée. Le travail non commité sera perdu.",
        confirmLabel: "Relancer",
      },
      run: async () => {
        try {
          await api.relaunch(ticket.id);
          ctx.onRefresh();
        } catch {
          // Lost a race with an in-flight launch; the board reflects the real state via WS.
        }
      },
    });
  }

  if (ticket.column === "to_review" && ticket.stealth && ticket.slotId !== null) {
    actions.push({
      id: "create-pr",
      label: "Créer la PR",
      Icon: GitPullRequest,
      title: "Ouvrir la PR depuis la branche poussée, libérer le slot et passer la carte en Fini",
      run: async () => {
        try {
          await api.createStealthPr(ticket.id);
          ctx.onRefresh();
        } catch (error) {
          boardStore.notify("Création de PR échouée", errorMessage(error, "Erreur"));
        }
      },
    });
  }

  const isFinishedFeature = ticket.column === "done" && ticket.kind === "feature";
  const isProcessing = ticket.stage === "awaiting_answers" || (ticket.stage !== null && ACTIVE_STAGES.includes(ticket.stage));
  if (isFinishedFeature) {
    if (canMergePr(ticket) && !ctx.hasConflicts) {
      actions.push({
        id: "merge",
        label: "Merger la PR",
        Icon: GitMerge,
        confirm: {
          title: "Merger la PR",
          description: "La PR sera mergée dans la branche de base et la carte archivée.",
          confirmLabel: "Merger",
        },
        run: async () => {
          try {
            const result = await api.mergePr(ticket.id);
            if (result.merged) {
              ctx.onClose();
              return;
            }
            if (result.conflicts) ctx.onConflicts();
            ctx.onError(result.reason ?? "Merge de la PR échoué");
          } catch (error) {
            ctx.onError(errorMessage(error, "Merge de la PR échoué"));
          }
        },
      });
    }
    if (resolveConflictsAction !== null && !resolveConflictsFirst) actions.push(resolveConflictsAction);
  }
  if (isFinishedFeature && !isProcessing) {
    actions.push({
      id: "check-merge",
      label: "Vérifier le merge",
      Icon: GitMerge,
      run: async () => {
        try {
          const result = await api.checkMerged(ticket.id);
          if (result.merged) {
            ctx.onClose();
            return;
          }
          ctx.onError(`PR non mergée (état : ${PR_STATE_LABELS[result.state] || "inconnu"})`);
        } catch (error) {
          ctx.onError(errorMessage(error, "Vérification du merge échouée"));
        }
      },
    });
    actions.push({
      id: "mark-merged",
      label: "PR mergée",
      Icon: Check,
      confirm: {
        title: "Marquer la PR comme mergée",
        description: "La carte sera archivée et le worktree/branche nettoyés.",
        confirmLabel: "PR mergée",
      },
      run: async () => {
        try {
          await api.markMerged(ticket.id);
          ctx.onClose();
        } catch (error) {
          ctx.onError(errorMessage(error, "Marquage de la PR échoué"));
        }
      },
    });
  }

  // A split mother lands in "done" with only an empty integration branch: nothing to test there.
  const canStartTest =
    ticket.column === "done" &&
    ticket.kind === "feature" &&
    ticket.branch !== null &&
    !ticket.branch.startsWith(SPLIT_BRANCH_PREFIX) &&
    ticket.slotId === null &&
    !ticket.testing;
  if (canStartTest) {
    actions.push({
      id: "start-test",
      label: "Tester la feature",
      Icon: FlaskConical,
      title:
        "Recréer un worktree sur la branche de la feature et lancer une session interactive pour la tester (sans PR ni gate)",
      run: async () => {
        await api.startTest(ticket.id);
        ctx.onRefresh();
      },
    });
  }

  if (ticket.testing) {
    actions.push({
      id: "stop-test",
      label: "Arrêter le test",
      Icon: Square,
      title: "Arrêter la session de test : tue la session, retire le worktree et libère le slot",
      run: async () => {
        await api.stopTest(ticket.id);
        ctx.onRefresh();
      },
    });
  }

  // In PRD the split sub-agent needs the PRD markdown as context: shown but disabled without one.
  const canSplit = ticket.kind === "feature" && (ticket.column === "todo" || ticket.column === "prd");
  if (canSplit) {
    actions.push({
      id: "split",
      label: "Découper en sous-tickets",
      Icon: Split,
      title: "Découper le ticket en plusieurs sous-tickets via un sous-agent dédié (lecture seule)",
      disabled: ticket.column === "prd" && ticket.prdMarkdown === null,
      run: async () => {
        try {
          await api.split(ticket.id);
          boardStore.notify("Ticket découpé", "Les sous-tickets ont été créés.");
          ctx.onClose();
        } catch (error) {
          boardStore.notify("Découpage échoué", errorMessage(error, "Erreur"));
        }
      },
    });
  }

  if (ticket.column !== "abandoned") {
    actions.push({
      id: "abandon",
      label: "Abandonner",
      destructive: true,
      confirm: {
        title: "Abandonner le ticket",
        description:
          "Action destructive : la session est tuée, le worktree et la branche locale sont supprimés.",
        confirmLabel: "Abandonner",
      },
      run: async () => {
        await api.moveTicket(ticket.id, "abandoned", true);
        ctx.onClose();
      },
    });
  }

  if (ticket.slotId === null) {
    actions.push({
      id: "delete",
      label: "Supprimer",
      destructive: true,
      confirm: {
        title: "Supprimer le ticket",
        description: "Suppression définitive du ticket et de ses commentaires. Action irréversible.",
        confirmLabel: "Supprimer",
        dialog: true,
      },
      run: async () => {
        await api.deleteTicket(ticket.id);
        ctx.onClose();
      },
    });
  }

  return actions;
}
