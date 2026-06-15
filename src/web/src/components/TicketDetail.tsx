import { Brush, Cpu, Eye, GitMerge, HelpCircle, Maximize2, PanelRightClose, PanelRightOpen, Rocket, RotateCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type {
  Comment,
  ProjectInfo,
  Ticket,
  TriageResult,
} from "@shared/schemas";
import { TRIAGE_VERDICT_LABELS, columnSchema, triageResultSchema } from "@shared/schemas";
import {
  ACTIVE_STAGES,
  AGENT_EFFORT_LABELS,
  AGENT_MODEL_LABELS,
  COLUMN_LABELS,
  COLUMN_ORDER,
  TERMINAL_STAGES,
  type AgentEffort,
  type AgentModel,
  type Column,
  type Implementer,
} from "@shared/constants";
import { extractFigmaUrls } from "@shared/figma";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Markdown } from "@/components/ui/markdown";
import {
  Modal,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { PrdReviewDialog } from "@/components/PrdReviewDialog";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AgentProfileConfig } from "@/components/AgentProfileConfig";
import { TicketConfigSummary } from "@/components/TicketConfigSummary";
import { LiveTerminal } from "@/components/LiveTerminal";
import {
  finishedKindLabel,
  formatDateTime,
  isStageAnimated,
  stageLabel,
  stageVariant,
  triageVerdictVariant,
} from "@/lib/display";
import { api } from "@/lib/api";
import { boardStore } from "@/lib/store";
import { handleMediaPaste } from "@/lib/paste";
import { cn } from "@/lib/utils";
import { resolveProjectLabel } from "@/components/TicketCard";

const TERMINAL_VISIBLE_KEY = "ticket-terminal-visible";

