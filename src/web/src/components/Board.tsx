import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useRef, useState } from "react";

import type { ProjectInfo, Ticket } from "@shared/schemas";
import { ACTIVE_STAGES, COLUMNS, COLUMN_ORDER, type Column } from "@shared/constants";

import { BoardColumn } from "@/components/BoardColumn";
import { ConfirmDialog } from "@/components/ui/confirm";
import { api } from "@/lib/api";
import { useBoard } from "@/hooks/useBoard";
import { boardStore } from "@/lib/store";

interface BoardProps {
  projects: ProjectInfo[];
  projectFilter: string;
  searchQuery: string;
  onOpenTicket: (ticket: Ticket) => void;
  onAddTicket: () => void;
}

const DRAG_ACTIVATION_DISTANCE = 6;

/** Case- and diacritics-insensitive normalization for client-side search. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function isLocked(ticket: Ticket): boolean {
  if (ticket.stage === null) return false;
  if (ticket.stage === "awaiting_answers") return true;
  return ACTIVE_STAGES.includes(ticket.stage);
}

function isColumn(value: string): value is Column {
  return COLUMNS.some((c) => c === value);
}

export function Board({ projects, projectFilter, searchQuery, onOpenTicket, onAddTicket }: BoardProps) {
  const { tickets, slots } = useBoard();
  const [pendingAbandon, setPendingAbandon] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [movingAll, setMovingAll] = useState(false);
  // Synchronous guard: two clicks fire before React re-renders the disabled button, so state alone can't block re-entry.
  const movingAllRef = useRef(false);
  const [checkingAll, setCheckingAll] = useState(false);
  const checkingAllRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE } }),
  );

  const byProject = projectFilter === "all" ? tickets : tickets.filter((t) => t.project === projectFilter);
  const needle = normalize(searchQuery.trim());
  const visible = needle
    ? byProject.filter((t) => normalize(`${t.title} ${t.description}`).includes(needle))
    : byProject;

  // Sorting (and its per-column asc/desc UI) is owned by BoardColumn.
  const ticketsByColumn = (column: Column): Ticket[] => visible.filter((t) => t.column === column);

  // A running triage holds the ticket's worker socket, so the server rejects a move to implementing.
  const eligibleTodo = ticketsByColumn("todo").filter((t) => t.triageStatus !== "running");
  const freeSlotCount = slots.filter((s) => s.status === "free").length;
  // Never queue: cap the bulk launch at the number of immediately available slots.
  const moveAllCount = Math.min(eligibleTodo.length, freeSlotCount);

  const handleMoveAllToImplementing = async (): Promise<void> => {
    if (movingAllRef.current) return;
    const toMove = eligibleTodo.slice(0, moveAllCount);
    if (toMove.length === 0) return;
    movingAllRef.current = true;
    setMovingAll(true);
    let moved = 0;
    const failures: string[] = [];
    // Sequential so each launch claims its slot before the next reads availability;
    // one rejection (e.g. a ticket whose triage just started) must not abort the rest.
    for (const ticket of toMove) {
      try {
        await api.moveTicket(ticket.id, "implementing");
        moved += 1;
      } catch (e) {
        failures.push(e instanceof Error ? e.message : "Lancement refusé");
      }
    }
    movingAllRef.current = false;
    setMovingAll(false);
    if (moved > 0) {
      const remaining = eligibleTodo.length - moved;
      const body =
        remaining > 0
          ? `${moved} ticket(s) lancé(s) — ${remaining} en attente (slots pleins).`
          : `${moved} ticket(s) lancé(s).`;
      boardStore.notify("À implémenter", body);
    }
    if (failures.length > 0) {
      setError(`${failures.length} ticket(s) non lancé(s) : ${failures[0]}`);
    }
  };

  const handleCheckMerge = async (ticket: Ticket): Promise<void> => {
    try {
      const result = await api.checkMerged(ticket.id);
      const body = result.merged
        ? "PR déjà mergée."
        : `PR non mergée (état : ${result.state || "inconnu"}).`;
      boardStore.notify("Merge vérifié", body);
    } catch (e) {
      boardStore.notify("Vérification échouée", e instanceof Error ? e.message : "Vérification du merge échouée");
    }
  };

  const doneFeatureTickets = ticketsByColumn("done").filter((t) => t.kind === "feature");
  const checkAllCount = doneFeatureTickets.length;

  const handleCheckAllMerges = async (): Promise<void> => {
    if (checkingAllRef.current) return;
    const toCheck = doneFeatureTickets;
    if (toCheck.length === 0) return;
    checkingAllRef.current = true;
    setCheckingAll(true);
    let merged = 0;
    let pending = 0;
    let failures = 0;
    try {
      // Sequential to avoid a burst of `gh` calls; each card's WS update moves it out of "done" on merge.
      for (const ticket of toCheck) {
        try {
          const result = await api.checkMerged(ticket.id);
          if (result.merged) merged += 1;
          else pending += 1;
        } catch {
          failures += 1;
        }
      }
    } finally {
      checkingAllRef.current = false;
      setCheckingAll(false);
    }
    const parts = [`${merged} mergée(s)`];
    if (pending > 0) parts.push(`${pending} en attente`);
    if (failures > 0) parts.push(`${failures} échec(s)`);
    boardStore.notify("Merge vérifié", `${parts.join(", ")}.`);
  };

  const handleDragEnd = async (event: DragEndEvent): Promise<void> => {
    const { active, over } = event;
    if (!over) return;
    const ticket = tickets.find((t) => t.id === active.id);
    const target = String(over.id);
    if (!ticket || !isColumn(target) || ticket.column === target) return;

    if (isLocked(ticket) && target !== "abandoned") {
      setError("Ticket en traitement : seul Abandonnés est autorisé.");
      return;
    }
    if (target === "abandoned") {
      setPendingAbandon(ticket.id);
      return;
    }
    try {
      await api.moveTicket(ticket.id, target);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Déplacement refusé");
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMN_ORDER.map((column) => (
          <BoardColumn
            key={column}
            column={column}
            tickets={ticketsByColumn(column)}
            projects={projects}
            onOpenTicket={onOpenTicket}
            onAddTicket={onAddTicket}
            onMoveAllToImplementing={column === "todo" ? handleMoveAllToImplementing : undefined}
            moveAllCount={moveAllCount}
            moveAllBusy={movingAll}
            onCheckMerge={column === "done" ? handleCheckMerge : undefined}
            onCheckAllMerges={column === "done" ? handleCheckAllMerges : undefined}
            checkAllCount={checkAllCount}
            checkAllBusy={checkingAll}
          />
        ))}
      </div>

      <ConfirmDialog
        open={pendingAbandon !== null}
        title="Abandonner le ticket"
        description="Action destructive : session tuée, worktree et branche locale supprimés."
        confirmLabel="Abandonner"
        destructive
        onCancel={() => setPendingAbandon(null)}
        onConfirm={async () => {
          const id = pendingAbandon;
          setPendingAbandon(null);
          if (id) await api.moveTicket(id, "abandoned", true);
        }}
      />

      <ConfirmDialog
        open={error !== null}
        title="Déplacement refusé"
        description={error ?? ""}
        confirmLabel="Compris"
        onCancel={() => setError(null)}
        onConfirm={() => setError(null)}
      />
    </DndContext>
  );
}
