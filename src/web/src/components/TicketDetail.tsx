import { Cpu, Eye, Maximize2, PanelRightClose, PanelRightOpen, Rocket, RotateCw, X } from "lucide-react";
import { useCallback, useState } from "react";

import type {
  Comment,
  ProjectInfo,
  Ticket,
  TriageResult,
} from "@shared/schemas";
import { TRIAGE_VERDICT_LABELS, columnSchema, triageResultSchema } from "@shared/schemas";
import {
  ACTIVE_STAGES,
  COLUMN_LABELS,
  COLUMN_ORDER,
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
import { ImplementationAgentFields } from "@/components/ImplementationAgentFields";
import { TerminalView } from "@/components/TerminalView";
import {
  finishedKindLabel,
  formatDateTime,
  isStageAnimated,
  stageLabel,
  stageVariant,
  triageVerdictVariant,
} from "@/lib/display";
import { api } from "@/lib/api";
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

  // Load comments when a new ticket is opened (render-phase guard, no useEffect).
  // Ticket fields come from the prop: App keeps it fresh via WS pushes.
  const load = useCallback(async (id: string) => {
    const data = await api.ticketDetail(id);
    setComments(data.comments);
  }, []);

  if (ticket && ticket.id !== loadedId) {
    setLoadedId(ticket.id);
    setEditing(false);
    setEditError(null);
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
  // "merged" is reserved for feature PRs, "reviewed" for review tickets (kind gate).
  const statusOptions = COLUMN_ORDER.filter((col) => {
    if (col === "merged") return current.kind !== "review";
    if (col === "reviewed") return current.kind === "review";
    return true;
  });
  const showTerminal =
    current.slotId !== null &&
    current.stage !== null &&
    current.stage !== "done";
  const terminalPaneVisible = showTerminal && terminalVisible;
  // Escape hatch for a stuck "À implémenter" card: the session spawned but its
  // contract/instruction never landed. Only while actively running — terminal
  // (failed/interrupted/stalled) states already have the "Relancer" button below.
  const canRelaunch =
    current.column === "implementing" &&
    current.slotId !== null &&
    current.stage !== null &&
    ACTIVE_STAGES.includes(current.stage);

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

  const setImplementer = (implementer: Implementer): void => {
    void api.updateTicket(current.id, { implementer }).catch(() => undefined);
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
            "min-w-0 flex-1 space-y-4 overflow-y-auto px-6 py-4",
            !terminalPaneVisible && "mx-auto w-full max-w-4xl",
          )}
        >
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
                <Label htmlFor="edit-title">Titre</Label>
                <Input
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Titre du ticket"
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
                <Button
                  size="sm"
                  onClick={() => void saveEdit()}
                  disabled={!editTitle.trim()}
                >
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

        {current.column === "todo" && (
          <section className="rounded-md border p-3">
            <h3 className="mb-2 text-sm font-semibold">Agent d'implémentation</h3>
            <ImplementationAgentFields
              model={current.model}
              effort={current.effort}
              implementer={current.implementer}
              onModelChange={setAgentModel}
              onEffortChange={setAgentEffort}
              onImplementerChange={setImplementer}
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
        )}

        {current.column === "todo" && (
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
            </div>
          </section>
        )}

        {current.column === "todo" && !locked && (
          <TriageSection
            ticket={current}
            onTriage={async () => {
              await api.triage(ticket.id);
            }}
          />
        )}

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
          {(current.stage === "failed" ||
            current.stage === "interrupted" ||
            current.stage === "stalled") && (
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
          {current.column === "done" && current.kind !== "review" && (
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
        {terminalPaneVisible && (
          <div className="flex w-[45%] min-w-[420px] flex-col overflow-hidden border-l px-4 py-4">
            <TerminalView ticketId={current.id} fill />
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
}

function TriageSection({ ticket, onTriage }: TriageSectionProps) {
  const running = ticket.triageStatus === "running";
  const result = parseTriageReport(ticket.triageReport);

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
          <TerminalView ticketId={ticket.id} variant="triage" />
        </div>
      )}

      <Button
        size="sm"
        variant="secondary"
        className="mt-2"
        disabled={running}
        onClick={() => void onTriage()}
      >
        {running
          ? "Analyse en cours…"
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