function parseTriageReport(report: string | null): TriageResult | null {
  if (!report) return null;
  try {
    const parsed = triageResultSchema.safeParse(JSON.parse(report));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Union comments by id (incoming wins) and keep them chronological. Shared by the initial fetch
 * and the live WS stream so a comment pushed during the fetch window is neither clobbered by the
 * full-list response nor shown out of order.
 */
function mergeComments(existing: Comment[], incoming: Comment[]): Comment[] {
  const byId = new Map(existing.map((c) => [c.id, c]));
  for (const c of incoming) byId.set(c.id, c);
  return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt);
}

interface TicketDetailProps {
  ticket: Ticket | null;
  projects: ProjectInfo[];
  onClose: () => void;
}

function isLocked(ticket: Ticket): boolean {
  if (ticket.stage === null) return false;
  if (ticket.stage === "awaiting_answers") return true;
  return ACTIVE_STAGES.includes(ticket.stage);
}

export function TicketDetail({ ticket, projects, onClose }: TicketDetailProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [reply, setReply] = useState<Record<string, string>>({});
  const [newComment, setNewComment] = useState("");
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [confirmMerged, setConfirmMerged] = useState(false);
  const [confirmImplement, setConfirmImplement] = useState(false);
  const [confirmRelaunch, setConfirmRelaunch] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [terminalVisible, setTerminalVisible] = useState(() => localStorage.getItem(TERMINAL_VISIBLE_KEY) !== "0");
  const [prdDialogOpen, setPrdDialogOpen] = useState(false);
  // Base-branch picker state (TODO column only). null = remote list not loaded yet.
  const [branches, setBranches] = useState<string[] | null>(null);
  const [branchesKey, setBranchesKey] = useState<string | null>(null);
  // Tracks the latest requested project so an out-of-order branch fetch is dropped.
  const latestBranchKey = useRef<string | null>(null);

  // Load comments when a new ticket is opened (render-phase guard, no useEffect).
  // Ticket fields come from the prop: App keeps it fresh via WS pushes.
  const load = useCallback(async (id: string) => {
    const data = await api.ticketDetail(id);
    // Merge (not replace): a comment pushed over WS during this fetch would otherwise be dropped.
    setComments((prev) => mergeComments(prev, data.comments));
  }, []);

  // Live comments: the initial list is loaded once per ticket, but the agent (and any other
  // client) keeps posting over the board WS while the drawer stays open. Merge pushed comments
  // so the user sees them without a refresh — deduped by id and kept in chronological order.
  const openTicketId = ticket?.id ?? null;
  useEffect(() => {
    if (openTicketId === null) return;
    return boardStore.subscribeComments((incoming) => {
      if (incoming.ticketId !== openTicketId) return;
      setComments((prev) => mergeComments(prev, [incoming]));
    });
  }, [openTicketId]);

  if (ticket && ticket.id !== loadedId) {
    setLoadedId(ticket.id);
    setEditing(false);
    setEditError(null);
    // Drop the previous ticket's comments before the merge-based load so they don't bleed across.
    setComments([]);
    void load(ticket.id);
  }
  if (!ticket && loadedId !== null) {
    setLoadedId(null);
    setComments([]);
    setReply({});
    setNewComment("");
    setEditing(false);
    setEditError(null);
  }

  if (!ticket) return null;
  const current = ticket;
  const locked = isLocked(current);
  // Per-kind terminal lanes: "merged" for feature PRs, "reviewed" for reviews, "answered" for asks.
  const statusOptions = COLUMN_ORDER.filter((col) => {
    if (col === "merged") return current.kind === "feature";
    if (col === "reviewed") return current.kind === "review" || current.kind === "clean";
    if (col === "answered") return current.kind === "ask";
    return true;
  });
  const showTerminal =
    current.slotId !== null &&
    current.stage !== null &&
    current.stage !== "done";
  const terminalPaneVisible = showTerminal && terminalVisible;
  // The pane WebSocket can land before tmux is spawned (queued/setup window); while the session is
  // expected to be live the terminal retries rather than freezing on the first "session terminée".
  const sessionLive = current.stage !== null && !TERMINAL_STAGES.includes(current.stage);
  // A "todo" card carries config sections (agent, PR options, feasibility) and
  // never has a terminal: lay it out on two columns so it breathes.
  const isTodoSplit = current.column === "todo";
  const ticketProject = projects.find((p) => p.key === current.project);
  const projectDefaultBranch = ticketProject?.baseBranch ?? "";
  // Editing the base branch is only meaningful before launch (TODO) and while unlocked.
  const canEditBaseBranch = isTodoSplit && !locked;

  // Load the project's branches for the base-branch picker once per ticket project,
  // mirroring NewTicketDialog's no-useEffect load-on-render pattern.
  if (canEditBaseBranch && current.project !== branchesKey) {
    const key = current.project;
    latestBranchKey.current = key;
    setBranchesKey(key);
    setBranches(null);
    void api
      .projectBranches(key)
      // Ignore a stale response if the open ticket's project changed before it resolved.
      .then((list) => latestBranchKey.current === key && setBranches(list))
      .catch(() => latestBranchKey.current === key && setBranches([]));
  }

  // Current selection resolves null (no override) to the project default for display.
  const selectedBaseBranch = current.baseBranch ?? projectDefaultBranch;
  // The project default and the saved selection are always selectable, even while the
  // remote list loads/fails or when the stored override no longer exists upstream.
  const baseBranchOptions = (() => {
    const list = branches ?? [];
    const pinned = [projectDefaultBranch, selectedBaseBranch].filter(
      (b) => b && !list.includes(b),
    );
    return [...new Set([...pinned, ...list])];
  })();

  // Send null when the choice matches the project default → keep "no override" semantics.
  const changeBaseBranch = (value: string): void => {
    const override = value && value !== projectDefaultBranch ? value : null;
    void api.updateTicket(current.id, { baseBranch: override }).catch(() => undefined);
  };
  // Escape hatch for a stuck "À implémenter" card: the session spawned but its
  // contract/instruction never landed. Only while actively running — terminal
  // (failed/interrupted/stalled) states already have the "Relancer" button below.
  const canRelaunch =
    current.column === "implementing" &&
    current.slotId !== null &&
    current.stage !== null &&
    ACTIVE_STAGES.includes(current.stage);
  // Auto-merge failed after the PR was opened: offer a one-click opus-low session that rebases the
  // branch, resolves the conflicts, force-pushes, and re-triggers the auto-merge.
  const canResolveConflicts =
    current.column === "failed" &&
    current.autoMerge &&
    current.kind !== "review" &&
    current.slotId === null &&
    current.prUrl !== null &&
    current.branch !== null;

  // Escape must not silently discard uncommitted comment/answer/edit text.
  const editDirty =
    editing &&
    (editTitle !== current.title || editDescription !== current.description);
  const hasUncommittedText =
    newComment.trim().length > 0 ||
    Object.values(reply).some((v) => v.trim().length > 0) ||
    editDirty;

  const refresh = (): void => void load(ticket.id);

  const toggleTerminal = (): void => {
    const next = !terminalVisible;
    setTerminalVisible(next);
    localStorage.setItem(TERMINAL_VISIBLE_KEY, next ? "1" : "0");
  };

  // Agent model/effort are picked before launch (TODO column) and stored on the ticket;
  // the spawn reads them, falling back to the server config when null.
  const setAgentModel = (model: AgentModel | null): void => {
    void api.updateTicket(current.id, { model }).catch(() => undefined);
  };

  const setAgentEffort = (effort: AgentEffort | null): void => {
    void api.updateTicket(current.id, { effort }).catch(() => undefined);
  };

  const setImplementerModel = (implementerModel: AgentModel | null): void => {
    void api.updateTicket(current.id, { implementerModel }).catch(() => undefined);
  };

  const setImplementerEffort = (implementerEffort: AgentEffort | null): void => {
    void api.updateTicket(current.id, { implementerEffort }).catch(() => undefined);
  };

  const setImplementer = (implementer: Implementer): void => {
    void api.updateTicket(current.id, { implementer }).catch(() => undefined);
  };

  // Apply a whole profile in a single PATCH so the knobs never land in an intermediate state.
  const applyProfile = (config: {
    model: AgentModel;
    effort: AgentEffort;
    implementerModel: AgentModel;
    implementerEffort: AgentEffort;
    implementer: Implementer;
  }): void => {
    void api.updateTicket(current.id, config).catch(() => undefined);
  };

  const moveTo = async (target: Column): Promise<void> => {
    try {
      await api.moveTicket(current.id, target);
    } catch (e) {
      setMoveError(e instanceof Error ? e.message : "Déplacement refusé");
    }
  };

  // Manual status change from the detail drawer. Honors the same lock rule as the board
  // but is stricter: side-effecting/destructive targets go through a confirm dialog (abandon
  // kills the session, merged archives, implementing (re)launches the agent); rest move directly.
  const changeStatus = (target: Column): void => {
    if (target === current.column) return;
    if (target === "abandoned") {
      setConfirmAbandon(true);
      return;
    }
    if (target === "merged") {
      setConfirmMerged(true);
      return;
    }
    if (target === "implementing") {
      setConfirmImplement(true);
      return;
    }
    void moveTo(target);
  };

  const setPrdEnabled = (checked: boolean): void => {
    void api.updateTicket(current.id, { prdEnabled: checked }).catch(() => undefined);
  };

  const setPrDraft = (checked: boolean): void => {
    void api.updateTicket(current.id, { prDraft: checked }).catch(() => undefined);
  };

  const setAutoMerge = (checked: boolean): void => {
    void api.updateTicket(current.id, { autoMerge: checked }).catch(() => undefined);
  };

  const setVerifyFeature = (checked: boolean): void => {
    void api.updateTicket(current.id, { verifyFeature: checked }).catch(() => undefined);
  };

  const setResearchPlan = (checked: boolean): void => {
    void api.updateTicket(current.id, { researchPlan: checked }).catch(() => undefined);
  };

  const startEdit = (): void => {
    setEditTitle(current.title);
    setEditDescription(current.description);
    setEditError(null);
    setEditing(true);
  };

  const saveEdit = async (): Promise<void> => {
    setEditError(null);
    try {
      await api.updateTicket(ticket.id, {
        title: editTitle.trim(),
        description: editDescription,
      });
      setEditing(false);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Erreur");
    }
  };

  const appendToEditDescription = (markdown: string): void => {
    setEditDescription((prev) =>
      prev.endsWith("\n") || prev === "" ? `${prev}${markdown}\n` : `${prev}\n${markdown}\n`,
    );
  };

  const onEditPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>): void => {
    void handleMediaPaste(event, appendToEditDescription).catch((e) =>
      setEditError(e instanceof Error ? e.message : "Échec de l'upload"),
    );
  };

  const descriptionView = current.description ? (
    <Markdown content={current.description} />
  ) : (
    <p className="text-sm text-muted-foreground">(vide)</p>
  );

  const answer = async (questionId: string): Promise<void> => {
    const body = reply[questionId]?.trim();
    if (!body) return;
    await api.addComment(ticket.id, { body, questionId });
    setReply((prev) => ({ ...prev, [questionId]: "" }));
    refresh();
  };

  const comment = async (): Promise<void> => {
    if (!newComment.trim()) return;
    await api.addComment(ticket.id, { body: newComment, questionId: null });
    setNewComment("");
    refresh();
  };

  const validatePrdWithNote = async (note: string): Promise<void> => {
    await api.validatePrd(ticket.id, note);
    refresh();
  };

  const requestPrdChanges = async (message: string): Promise<void> => {
    await api.addComment(ticket.id, { body: message, questionId: null });
    refresh();
  };

  return (
    <Modal
      open
      onClose={onClose}
      side="right"
      fullWidth
      disableEscape={hasUncommittedText || prdDialogOpen}
    >
      <ModalHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <ModalTitle>{current.title}</ModalTitle>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {current.kind === "review" && (
                <Badge variant="secondary" className="gap-1">
                  <Eye className="h-3 w-3" /> Review
                </Badge>
              )}
              {current.kind === "clean" && (
                <Badge variant="secondary" className="gap-1">
                  <Brush className="h-3 w-3" /> Clean
                </Badge>
              )}
              {current.kind === "ask" && (
                <Badge variant="secondary" className="gap-1">
                  <HelpCircle className="h-3 w-3" /> Ask
                </Badge>
              )}
              {current.stage && (
                <Badge
                  variant={stageVariant(current.stage)}
                  className={cn(isStageAnimated(current.stage) && "animate-pulse")}
                >
                  {stageLabel(current.stage)}
                </Badge>
              )}
              {current.slotId !== null && (
                <Badge variant="info" className="gap-1">
                  <Cpu className="h-3 w-3" /> slot-{current.slotId}
                </Badge>
              )}
              {extractFigmaUrls(current.description).length > 0 && (
                <Badge variant="secondary">UI</Badge>
              )}
              {current.prdEnabled && (
                <Badge variant="secondary">PRD</Badge>
              )}
              {locked && (
                <span className="text-xs text-muted-foreground">
                  verrouillé (en traitement)
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="outline">{resolveProjectLabel(projects, current.project)}</Badge>
            {showTerminal && (
              <Button variant="ghost" size="sm" onClick={toggleTerminal}>
                {terminalVisible ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                {terminalVisible ? "Masquer le terminal" : "Afficher le terminal"}
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </ModalHeader>

      <div className="flex flex-1 overflow-hidden">
        <div
          className={cn(
            "min-w-0 flex-1 overflow-y-auto px-6 py-4",
            !terminalPaneVisible && !isTodoSplit && "mx-auto w-full max-w-4xl",
          )}
        >
        <div
          className={cn(
            isTodoSplit
              ? "grid grid-cols-1 items-start gap-x-6 gap-y-4 lg:grid-cols-2"
              : "space-y-4",
          )}
        >
        <div className="min-w-0 space-y-4">
        {current.error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {current.error}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Créé le {formatDateTime(current.createdAt)}
        </p>

        {current.finishedAt !== null && (
          <p className="text-xs text-muted-foreground">
            {finishedKindLabel(current)} le {formatDateTime(current.finishedAt)}
          </p>
        )}

        <section className="flex flex-wrap items-center gap-2">
          <Label htmlFor="ticket-status" className="text-sm font-semibold">
            Statut
          </Label>
          <Select
            id="ticket-status"
            className="w-auto"
            value={current.column}
            disabled={locked}
            title={locked ? "Carte verrouillée (en traitement)" : undefined}
            onChange={(e) => changeStatus(columnSchema.parse(e.target.value))}
          >
            {statusOptions.map((col) => (
              <option key={col} value={col}>
                {COLUMN_LABELS[col]}
              </option>
            ))}
          </Select>
          {locked && (
            <span className="text-xs text-muted-foreground">
              verrouillé (en traitement) — utilise « Abandonner » ci-dessous
            </span>
          )}
        </section>

        {!isTodoSplit && <TicketConfigSummary ticket={current} />}

        <section>
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Description</h3>
            {!locked && !editing && (
              <Button variant="ghost" size="sm" onClick={startEdit}>
                Modifier
              </Button>
            )}
          </div>
          {editing ? (
            <div className="space-y-2">
              <div className="space-y-1.5">
                <Label htmlFor="edit-title">Titre (optionnel)</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Titre du ticket (déduit de la description si vide)"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-description">Description (markdown)</Label>
                <Textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  onPaste={onEditPaste}
                  className="min-h-[200px]"
                  placeholder="Description… (colle une image pour l'attacher ; liens Figma détectés automatiquement)"
                />
              </div>
              {editError && (
                <p className="text-sm text-destructive">{editError}</p>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void saveEdit()}>
                  Enregistrer
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            descriptionView
          )}
        </section>

        {current.prdMarkdown && (
          <section className="rounded-md border bg-muted/30 p-3">
            {current.column === "prd" ? (
              <>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">PRD proposé</h3>
                  <Button variant="ghost" size="sm" onClick={() => setPrdDialogOpen(true)}>
                    <Maximize2 className="h-4 w-4" />
                    Agrandir & annoter
                  </Button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <Markdown content={current.prdMarkdown} />
                </div>
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={async () => {
                    await api.validatePrd(ticket.id);
                    refresh();
                  }}
                >
                  Valider le PRD
                </Button>
              </>
            ) : (
              <details>
                <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold">
                  PRD validé
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      setPrdDialogOpen(true);
                    }}
                  >
                    <Maximize2 className="h-4 w-4" />
                    Agrandir
                  </Button>
                </summary>
                <div className="mt-2 max-h-64 overflow-y-auto">
                  <Markdown content={current.prdMarkdown} />
                </div>
              </details>
            )}
          </section>
        )}

        <section>
          <h3 className="mb-2 text-sm font-semibold">Commentaires</h3>
          <div className="space-y-2">
            {comments.length === 0 && (
              <p className="text-xs text-muted-foreground">Aucun commentaire</p>
            )}
            {comments.map((c) => (
              <CommentRow
                key={c.id}
                comment={c}
                reply={reply[c.questionId ?? ""] ?? ""}
                onReplyChange={(v) =>
                  c.questionId &&
                  setReply((prev) => ({ ...prev, [c.questionId!]: v }))
                }
                onAnswer={() => c.questionId && answer(c.questionId)}
              />
            ))}
          </div>
          {current.column !== "todo" && (
            <div className="mt-3 space-y-1.5">
              <Label htmlFor="new-comment">Ajouter un commentaire</Label>
              <Input
                id="new-comment"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Votre message…"
                onKeyDown={(e) => e.key === "Enter" && comment()}
              />
            </div>
          )}
        </section>

        <section className="flex flex-wrap gap-2 border-t pt-4">
          {canResolveConflicts && (
            <Button
              variant="default"
              size="sm"
              title="Lancer une session Opus (effort bas) qui rebase la branche, résout les conflits et repousse la PR pour relancer le merge auto"
              onClick={async () => {
                await api.resolveConflicts(ticket.id);
                refresh();
              }}
            >
              <GitMerge className="h-4 w-4" />
              Résoudre les conflits
            </Button>
          )}
          {(current.stage === "failed" ||
            current.stage === "interrupted" ||
            current.stage === "stalled") &&
            // Auto-merge failed: the PR is already pushed/open and the slot is released.
            // A retry would re-spawn a fresh session for an existing PR — hide it; the
            // user resolves the conflict via the linked PR instead.
            !(current.slotId === null && current.prUrl !== null) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={async () => {
                await api.retry(ticket.id);
                refresh();
              }}
            >
              Relancer
            </Button>
          )}
          {canRelaunch && (
            <Button
              variant="secondary"
              size="sm"
              title="Tuer la session et la relancer dans le même slot (réenvoie l'instruction)"
              onClick={() => setConfirmRelaunch(true)}
            >
              <RotateCw className="h-4 w-4" />
              Relancer la session
            </Button>
          )}
          {current.column === "done" && current.kind === "feature" && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setConfirmMerged(true)}
            >
              PR mergée
            </Button>
          )}
          {current.column !== "abandoned" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmAbandon(true)}
            >
              Abandonner
            </Button>
          )}
          {current.slotId === null && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmDelete(true)}
            >
              Supprimer
            </Button>
          )}
        </section>
        </div>

        {isTodoSplit && (
          <div className="min-w-0 space-y-4">
            {canEditBaseBranch && (
              <section className="rounded-md border p-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ticket-base-branch">
                    Branche de base du worktree
                  </Label>
                  <Select
                    id="ticket-base-branch"
                    value={selectedBaseBranch}
                    onChange={(e) => changeBaseBranch(e.target.value)}
                    disabled={branches === null}
                    className="w-full"
                  >
                    {baseBranchOptions.map((b) => (
                      <option key={b} value={b}>
                        {b === projectDefaultBranch ? `${b} (défaut)` : b}
                      </option>
                    ))}
                  </Select>
                </div>
              </section>
            )}

            <section className="rounded-md border p-3">
              <h3 className="mb-2 text-sm font-semibold">Agent d'implémentation</h3>
              <AgentProfileConfig
                model={current.model}
                effort={current.effort}
                implementerModel={current.implementerModel}
                implementerEffort={current.implementerEffort}
                implementer={current.implementer}
                onModelChange={setAgentModel}
                onEffortChange={setAgentEffort}
                onImplementerModelChange={setImplementerModel}
                onImplementerEffortChange={setImplementerEffort}
                onImplementerChange={setImplementer}
                onApplyProfile={applyProfile}
              />
              <div className="mt-3">
                <Button
                  size="sm"
                  disabled={current.triageStatus === "running"}
                  onClick={async () => {
                    await api.moveTicket(current.id, "implementing");
                  }}
                >
                  <Rocket className="h-4 w-4" />
                  Lancer l'implémentation
                </Button>
              </div>
            </section>

            <section className="rounded-md border p-3">
              <h3 className="mb-2 text-sm font-semibold">Options de PR</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span>PRD à implémenter (planification avant code)</span>
                  <Switch
                    checked={current.prdEnabled}
                    onCheckedChange={setPrdEnabled}
                    aria-label="PRD à implémenter"
                  />
                </label>
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    Ouvrir la PR en draft
                    {current.autoMerge && (
                      <span className="ml-1 text-xs text-muted-foreground">(forcé non-draft pour le merge auto)</span>
                    )}
                  </span>
                  <Switch
                    checked={current.prDraft && !current.autoMerge}
                    disabled={current.autoMerge}
                    onCheckedChange={setPrDraft}
                    aria-label="Ouvrir la PR en draft"
                  />
                </label>
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span>Merger automatiquement la PR après ouverture</span>
                  <Switch checked={current.autoMerge} onCheckedChange={setAutoMerge} aria-label="Merge automatique de la PR" />
                </label>
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span>Tester que la feature marche avant la PR (+ comparaison visuelle aux maquettes)</span>
                  <Switch
                    checked={current.verifyFeature}
                    onCheckedChange={setVerifyFeature}
                    aria-label="Tester la feature avant la PR"
                  />
                </label>
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span>Réfléchir sur la solution en amont (recherche parallèle paris-research)</span>
                  <Switch
                    checked={current.researchPlan}
                    onCheckedChange={setResearchPlan}
                    aria-label="Réflexion paris-research en amont"
                  />
                </label>
              </div>
            </section>

            {!locked && (
              <TriageSection
                ticket={current}
                onTriage={async () => {
                  await api.triage(ticket.id);
                }}
                onApplySuggestion={(model, effort) => {
                  void api.updateTicket(current.id, { model, effort }).catch(() => undefined);
                }}
              />
            )}
          </div>
        )}
        </div>
        </div>
        {terminalPaneVisible && (
          <div className="flex w-[45%] min-w-[420px] flex-col overflow-hidden border-l px-4 py-4">
            <LiveTerminal ticketId={current.id} live={sessionLive} fill />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmAbandon}
        title="Abandonner le ticket"
        description="Action destructive : la session est tuée, le worktree et la branche locale sont supprimés."
        confirmLabel="Abandonner"
        destructive
        onCancel={() => setConfirmAbandon(false)}
        onConfirm={async () => {
          setConfirmAbandon(false);
          await api.moveTicket(ticket.id, "abandoned", true);
          onClose();
        }}
      />
      <ConfirmDialog
        open={confirmMerged}
        title="Marquer la PR comme mergée"
        description="La carte sera archivée et le worktree/branche nettoyés."
        confirmLabel="PR mergée"
        onCancel={() => setConfirmMerged(false)}
        onConfirm={async () => {
          setConfirmMerged(false);
          await api.markMerged(ticket.id);
          onClose();
        }}
      />
      <ConfirmDialog
        open={confirmImplement}
        title="Lancer l'implémentation"
        description="L'agent d'implémentation va être (re)lancé sur cette carte et occupera un slot."
        confirmLabel="Lancer"
        onCancel={() => setConfirmImplement(false)}
        onConfirm={async () => {
          setConfirmImplement(false);
          await moveTo("implementing");
        }}
      />
      <ConfirmDialog
        open={confirmRelaunch}
        title="Relancer la session"
        description="La session en cours est tuée et relancée dans le même slot, et l'instruction est renvoyée. Le travail non commité de la session en cours sera perdu."
        confirmLabel="Relancer"
        onCancel={() => setConfirmRelaunch(false)}
        onConfirm={async () => {
          setConfirmRelaunch(false);
          try {
            await api.relaunch(ticket.id);
            refresh();
          } catch {
            // Lost a race with an in-flight launch; the board reflects the real state via WS.
          }
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer le ticket"
        description="Suppression définitive du ticket et de ses commentaires. Action irréversible."
        confirmLabel="Supprimer"
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          setConfirmDelete(false);
          await api.deleteTicket(ticket.id);
          onClose();
        }}
      />
      <ConfirmDialog
        open={moveError !== null}
        title="Déplacement refusé"
        description={moveError ?? ""}
        confirmLabel="Compris"
        onCancel={() => setMoveError(null)}
        onConfirm={() => setMoveError(null)}
      />
      {prdDialogOpen && current.prdMarkdown && (
        <PrdReviewDialog
          open
          prdMarkdown={current.prdMarkdown}
          actionable={current.column === "prd"}
          onClose={() => setPrdDialogOpen(false)}
          onValidate={validatePrdWithNote}
          onRequestChanges={requestPrdChanges}
        />
      )}
    </Modal>
  );
}

