import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useState } from "react";

import type { ProjectInfo, Ticket } from "@shared/schemas";
import { ACTIVE_STAGES, COLUMNS, COLUMN_ORDER, type Column } from "@shared/constants";

import { BoardColumn } from "@/components/BoardColumn";
import { ConfirmDialog } from "@/components/ui/confirm";
import { api } from "@/lib/api";
import { useBoard } from "@/hooks/useBoard";

interface BoardProps {
  projects: ProjectInfo[];
  projectFilter: string;
  searchQuery: string;
  onOpenTicket: (ticket: Ticket) => void;
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

export function Board({ projects, projectFilter, searchQuery, onOpenTicket }: BoardProps) {
  const { tickets } = useBoard();
  const [pendingAbandon, setPendingAbandon] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: DRAG_ACTIVATION_DISTANCE } }),
  );

  const byProject = projectFilter === "all" ? tickets : tickets.filter((t) => t.project === projectFilter);
  const needle = normalize(searchQuery.trim());
  const visible = needle
    ? byProject.filter((t) => normalize(`${t.title} ${t.description}`).includes(needle))
    : byProject;

  const ticketsByColumn = (column: Column): Ticket[] => visible.filter((t) => t.column === column);

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
