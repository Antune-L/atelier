import {
  Brush,
  Check,
  ChevronDown,
  ClipboardPaste,
  Copy,
  Cpu,
  Eye,
  FlaskConical,
  GitMerge,
  GitPullRequest,
  HelpCircle,
  Maximize2,
  PanelRightClose,
  PanelRightOpen,
  Rocket,
  RotateCw,
  Sparkles,
  Split,
  Square,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Comment, ProjectInfo, Ticket } from "@shared/schemas";
import {
  TRIAGE_VERDICT_LABELS,
  columnSchema,
  parseTriageReport,
} from "@shared/schemas";
import {
  ACTIVE_STAGES,
  AGENT_EFFORT_LABELS,
  AGENT_MODEL_LABELS,
  COLUMN_LABELS,
  COLUMN_ORDER,
  SPLIT_BRANCH_PREFIX,
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
import { BranchCombobox, Input, Label, Textarea } from "@/components/ui/input";
import { Markdown } from "@/components/ui/markdown";
import { Modal, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { PrdReviewDialog } from "@/components/PrdReviewDialog";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AgentProfileConfig } from "@/components/AgentProfileConfig";
import { TicketOptionsToggleGroup } from "@/components/TicketOptionsToggleGroup";
import { TicketConfigSummary } from "@/components/TicketConfigSummary";
import { TicketCost } from "@/components/TicketCost";
import { LiveTerminal } from "@/components/LiveTerminal";
import { TerminalView } from "@/components/TerminalView";
import {
  dependencyCandidates,
  finishedKindLabel,
  formatDateTime,
  isStageAnimated,
  stageLabel,
  stageVariant,
  triageVerdictVariant,
} from "@/lib/display";
import { useBoard } from "@/hooks/useBoard";
import { api } from "@/lib/api";
import { boardStore } from "@/lib/store";
import { handleMediaPaste } from "@/lib/paste";
import { cn } from "@/lib/utils";
import {
  projectBadgeStyle,
  resolveProjectColor,
  resolveProjectLabel,
} from "@/components/TicketCard";

const TERMINAL_VISIBLE_KEY = "ticket-terminal-visible";

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
  // An interactive test session occupies a slot (stage stays "done"); treat it as locked so the
  // card can't be edited or moved while the test runs.
  if (ticket.testing) return true;
  if (ticket.stage === null) return false;
  if (ticket.stage === "awaiting_answers") return true;
  return ACTIVE_STAGES.includes(ticket.stage);
}

