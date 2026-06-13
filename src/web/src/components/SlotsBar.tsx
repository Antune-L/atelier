import { Copy } from "lucide-react";

import type { Slot } from "@shared/schemas";

import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SlotsBarProps {
  slots: Slot[];
}

const STATUS_STYLES: Record<Slot["status"], { dot: string; label: string; variant: BadgeVariant; box: string }> = {
  free: { dot: "bg-success", label: "Libre", variant: "success", box: "border-success/30 bg-success/5" },
  busy: { dot: "bg-info animate-pulse", label: "En cours", variant: "info", box: "border-info/30 bg-info/5" },
  stalled: { dot: "bg-warning", label: "Bloqué", variant: "warning", box: "border-warning/30 bg-warning/5" },
  interrupted: { dot: "bg-danger", label: "Interrompu", variant: "danger", box: "border-danger/30 bg-danger/5" },
  failed: { dot: "bg-destructive", label: "Échec", variant: "destructive", box: "border-destructive/30 bg-destructive/5" },
};

export function SlotsBar({ slots }: SlotsBarProps) {
  const copyAttach = (ticketId: string | null): void => {
    if (!ticketId) return;
    void navigator.clipboard.writeText(`tmux attach -t ticket-${ticketId}`);
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2">
      <span className="text-xs font-semibold text-muted-foreground">Slots</span>
      {slots.map((slot) => {
        const style = STATUS_STYLES[slot.status];
        return (
          <div key={slot.id} className={cn("flex items-center gap-2 rounded-md border px-2 py-1", style.box)}>
            <span className={cn("h-2 w-2 rounded-full", style.dot)} />
            <span className="text-xs font-medium">slot-{slot.id}</span>
            <Badge variant={style.variant} className="text-[10px]">
              {style.label}
            </Badge>
            {slot.ticketId && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                title="Copier la commande tmux attach"
                onClick={() => copyAttach(slot.ticketId)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
