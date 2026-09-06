import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState, type KeyboardEvent } from "react";

import { ACTIVE_STAGES, COLUMN_ORDER, type Column } from "@shared/constants";
import type { Comment, ProjectInfo, Ticket } from "@shared/schemas";

import { PrdReviewDialog } from "@/components/PrdReviewDialog";
import { ActivityTab } from "@/components/ticket-detail/ActivityTab";
import { DescriptionTab } from "@/components/ticket-detail/DescriptionTab";
import { OverviewTab } from "@/components/ticket-detail/OverviewTab";
import { PrdTab } from "@/components/ticket-detail/PrdTab";
import { TerminalTab } from "@/components/ticket-detail/TerminalTab";
import { TicketActions } from "@/components/ticket-detail/TicketActions";
import { TicketMeta } from "@/components/ticket-detail/TicketMeta";
import { TicketTabs, type TicketTab } from "@/components/ticket-detail/TicketTabs";
import { TriageSection } from "@/components/ticket-detail/TriageSection";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Sheet } from "@/components/ui/sheet";
import { useBoard } from "@/hooks/useBoard";
import { api } from "@/lib/api";
import { stageLabel, stageSteps, ticketCardState, type CardState } from "@/lib/display";
import { boardStore } from "@/lib/store";
import { cn } from "@/lib/utils";

/** Per-ticket tab selection, kept for the session only (deliberately not persisted). */
const TAB_MEMORY = new Map<string, TicketTab>();

const DEFAULT_TAB: TicketTab = "overview";

const KIND_TOKENS: Partial<Record<Ticket["kind"], string>> = {
  review: "review",
  clean: "clean",
  ask: "ask",
};

const STATE_TOKEN_COLORS: Record<CardState, string> = {
  running: "text-info",
  attention: "text-warning",
  failed: "text-danger",
  done: "text-muted-foreground",
  idle: "text-muted-foreground",
};

const NAV_BUTTON_CLASSES =
  "rounded-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

const TEXT_ENTRY_TAGS = ["INPUT", "TEXTAREA", "SELECT"];

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

function hasSessionPane(ticket: Ticket): boolean {
  return (
    ticket.slotId !== null && ((ticket.stage !== null && ticket.stage !== "done") || ticket.testing)
  );
}

function availableTabs(ticket: Ticket): TicketTab[] {
  const tabs: TicketTab[] = ["overview", "activity", "description"];
  if (ticket.prdMarkdown !== null || ticket.column === "prd") tabs.push("prd");
  if (hasSessionPane(ticket)) tabs.push("terminal");
  return tabs;
}

function initialTab(ticket: Ticket): TicketTab {
  const remembered = TAB_MEMORY.get(ticket.id);
  if (remembered !== undefined) return remembered;
  return ticket.pendingQuestions > 0 ? "activity" : DEFAULT_TAB;
}

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return TEXT_ENTRY_TAGS.includes(target.tagName) || target.isContentEditable;
}

