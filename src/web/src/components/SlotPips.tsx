import type { Slot } from "@shared/schemas";

import { boardStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface SlotPipsProps {
  slots: Slot[];
  onTicketOpen?: (ticketId: string) => void;
}

export interface SlotPipView {
  ticketId: string | null;
  disabled: boolean;
  label: string;
  title: string;
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

export function slotPipView(slot: Slot): SlotPipView {
  const { ticketId } = slot;
  const summary = `${slot.id} · ${STATUS_LABELS[slot.status]}${ticketId ? ` · Ouvrir la carte ${ticketId}` : ""}`;
  return { ticketId, disabled: !ticketId, label: `Slot ${summary}`, title: `slot-${summary}` };
}

export function openSlotTicket(slot: Slot, onTicketOpen?: (ticketId: string) => void): void {
  const { ticketId } = slot;
  if (!ticketId) return;
  boardStore.openTicket(ticketId);
  onTicketOpen?.(ticketId);
}

export function SlotPips({ slots, onTicketOpen }: SlotPipsProps) {
  const used = slots.filter((slot) => slot.status !== "free").length;
  const attention = slots.filter((slot) =>
    ATTENTION_STATUSES.includes(slot.status),
  ).length;

  return (
    <div role="group" aria-label="Places d’exécution" className="flex flex-wrap items-center gap-1.5">
      <div className="flex items-center gap-1">
        {slots.map((slot) => {
          const view = slotPipView(slot);
          return (
            <button
              key={slot.id}
              type="button"
              disabled={view.disabled}
              onClick={() => openSlotTicket(slot, onTicketOpen)}
              title={view.title}
              aria-label={view.label}
              className={cn(
                "h-2 w-[18px] rounded-[1px] transition-opacity",
                STATUS_PIP_CLASSES[slot.status],
                view.disabled ? "cursor-default" : "hover:opacity-70",
              )}
            />
          );
        })}
      </div>
      <span className="font-mono text-2xs text-muted-foreground tabular-nums">
        {`${used}/${slots.length} occupés`}
        {attention > 0 && ` · ${attention} en attente`}
      </span>
    </div>
  );
}
