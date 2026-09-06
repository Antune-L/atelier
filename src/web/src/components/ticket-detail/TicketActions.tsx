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
import { useState } from "react";

import { ACTIVE_STAGES, SPLIT_BRANCH_PREFIX } from "@shared/constants";
import type { Ticket } from "@shared/schemas";

import { Button } from "@/components/ui/button";
import {
  CONFIRM_POPOVER_CLASSES,
  ConfirmBody,
  ConfirmDialog,
  ConfirmPopover,
} from "@/components/ui/confirm";
import { Popover, PopoverContent, PopoverMenuItem, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api";
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
}

const RETRY_STAGES: Ticket["stage"][] = ["failed", "interrupted", "stalled"];


/**
 * The ticket's action block: the first applicable action as a primary button, the rest behind an
 * « Actions ⋯ » popover menu. Visibility conditions mirror the board's own rules per column/stage.
 */
export function TicketActions({ ticket, onRefresh, onClose, onError }: TicketActionsProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, setPending] = useState<TicketAction | null>(null);

  const actions = buildActions(ticket, { onRefresh, onClose, onError });
  if (actions.length === 0) return null;

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

  const primaryButton =
    primary === null ? null : (
      <Button
        size="sm"
        className="w-full"
        title={primary.title}
        disabled={primary.disabled === true || busyId !== null}
        onClick={() => trigger(primary)}
      >
        {primary.Icon !== undefined && <primary.Icon className="h-3.5 w-3.5" />}
        {primary.label}
      </Button>
    );

  return (
    <div className="space-y-2">
      {primary?.confirm !== undefined && pending?.id === primary.id && !pendingDialog ? (
        <ConfirmPopover
          open
          onOpenChange={(next) => {
            if (!next) setPending(null);
          }}
          title={primary.confirm.title}
          description={primary.confirm.description}
          confirmLabel={primary.confirm.confirmLabel}
          onConfirm={confirmPending}
        >
          {primaryButton}
        </ConfirmPopover>
      ) : (
        primaryButton
      )}

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
  onRefresh: () => void;
  onClose: () => void;
  onError: (message: string) => void;
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function buildActions(ticket: Ticket, ctx: ActionContext): TicketAction[] {
  const actions: TicketAction[] = [];

  if (ticket.column === "todo") {
    actions.push({
      id: "implement",
      label: "Lancer l'implémentation",
      Icon: Rocket,
      disabled: ticket.triageStatus === "running",
      confirm: {
        title: "Lancer l'implémentation",
        description: "L'agent d'implémentation va être lancé sur cette carte et occupera un slot.",
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

  // Auto-merge failed after the PR was opened: a one-click session rebases, resolves and re-pushes.
  const canResolveConflicts =
    ticket.column === "failed" &&
    ticket.autoMerge &&
    ticket.kind !== "review" &&
    ticket.slotId === null &&
    ticket.prUrl !== null &&
    ticket.branch !== null;
  if (canResolveConflicts) {
    actions.push({
      id: "resolve-conflicts",
      label: "Résoudre les conflits",
      Icon: GitMerge,
      title:
        "Lancer une session Opus (effort bas) qui rebase la branche, résout les conflits et repousse la PR pour relancer le merge auto",
      run: async () => {
        await api.resolveConflicts(ticket.id);
        ctx.onRefresh();
      },
    });
  }

  // A retry on an already-pushed PR would re-spawn a session for an existing PR: hide it there.
  const canRetry =
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
  if (isFinishedFeature) {
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
          ctx.onError(`PR non mergée (état : ${result.state || "inconnu"})`);
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
        await api.markMerged(ticket.id);
        ctx.onClose();
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