interface TriageSectionProps {
  ticket: Ticket;
  onTriage: () => Promise<void>;
  onApplySuggestion: (model: AgentModel, effort: AgentEffort) => void;
}

function TriageSection({ ticket, onTriage, onApplySuggestion }: TriageSectionProps) {
  const running = ticket.triageStatus === "running";
  const result = parseTriageReport(ticket.triageReport);
  const suggestion =
    ticket.triageVerdict === "implementable" && result?.suggestedModel && result.suggestedEffort
      ? { model: result.suggestedModel, effort: result.suggestedEffort }
      : null;
  const suggestionApplied =
    suggestion !== null && ticket.model === suggestion.model && ticket.effort === suggestion.effort;

  return (
    <section className="rounded-md border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Faisabilité</h3>
        {ticket.triageStatus === "done" && ticket.triageVerdict && (
          <Badge variant={triageVerdictVariant(ticket.triageVerdict)}>
            {TRIAGE_VERDICT_LABELS[ticket.triageVerdict]}
          </Badge>
        )}
      </div>

      {ticket.triageStatus === "done" && result && (
        <div className="space-y-2 text-sm">
          <p>{result.summary}</p>
          {result.reasons.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Raisons
              </p>
              <ul className="list-disc pl-5">
                {result.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
          {result.questions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Questions
              </p>
              <ul className="list-disc pl-5">
                {result.questions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
          )}
          {result.files.length > 0 && (
            <ul className="font-mono text-xs text-muted-foreground">
              {result.files.map((file) => (
                <li key={file}>{file}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {suggestion && (
        <div className="mt-2 rounded border border-dashed p-2 text-sm">
          <p className="text-xs font-semibold text-muted-foreground">Suggestion agent d'implémentation</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span>
              Modèle <strong>{AGENT_MODEL_LABELS[suggestion.model]}</strong> · Effort{" "}
              <strong>{AGENT_EFFORT_LABELS[suggestion.effort]}</strong>
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={suggestionApplied}
              onClick={() => onApplySuggestion(suggestion.model, suggestion.effort)}
            >
              {suggestionApplied ? "Appliquée" : "Appliquer"}
            </Button>
          </div>
        </div>
      )}

      {ticket.triageStatus === "failed" && (
        <div className="space-y-2 text-sm">
          <p className="text-destructive">L'analyse a échoué.</p>
          {ticket.triageReport && (
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Détails
              </summary>
              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-muted/40 p-2 text-xs">
                {ticket.triageReport}
              </pre>
            </details>
          )}
        </div>
      )}

      {running && (
        <div className="mt-2">
          <LiveTerminal ticketId={ticket.id} />
        </div>
      )}

      <Button
        size="sm"
        variant="secondary"
        className="mt-2"
        title={running ? "Tuer la session de faisabilité bloquée et la relancer" : undefined}
        onClick={() => void onTriage()}
      >
        {running && <RotateCw className="h-4 w-4" />}
        {running
          ? "Relancer l'analyse"
          : ticket.triageStatus === "none"
            ? "Analyser"
            : "Re-analyser"}
      </Button>
    </section>
  );
}

interface CommentRowProps {
  comment: Comment;
  reply: string;
  onReplyChange: (value: string) => void;
  onAnswer: () => void;
}

const AUTHOR_BADGES: Record<
  Comment["author"],
  { label: string; glyph: string | null; className: string }
> = {
  agent: { label: "Agent", glyph: "🤖", className: "bg-info/15 text-info" },
  user: { label: "Toi", glyph: "🧑", className: "bg-primary/15 text-primary" },
  system: {
    label: "Système",
    glyph: null,
    className: "bg-muted text-muted-foreground",
  },
};

function AuthorBadge({ author }: { author: Comment["author"] }) {
  const { label, glyph, className } = AUTHOR_BADGES[author];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        className,
      )}
    >
      {glyph && <span aria-hidden>{glyph}</span>} {label}
    </span>
  );
}

function CommentRow({
  comment,
  reply,
  onReplyChange,
  onAnswer,
}: CommentRowProps) {
  const isQuestion =
    comment.author === "agent" &&
    comment.questionId !== null &&
    !comment.answered;
  return (
    <div
      className={cn(
        "rounded-md border p-2 text-sm",
        comment.author === "agent" && "border-info/40 bg-info/5",
        comment.author === "system" && "bg-muted/30 text-muted-foreground",
        comment.author === "user" && "border-primary/30 bg-primary/5",
        isQuestion && "border-warning/50 bg-warning/10",
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <AuthorBadge author={comment.author} />
        {isQuestion && <Badge variant="warning">Question</Badge>}
        <span className="ml-auto text-[10px] text-muted-foreground">{formatDateTime(comment.createdAt)}</span>
      </div>
      <Markdown content={comment.body} />
      {isQuestion && (
        <div className="mt-2 flex gap-2">
          <Input
            value={reply}
            onChange={(e) => onReplyChange(e.target.value)}
            placeholder="Votre réponse…"
            onKeyDown={(e) => e.key === "Enter" && onAnswer()}
          />
          <Button size="sm" onClick={onAnswer}>
            Répondre
          </Button>
        </div>
      )}
    </div>
  );
}