export function TicketDetail({ ticket, projects, onClose }: TicketDetailProps) {
  const { tickets: boardTickets } = useBoard();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TicketTab>(DEFAULT_TAB);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [prdOpen, setPrdOpen] = useState(false);

  // Load comments when a new ticket is opened (render-phase guard, no useEffect).
  // Ticket fields come from the prop: App keeps it fresh via WS pushes.
  const load = useCallback(async (id: string) => {
    const data = await api.ticketDetail(id);
    // Merge (not replace): a comment pushed over WS during this fetch would otherwise be dropped.
    setComments((prev) => mergeComments(prev, data.comments));
  }, []);

  // Live comments: the initial list is loaded once per ticket, but the agent (and any other
  // client) keeps posting over the board WS while the sheet stays open.
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
    // Drop the previous ticket's comments before the merge-based load so they don't bleed across.
    setComments([]);
    setPrdOpen(false);
    setMoveError(null);
    setTab(initialTab(ticket));
    void load(ticket.id);
  }
  if (!ticket && loadedId !== null) {
    setLoadedId(null);
    setComments([]);
    setPrdOpen(false);
  }

  if (!ticket) return null;
  const current = ticket;
  const locked = isLocked(current);
  const tabs = availableTabs(current);
  const activeTab = tabs.includes(tab) ? tab : DEFAULT_TAB;

  const selectTab = (next: TicketTab): void => {
    TAB_MEMORY.set(current.id, next);
    setTab(next);
  };

  // Per-kind terminal lanes: "merged" for feature PRs, "reviewed" for reviews, "answered" for asks.
  const statusOptions = COLUMN_ORDER.filter((col) => {
    // "À review" is pipeline-managed (reached via ready_for_review, left via "Créer la PR"/abandon):
    // never offer it as a manual move target, but keep it as the (disabled) displayed value.
    if (col === "to_review") return current.column === "to_review";
    if (col === "merged") return current.kind === "feature";
    if (col === "reviewed") return current.kind === "review" || current.kind === "clean";
    if (col === "answered") return current.kind === "ask";
    return true;
  });

  const siblings = boardTickets.filter((t) => t.column === current.column);
  const index = siblings.findIndex((t) => t.id === current.id);
  const previous = index > 0 ? siblings[index - 1] : undefined;
  const next = index >= 0 ? siblings[index + 1] : undefined;

  const refresh = (): void => void load(current.id);

  const onSheetKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    if (isTextEntry(event.target)) return;
    const target = event.key === "ArrowLeft" ? previous : next;
    if (target === undefined) return;
    event.preventDefault();
    boardStore.openTicket(target.id);
  };

  // Manual status change from the meta column. Destructive/side-effecting targets are confirmed
  // by TicketMeta before landing here.
  const changeStatus = async (target: Column): Promise<void> => {
    if (target === current.column) return;
    try {
      if (target === "abandoned") {
        await api.moveTicket(current.id, "abandoned", true);
        onClose();
        return;
      }
      if (target === "merged") {
        await api.markMerged(current.id);
        onClose();
        return;
      }
      await api.moveTicket(current.id, target);
    } catch (e) {
      setMoveError(e instanceof Error ? e.message : "Déplacement refusé");
    }
  };

  const answer = async (questionId: string, body: string): Promise<void> => {
    await api.addComment(current.id, { body, questionId });
    refresh();
  };

  const addComment = async (body: string): Promise<void> => {
    await api.addComment(current.id, { body, questionId: null });
    refresh();
  };

  const saveDescription = async (edit: {
    title: string;
    externalUrl: string;
    description: string;
  }): Promise<void> => {
    await api.updateTicket(current.id, edit);
  };

  const validatePrd = async (note = ""): Promise<void> => {
    await api.validatePrd(current.id, note);
    refresh();
  };

  const state = ticketCardState(current);
  const steps = current.stage === null ? null : stageSteps(current.stage);
  const kindToken = KIND_TOKENS[current.kind];

  const titleAside = (
    <div className="flex min-w-0 flex-1 items-center gap-2 font-mono text-2xs text-muted-foreground">
      {current.stage !== null && steps !== null && (
        <span className={cn("shrink-0", STATE_TOKEN_COLORS[state])}>
          {stageLabel(current.stage)} {steps.index}/{steps.total}
        </span>
      )}
      {current.slotId !== null && <span className="shrink-0">slot-{current.slotId}</span>}
      {kindToken !== undefined && <span className="shrink-0">{kindToken}</span>}
      {locked && <span className="shrink-0">verrouillé</span>}
      <span className="ml-auto flex shrink-0 items-center gap-1">
        <button
          type="button"
          className={NAV_BUTTON_CLASSES}
          title="Ticket précédent"
          aria-label="Ticket précédent"
          disabled={previous === undefined}
          onClick={() => previous !== undefined && boardStore.openTicket(previous.id)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={NAV_BUTTON_CLASSES}
          title="Ticket suivant"
          aria-label="Ticket suivant"
          disabled={next === undefined}
          onClick={() => next !== undefined && boardStore.openTicket(next.id)}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </span>
    </div>
  );

  const triage =
    current.column === "todo" && !locked ? (
      <TriageSection
        key={current.id}
        ticket={current}
        onTriage={async () => {
          await api.triage(current.id);
        }}
        onTriagePlus={async () => {
          await api.triagePlus(current.id);
        }}
        onApplySuggestion={(model, effort) => {
          void api.updateTicket(current.id, { model, effort }).catch(() => undefined);
        }}
        onToggleContext={(feasibilityContext) => {
          void api.updateTicket(current.id, { feasibilityContext }).catch(() => undefined);
        }}
        onFeasibilityEngineChange={(feasibilityEngine) => {
          void api.updateTicket(current.id, { feasibilityEngine }).catch(() => undefined);
        }}
        onReformulate={() => api.reformulate(current.id)}
        onApplyReformulation={(text) =>
          api.updateTicket(current.id, { description: text }).then(() => undefined)
        }
      />
    ) : undefined;

  return (
    <Sheet
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      size={activeTab === "terminal" ? "xl" : "lg"}
      pushedBy={prdOpen ? "lg" : null}
      breadcrumb={prdOpen ? ["Ticket"] : undefined}
      title={current.title}
      titleAside={titleAside}
      subheader={
        <TicketTabs
          tabs={tabs}
          value={activeTab}
          onChange={selectTab}
          questionCount={current.pendingQuestions}
        />
      }
      onKeyDown={onSheetKeyDown}
    >
      {activeTab === "terminal" ? (
        <TerminalTab ticket={current} />
      ) : (
        <>
          <div className="min-w-0 flex-1 overflow-y-auto px-4 py-3">
            {activeTab === "overview" && (
              <OverviewTab ticket={current} projects={projects} locked={locked} />
            )}
            {activeTab === "activity" && (
              <ActivityTab
                key={current.id}
                ticket={current}
                comments={comments}
                onAnswer={answer}
                onComment={addComment}
                triage={triage}
              />
            )}
            {activeTab === "description" && (
              <DescriptionTab key={current.id} ticket={current} onSave={saveDescription} />
            )}
            {activeTab === "prd" && (
              <PrdTab
                ticket={current}
                onExpand={() => setPrdOpen(true)}
                onValidate={() => validatePrd()}
              />
            )}
          </div>
          <aside className="w-56 shrink-0 space-y-4 overflow-y-auto border-l border-border px-3 py-3">
            <TicketMeta
              ticket={current}
              projects={projects}
              statusOptions={statusOptions}
              locked={locked}
              onStatusChange={(target) => void changeStatus(target)}
            />
            <TicketActions
              ticket={current}
              onRefresh={refresh}
              onClose={onClose}
              onError={setMoveError}
            />
          </aside>
        </>
      )}

      <AlertDialog
        open={moveError !== null}
        onClose={() => setMoveError(null)}
        title="Déplacement refusé"
        description={moveError ?? ""}
        closeLabel="Compris"
      />

      {prdOpen && current.prdMarkdown !== null && (
        <PrdReviewDialog
          open
          ticketId={current.id}
          prdMarkdown={current.prdMarkdown}
          actionable={current.column === "prd"}
          onClose={() => setPrdOpen(false)}
          onValidate={validatePrd}
          onRequestChanges={addComment}
        />
      )}
    </Sheet>
  );
}
