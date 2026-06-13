import { X } from "lucide-react";

import { boardStore } from "@/lib/store";
import { useBoard } from "@/hooks/useBoard";

export function Toaster() {
  const { toasts } = useBoard();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-2 rounded-lg border bg-card p-3 shadow-lg"
        >
          <div className="flex-1">
            <p className="text-sm font-semibold">{toast.title}</p>
            <p className="text-xs text-muted-foreground">{toast.body}</p>
          </div>
          <button
            className="text-muted-foreground hover:text-foreground"
            onClick={() => boardStore.dismissToast(toast.id)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