export function TicketDetail({ ticket, projects, onClose }: TicketDetailProps) {
  const { tickets: boardTickets } = useBoard();
  const [comments, setComments] = useState<Comment[]>([]);
  const [reply, setReply] = useState<Record<string, string>>({});
  const [newComment, setNewComment] = useState("");
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [confirmMerged, setConfirmMerged] = useState(false);
  const [confirmImplement, setConfirmImplement] = useState(false);
  const [confirmRelaunch, setConfirmRelaunch] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [testBusy, setTestBusy] = useState(false);
  const [createPrBusy, setCreatePrBusy] = useState(false);
  const [splitBusy, setSplitBusy] = useState(false);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editExternalUrl, setEditExternalUrl] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [checkingMerge, setCheckingMerge] = useState(false);
  const [terminalVisible, setTerminalVisible] = useState(
    () => localStorage.getItem(TERMINAL_VISIBLE_KEY) !== "0",
  );
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
    // "À review" is pipeline-managed (reached via ready_for_review, left via "Créer la PR"/abandon):
    // never offer it as a manual move target, but keep it as the (disabled) displayed value for a card
    // that currently rests there so the Select doesn't misrepresent the status.
    if (col === "to_review") return current.column === "to_review";
    if (col === "merged") return current.kind === "feature";
    if (col === "reviewed")
      return current.kind === "review" || current.kind === "clean";
    if (col === "answered") return current.kind === "ask";
    return true;
  });
  const showTerminal =
    current.slotId !== null &&
    ((current.stage !== null && current.stage !== "done") || current.testing);
  const terminalPaneVisible = showTerminal && terminalVisible;
  // The pane WebSocket can land before tmux is spawned (queued/setup window); while the session is
  // expected to be live the terminal retries rather than freezing on the first "session terminée".
  // A test session sits on a "done" (terminal) stage, so OR in `testing` to keep it live.
  const sessionLive =
    (current.stage !== null && !TERMINAL_STAGES.includes(current.stage)) ||
    current.testing;
  // A "todo" card carries config sections (agent, PR options, feasibility) and
  // never has a terminal: lay it out on two columns so it breathes.
  const isTodoSplit = current.column === "todo";
  // TODO has no live agent and the API rejects new comments; hide the section unless a
  // previous run left history (e.g. card moved back from failed).
  const showCommentsSection = comments.length > 0 || current.column !== "todo";
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
    void api
      .updateTicket(current.id, { baseBranch: override })
      .catch(() => undefined);
  };
  const dependsCandidates = dependencyCandidates(
    boardTickets,
    current.project,
    current.id,
    current.dependsOn,
  );
  const changeDependsOn = (value: string): void => {
    void api
      .updateTicket(current.id, { dependsOn: value || null })
      .catch(() => undefined);
  };
  const changeProject = (value: string): void => {
    if (value === current.project) return;
    void api
      .updateTicket(current.id, { project: value })
      .catch(() => undefined);
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
  // A finished feature can spawn an interactive test session on its existing branch. A split mother
  // lands in "done" with only an empty integration branch (split/…), so there is nothing to test there.
  const canStartTest =
    current.column === "done" &&
    current.kind === "feature" &&
    current.branch !== null &&
    !current.branch.startsWith(SPLIT_BRANCH_PREFIX) &&
    current.slotId === null &&
    !current.testing;
  // A feature in TODO or PRD can be decomposed into child tickets via the split sub-agent. In PRD the
  // button is shown but disabled until a PRD markdown exists (the sub-agent needs it as context).
  const canSplit =
    current.kind === "feature" && (current.column === "todo" || current.column === "prd");
  const splitDisabled =
    splitBusy || (current.column === "prd" && current.prdMarkdown === null);

  // Escape must not silently discard uncommitted comment/answer/edit text.
  const editDirty =
    editing &&
    (editTitle !== current.title ||
      editExternalUrl !== (current.externalUrl ?? "") ||
      editDescription !== current.description);
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
    void api
      .updateTicket(current.id, { implementerModel })
      .catch(() => undefined);
  };

  const setImplementerEffort = (
    implementerEffort: AgentEffort | null,
  ): void => {
    void api
      .updateTicket(current.id, { implementerEffort })
      .catch(() => undefined);
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

  // Ask GitHub whether the PR is actually merged; archive the card if so, otherwise surface its state.
  const checkMerge = async (): Promise<void> => {
    setCheckingMerge(true);
    try {
      const result = await api.checkMerged(ticket.id);
      if (result.merged) {
        onClose();
        return;
      }
      setMoveError(`PR non mergée (état : ${result.state || "inconnu"})`);
    } catch (e) {
      setMoveError(
        e instanceof Error ? e.message : "Vérification du merge échouée",
      );
    } finally {
      setCheckingMerge(false);
    }
  };

  const setFeasibilityContext = (checked: boolean): void => {
    void api
      .updateTicket(current.id, { feasibilityContext: checked })
      .catch(() => undefined);
  };

  const startEdit = (): void => {
    setEditTitle(current.title);
    setEditExternalUrl(current.externalUrl ?? "");
    setEditDescription(current.description);
    setEditError(null);
    setEditing(true);
  };

  const saveEdit = async (): Promise<void> => {
    setEditError(null);
    try {
      await api.updateTicket(ticket.id, {
        title: editTitle.trim(),
        externalUrl: editExternalUrl,
        description: editDescription,
      });
      setEditing(false);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Erreur");
    }
  };

  const appendToEditDescription = (markdown: string): void => {
    setEditDescription((prev) =>
      prev.endsWith("\n") || prev === ""
        ? `${prev}${markdown}\n`
        : `${prev}\n${markdown}\n`,
    );
  };

  const onEditPaste = (
    event: React.ClipboardEvent<HTMLTextAreaElement>,
  ): void => {
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
                  className={cn(
                    isStageAnimated(current.stage) && "animate-pulse",
                  )}
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
              {current.prdEnabled && <Badge variant="secondary">PRD</Badge>}
              {locked && (
                <span className="text-xs text-muted-foreground">
                  verrouillé (en traitement)
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge
              variant="outline"
              style={projectBadgeStyle(
                resolveProjectColor(projects, current.project),
              )}
            >
              {resolveProjectLabel(projects, current.project)}
            </Badge>
            {showTerminal && (
              <Button variant="ghost" size="sm" onClick={toggleTerminal}>
                {terminalVisible ? (
                  <PanelRightClose className="h-4 w-4" />
                ) : (
                  <PanelRightOpen className="h-4 w-4" />
                )}
                {terminalVisible
                  ? "Masquer le terminal"
                  : "Afficher le terminal"}
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
                  {finishedKindLabel(current)} le{" "}
                  {formatDateTime(current.finishedAt)}
                </p>
              )}

              {current.externalUrl && (
                <p className="text-sm">
                  <span className="font-semibold">Lien externe : </span>
                  <a
                    href={current.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-primary underline underline-offset-2 hover:opacity-80"
                  >
                    {current.externalUrl}
                  </a>
                </p>
              )}

              <TicketCost ticket={current} />

              <section className="flex flex-wrap items-center gap-2">
                <Label
                  htmlFor="ticket-status"
                  className="text-sm font-semibold"
                >
                  Statut
                </Label>
                <Select
                  id="ticket-status"
                  className="w-auto"
                  value={current.column}
                  disabled={locked || current.column === "to_review"}
                  title={
                    locked
                      ? "Carte verrouillée (en traitement)"
                      : current.column === "to_review"
                        ? "En attente de review : crée la PR ou abandonne le ticket"
                        : undefined
                  }
                  onChange={(e) =>
                    changeStatus(columnSchema.parse(e.target.value))
                  }
                >
                  {statusOptions.map((col) => (
                    <option key={col} value={col}>
                      {COLUMN_LABELS[col]}
                    </option>
                  ))}
                </Select>
                {locked && (
                  <span className="text-xs text-muted-foreground">
                    verrouillé (en traitement) — utilise « Abandonner »
                    ci-dessous
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
                      <Label htmlFor="edit-external-url">
                        Lien externe (optionnel)
                      </Label>
                      <Input
                        id="edit-external-url"
                        type="url"
                        value={editExternalUrl}
                        onChange={(e) => setEditExternalUrl(e.target.value)}
                        placeholder="https://notion.so/… ou Trello"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-description">
                        Description (markdown)
                      </Label>
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(false)}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  descriptionView
                )}
              </section>

              {current.agentSummary &&
                (current.column === "done" || current.column === "merged") && (
                  <section className="rounded-md border bg-muted/30 p-3">
                    <details>
                      <summary className="cursor-pointer text-sm font-semibold">
                        Résumé de l'agent
                      </summary>
                      <div className="mt-2 max-h-64 overflow-y-auto">
                        <Markdown content={current.agentSummary} />
                      </div>
                    </details>
                  </section>
                )}

              {current.prdMarkdown && (
                <section className="rounded-md border bg-muted/30 p-3">
                  {current.column === "prd" ? (
                    <>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold">PRD proposé</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPrdDialogOpen(true)}
                        >
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

              {isTodoSplit && !locked && (
                <TriageSection
                  key={current.id}
                  ticket={current}
                  onTriage={async () => {
                    await api.triage(ticket.id);
                  }}
                  onTriagePlus={async () => {
                    await api.triagePlus(ticket.id);
                  }}
                  onApplySuggestion={(model, effort) => {
                    void api
                      .updateTicket(current.id, { model, effort })
                      .catch(() => undefined);
                  }}
                  onToggleContext={setFeasibilityContext}
                  onReformulate={() => api.reformulate(ticket.id)}
                  onApplyReformulation={(text) =>
                    api
                      .updateTicket(current.id, { description: text })
                      .then(() => undefined)
                  }
                />
              )}

              {showCommentsSection && (
                <section>
                  <h3 className="mb-2 text-sm font-semibold">Commentaires</h3>
                  <div className="space-y-2">
                    {comments.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Aucun commentaire
                      </p>
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
                  {!["todo", "done", "merged"].includes(current.column) && (
                    <div className="mt-3 space-y-1.5">
                      <Label htmlFor="new-comment">
                        Ajouter un commentaire
                      </Label>
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
              )}

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
                    variant="outline"
                    size="sm"
                    disabled={checkingMerge}
                    onClick={() => void checkMerge()}
                  >
                    <GitMerge className="h-4 w-4" />
                    Vérifier le merge
                  </Button>
                )}
                {current.column === "done" && current.kind === "feature" && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setConfirmMerged(true)}
                  >
                    <Check className="h-4 w-4" />
                    PR mergée
                  </Button>
                )}
                {current.column === "to_review" && current.stealth && current.slotId !== null && (
                  <Button
                    variant="default"
                    size="sm"
                    disabled={createPrBusy}
                    title="Ouvrir la PR depuis la branche poussée, libérer le slot et passer la carte en Fini"
                    onClick={async () => {
                      setCreatePrBusy(true);
                      try {
                        await api.createStealthPr(ticket.id);
                        refresh();
                      } catch (e) {
                        boardStore.notify(
                          "Création de PR échouée",
                          e instanceof Error ? e.message : "Erreur",
                        );
                      } finally {
                        setCreatePrBusy(false);
                      }
                    }}
                  >
                    <GitPullRequest className="h-4 w-4" />
                    Créer la PR
                  </Button>
                )}
                {canStartTest && (
                  <Button
                    variant="default"
                    size="sm"
                    disabled={testBusy}
                    title="Recréer un worktree sur la branche de la feature et lancer une session Claude interactive pour la tester (sans PR ni gate)"
                    onClick={async () => {
                      setTestBusy(true);
                      try {
                        await api.startTest(ticket.id);
                        refresh();
                      } finally {
                        setTestBusy(false);
                      }
                    }}
                  >
                    <FlaskConical className="h-4 w-4" />
                    Tester la feature
                  </Button>
                )}
                {current.testing && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={testBusy}
                    title="Arrêter la session de test : tue la session, retire le worktree et libère le slot"
                    onClick={async () => {
                      setTestBusy(true);
                      try {
                        await api.stopTest(ticket.id);
                        refresh();
                      } finally {
                        setTestBusy(false);
                      }
                    }}
                  >
                    <Square className="h-4 w-4" />
                    Arrêter le test
                  </Button>
                )}
                {canSplit && (
                  <Button
                    variant="default"
                    size="sm"
                    disabled={splitDisabled}
                    title="Découper le ticket en plusieurs sous-tickets via un sous-agent dédié (lecture seule)"
                    onClick={async () => {
                      setSplitBusy(true);
                      try {
                        await api.split(ticket.id);
                        boardStore.notify("Ticket découpé", "Les sous-tickets ont été créés.");
                        onClose();
                      } catch (e) {
                        boardStore.notify(
                          "Découpage échoué",
                          e instanceof Error ? e.message : "Erreur",
                        );
                      } finally {
                        setSplitBusy(false);
                      }
                    }}
                  >
                    <Split className="h-4 w-4" />
                    Découper en sous-tickets
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
                      <Label htmlFor="ticket-project">Projet</Label>
                      <Select
                        id="ticket-project"
                        value={current.project}
                        onChange={(e) => changeProject(e.target.value)}
                        className="w-full"
                      >
                        {projects.map((p) => (
                          <option key={p.key} value={p.key}>
                            {p.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </section>
                )}

                {canEditBaseBranch && (
                  <section className="rounded-md border p-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="ticket-base-branch">
                        Branche de base du worktree
                      </Label>
                      <BranchCombobox
                        id="ticket-base-branch"
                        value={selectedBaseBranch}
                        onChange={changeBaseBranch}
                        options={baseBranchOptions}
                        disabled={branches === null}
                      />
                    </div>
                  </section>
                )}

                {canEditBaseBranch && (
                  <section className="rounded-md border p-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="ticket-depends-on">
                        Dépend du ticket (stack PR)
                      </Label>
                      <Select
                        id="ticket-depends-on"
                        value={current.dependsOn ?? ""}
                        onChange={(e) => changeDependsOn(e.target.value)}
                        className="w-full"
                      >
                        <option value="">Aucune</option>
                        {dependsCandidates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </section>
                )}

                <section className="rounded-md border p-3">
                  <h3 className="mb-2 text-sm font-semibold">
                    Agent d'implémentation
                  </h3>
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

                <TicketOptionsToggleGroup
                  key={current.id}
                  title="Options de PR"
                  headingId="ticket-detail-options-heading"
                  values={{
                    prdEnabled: current.prdEnabled,
                    prDraft: current.prDraft,
                    autoMerge: current.autoMerge,
                    stealth: current.stealth,
                    directPush: current.directPush,
                    verifyFeature: current.verifyFeature,
                    argusMultiLoop: current.argusMultiLoop,
                  }}
                  onChange={(next) => {
                    void api
                      .updateTicket(current.id, next)
                      .catch(() => undefined);
                  }}
                />
              </div>
            )}
          </div>
        </div>
        {terminalPaneVisible && (
          <div className="flex w-[45%] min-w-[420px] flex-col overflow-hidden border-l px-4 py-4">
            {current.testing ? (
              // An interactive test session is a real tmux shell — keep the xterm (input + resize).
              <LiveTerminal ticketId={current.id} live={sessionLive} fill defaultInput />
            ) : (
              // An agent session runs in-process via the SDK: poll its rendered live transcript.
              <TerminalView ticketId={current.id} fill />
            )}
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
  onTriagePlus: () => Promise<void>;
  onApplySuggestion: (model: AgentModel, effort: AgentEffort) => void;
  onToggleContext: (checked: boolean) => void;
  onReformulate: () => Promise<{ started: boolean }>;
  onApplyReformulation: (text: string) => Promise<void>;
}

/** How long the reformulation copy button shows its "Copié" confirmation. */
const REFORMULATE_COPY_FEEDBACK_MS = 1500;
/** How long the reformulation apply button shows its "Appliqué" confirmation. */
const REFORMULATE_APPLY_FEEDBACK_MS = 1500;

function TriageSection({
  ticket,
  onTriage,
  onTriagePlus,
  onApplySuggestion,
  onToggleContext,
  onReformulate,
  onApplyReformulation,
}: TriageSectionProps) {
  const running = ticket.triageStatus === "running";
  const result = parseTriageReport(ticket.triageReport);
  // Reformulation runs async server-side: status + result live on the ticket and arrive over WS.
  const reformulating = ticket.reformulateStatus === "running";
  const reformulation = ticket.reformulateStatus === "done" ? ticket.reformulation : null;
  const statusError = ticket.reformulateStatus === "failed" ? ticket.reformulation : null;
  // Only a failed POST (e.g. 409 while one is already running) is tracked locally; the run's own
  // failure reason comes from the ticket.
  const [startError, setStartError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const reformulateError = startError ?? statusError;

  const handleReformulate = async (): Promise<void> => {
    setStartError(null);
    try {
      await onReformulate();
    } catch (error) {
      setStartError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleCopyReformulation = (event: React.MouseEvent): void => {
    event.preventDefault();
    if (!reformulation) return;
    void navigator.clipboard.writeText(reformulation).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), REFORMULATE_COPY_FEEDBACK_MS);
    });
  };

  const handleApplyReformulation = async (
    event: React.MouseEvent,
  ): Promise<void> => {
    event.preventDefault();
    if (!reformulation) return;
    setStartError(null);
    try {
      await onApplyReformulation(reformulation);
      setApplied(true);
      setTimeout(() => setApplied(false), REFORMULATE_APPLY_FEEDBACK_MS);
    } catch (error) {
      setStartError(error instanceof Error ? error.message : String(error));
    }
  };
  const suggestion =
    ticket.triageVerdict === "implementable" &&
    result?.suggestedModel &&
    result.suggestedEffort
      ? { model: result.suggestedModel, effort: result.suggestedEffort }
      : null;
  const suggestionApplied =
    suggestion !== null &&
    ticket.model === suggestion.model &&
    ticket.effort === suggestion.effort;

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
          <Markdown content={result.summary} />
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
              <ul className="list-disc pl-5 text-amber-600 dark:text-amber-500">
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
          {result.solutions && result.solutions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Solutions envisageables
              </p>
              <ul className="list-disc pl-5">
                {result.solutions.map((solution) => (
                  <li key={solution}>{solution}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {suggestion && (
        <div className="mt-2 rounded border border-dashed p-2 text-sm">
          <p className="text-xs font-semibold text-muted-foreground">
            Suggestion agent d'implémentation
          </p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span>
              Modèle <strong>{AGENT_MODEL_LABELS[suggestion.model]}</strong> ·
              Effort <strong>{AGENT_EFFORT_LABELS[suggestion.effort]}</strong>
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={suggestionApplied}
              onClick={() =>
                onApplySuggestion(suggestion.model, suggestion.effort)
              }
            >
              {suggestionApplied ? "Appliquée" : "Appliquer"}
            </Button>
          </div>
        </div>
      )}

      {ticket.column === "todo" &&
        ticket.triageStatus === "done" &&
        ticket.triageVerdict === "implementable" && (
          <label className="mt-2 flex items-center justify-between gap-2 text-sm">
            <span>Injecter le contexte de faisabilité dans le contrat</span>
            <Switch
              checked={ticket.feasibilityContext}
              onCheckedChange={onToggleContext}
              aria-label="Injecter le contexte de faisabilité dans le contrat"
            />
          </label>
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
          <TerminalView ticketId={ticket.id} />
        </div>
      )}

      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          title={
            running
              ? "Tuer la session de faisabilité bloquée et la relancer"
              : undefined
          }
          onClick={() => void onTriage()}
        >
          {running && <RotateCw className="h-4 w-4" />}
          {running
            ? "Relancer l'analyse"
            : ticket.triageStatus === "none"
              ? "Analyse"
              : "Relancer l'analyse"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          title="Analyse approfondie : faisabilité + solutions via sous-agents parallèles"
          disabled={running}
          onClick={() => void onTriagePlus()}
        >
          <Sparkles className="h-4 w-4" />
          Analyse +
        </Button>
        <Button
          size="sm"
          variant="secondary"
          title="Reformuler proprement le besoin à partir de la description et de l'analyse"
          disabled={reformulating || running}
          onClick={() => void handleReformulate()}
        >
          {reformulating ? <RotateCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Reformuler le besoin
        </Button>
      </div>

      {reformulateError && (
        <p className="mt-2 text-sm text-destructive">{reformulateError}</p>
      )}

      {reformulation && (
        <details className="group mt-2">
          <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold">
            <span className="flex items-center gap-2">
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              Besoin reformulé
            </span>
            <span className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(event) => void handleApplyReformulation(event)}
              >
                {applied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <ClipboardPaste className="h-4 w-4" />
                )}
                {applied ? "Appliqué" : "Appliquer"}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCopyReformulation}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copié" : "Copier"}
              </Button>
            </span>
          </summary>
          <div className="mt-2 max-h-64 overflow-y-auto">
            <Markdown content={reformulation} />
          </div>
        </details>
      )}
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
        <span className="ml-auto text-[10px] text-muted-foreground">
          {formatDateTime(comment.createdAt)}
        </span>
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
