import type { Slot } from "@shared/schemas";

import { Select } from "@/components/ui/select";
import { boardStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface SlotsBarProps {
  slots: Slot[];
}

const STATUS_LABELS: Record<Slot["status"], string> = {
  free: "Libre",
  busy: "En cours",
  stalled: "Bloqué",
  interrupted: "Interrompu",
  failed: "Échec",
};

const COPY_PLACEHOLDER = "";

/** tmux session to attach to; busy slots expose `tmuxSession`, fall back to the ticket-derived name. */
function sessionOf(slot: Slot): string | null {
  if (slot.tmuxSession) return slot.tmuxSession;
  if (slot.ticketId) return `ticket-${slot.ticketId}`;
  return null;
}

export function SlotsBar({ slots }: SlotsBarProps) {
  const available = slots.filter((slot) => slot.status === "free").length;
  const used = slots.length - available;

  const copySession = (slotId: number): void => {
    const slot = slots.find((candidate) => candidate.id === slotId);
    const session = slot ? sessionOf(slot) : null;
    if (!session) return;
    const command = `tmux attach -t ${session}`;
    navigator.clipboard
      .writeText(command)
      .then(() => boardStore.notify("Commande copiée", command))
      .catch(() => boardStore.notify("Copie impossible", command));
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-card px-4 py-2">
      <span className="text-xs font-semibold text-muted-foreground">Slots</span>

      <div className="flex items-center gap-3 text-xs">
        <Stat dot="bg-success" count={available} singular="disponible" plural="disponibles" />
        <Stat dot="bg-info" count={used} singular="utilisé" plural="utilisés" />
      </div>

      <Select
        defaultValue={COPY_PLACEHOLDER}
        aria-label="Copier la commande tmux d'un slot"
        className="ml-auto w-60 bg-background"
        onChange={(e) => {
          const raw = e.currentTarget.value;
          if (raw !== COPY_PLACEHOLDER) copySession(Number(raw));
          // reset so re-picking the same slot fires onChange again
          e.currentTarget.value = COPY_PLACEHOLDER;
        }}
      >
        <option value={COPY_PLACEHOLDER} disabled>
          Copier un terminal…
        </option>
        {slots.map((slot) => {
          const ticketSuffix = slot.ticketId ? ` · ${slot.ticketId}` : "";
          const label = `slot-${slot.id} · ${STATUS_LABELS[slot.status]}${ticketSuffix}`;
          return (
            <option key={slot.id} value={slot.id} disabled={!sessionOf(slot)}>
              {label}
            </option>
          );
        })}
      </Select>
    </div>
  );
}

interface StatProps {
  dot: string;
  count: number;
  singular: string;
  plural: string;
}

function Stat({ dot, count, singular, plural }: StatProps) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", dot)} />
      <span className="font-semibold tabular-nums">{count}</span>
      <span className="text-muted-foreground">{count === 1 ? singular : plural}</span>
    </span>
  );
}
