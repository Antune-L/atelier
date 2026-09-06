import type { Slot } from "@shared/schemas";

import { boardStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface SlotPipsProps {
  slots: Slot[];
}

const STATUS_LABELS: Record<Slot["status"], string> = {
  free: "Libre",
  busy: "En cours",
  stalled: "Bloqué",
  interrupted: "Interrompu",
  failed: "Échec",
};

const STATUS_PIP_CLASSES: Record<Slot["status"], string> = {
  free: "bg-border",
  busy: "bg-info",
  stalled: "bg-warning",
  interrupted: "bg-warning",
  failed: "bg-danger",
};

const ATTENTION_STATUSES: Slot["status"][] = ["stalled", "interrupted", "failed"];

/** tmux session to attach to; busy slots expose `tmuxSession`, fall back to the ticket-derived name. */
function sessionOf(slot: Slot): string | null {
  if (slot.tmuxSession) return slot.tmuxSession;
  if (slot.ticketId) return `ticket-${slot.ticketId}`;
  return null;
}

export function SlotPips({ slots }: SlotPipsProps) {
  const used = slots.filter((slot) => slot.status !== "free").length;
  const attention = slots.filter((slot) =>
    ATTENTION_STATUSES.includes(slot.status),
  ).length;

  const copySession = (slot: Slot): void => {
    const session = sessionOf(slot);
    if (!session) return;
    const command = `tmux attach -t ${session}`;
    navigator.clipboard
      .writeText(command)
      .then(() => boardStore.notify("Commande copiée", command))
      .catch(() => boardStore.notify("Copie impossible", command));
  };

  return (
    <div role="group" aria-label="Slots" className="flex items-center gap-1.5">
      <div className="flex items-center gap-1">
        {slots.map((slot) => {
          const session = sessionOf(slot);
          const ticketSuffix = slot.ticketId ? ` · ${slot.ticketId}` : "";
          return (
            <button
              key={slot.id}
              type="button"
              disabled={!session}
              onClick={() => copySession(slot)}
              title={`slot-${slot.id} · ${STATUS_LABELS[slot.status]}${ticketSuffix}`}
              className={cn(
                "h-2 w-[18px] rounded-[1px] transition-opacity",
                STATUS_PIP_CLASSES[slot.status],
                session ? "hover:opacity-70" : "cursor-default",
              )}
            />
          );
        })}
      </div>
      <span className="font-mono text-2xs text-muted-foreground tabular-nums">
        {`${used}/${slots.length}`}
        {attention > 0 && ` · ${attention} en attente`}
      </span>
    </div>
  );
}
