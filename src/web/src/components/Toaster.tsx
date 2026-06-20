import { X } from "lucide-react";

import { boardStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useBoard } from "@/hooks/useBoard";

export function Toaster() {
  const { toasts } = useBoard();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((toast) => {
        const ticketId = toast.ticketId;
        const openTicket = ticketId
          ? () => {
              boardStore.openTicket(ticketId);
              boardStore.dismissToast(toast.id);
            }
          : undefined;
        return (
          <div
            key={toast.id}
            role={openTicket ? "button" : undefined}
            tabIndex={openTicket ? 0 : undefined}
            onClick={openTicket}
            onKeyDown={
              openTicket
                ? (e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    // Space would otherwise scroll the page.
                    e.preventDefault();
                    openTicket();
                  }
                : undefined
            }
            className={cn(
              "pointer-events-auto flex items-start gap-2 rounded-lg border bg-card p-3 shadow-lg",
              openTicket && "cursor-pointer",
            )}
          >
            <div className="flex-1">
              <p className="text-sm font-semibold">{toast.title}</p>
              <p className="text-xs text-muted-foreground">{toast.body}</p>
            </div>
            <button
              className="text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                boardStore.dismissToast(toast.id);
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
