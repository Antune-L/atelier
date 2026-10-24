import type { LucideIcon } from "lucide-react";
import { useState } from "react";

import type { Ticket } from "@shared/schemas";

import { SchedulePane } from "@/components/SchedulePane";
import { CONFIRM_POPOVER_CLASSES, ConfirmBody } from "@/components/ui/confirm";
import { SplitButton, SplitMenuItem } from "@/components/ui/split-button";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";

type LaunchMenuPane = "list" | "confirm" | "schedule";

interface LaunchConfirm {
  title: string;
  description: string;
  confirmLabel: string;
}

interface LaunchSplitButtonProps {
  ticket: Ticket;
  label: string;
  Icon?: LucideIcon;
  title?: string;
  confirm: LaunchConfirm;
  /** The immediate launch is refused (e.g. triage running); scheduling stays available. */
  startDisabled: boolean;
  busy: boolean;
  onStart: () => Promise<void>;
  onError: (message: string) => void;
}

/** Primary launch button of a todo feature card, with a menu to launch now or program the launch. */
export function LaunchSplitButton({ ticket, label, Icon, title, confirm, startDisabled, busy, onStart, onError }: LaunchSplitButtonProps) {
  const [pane, setPane] = useState<LaunchMenuPane | null>(null);
  const scheduled = ticket.scheduledStartAt !== null;

  const cancelSchedule = async (): Promise<void> => {
    setPane(null);
    try {
      await api.scheduleTicket(ticket.id, null);
    } catch (error) {
      onError(errorMessage(error, "Annulation de la programmation refusée"));
    }
  };

  const schedule = async (scheduledStartAt: number): Promise<void> => {
    await api.scheduleTicket(ticket.id, scheduledStartAt);
    setPane(null);
  };

  let content = null;
  if (pane === "confirm") {
    content = (
      <ConfirmBody
        title={confirm.title}
        description={confirm.description}
        confirmLabel={confirm.confirmLabel}
        onConfirm={() => {
          setPane(null);
          return onStart();
        }}
        onDismiss={() => setPane(null)}
      />
    );
  } else if (pane === "schedule") {
    content = (
      <SchedulePane
        initialValue={ticket.scheduledStartAt}
        confirmLabel="Programmer"
        onBack={() => setPane("list")}
        onSubmit={schedule}
      />
    );
  } else if (scheduled) {
    content = (
      <>
        <SplitMenuItem label="Lancer maintenant" description="Annule la programmation" disabled={startDisabled} onClick={() => setPane("confirm")} />
        <SplitMenuItem label="Modifier l’heure…" onClick={() => setPane("schedule")} />
        <SplitMenuItem label="Annuler la programmation" destructive onClick={() => void cancelSchedule()} />
      </>
    );
  } else {
    content = (
      <>
        <SplitMenuItem label="Lancer maintenant" description="Action par défaut" disabled={startDisabled} onClick={() => setPane("confirm")} />
        <SplitMenuItem label="Programmer le lancement…" description="Choisir la date et l’heure" onClick={() => setPane("schedule")} />
      </>
    );
  }

  return (
    <SplitButton
      label={label}
      Icon={Icon}
      title={title}
      className="w-full"
      contentClassName={pane === "confirm" ? CONFIRM_POPOVER_CLASSES : undefined}
      mainDisabled={startDisabled || busy}
      menuDisabled={busy}
      menuLabel="Autres façons de lancer"
      open={pane !== null}
      onOpenChange={(next) => setPane(next ? "list" : null)}
      onClick={() => setPane("confirm")}
    >
      {content}
    </SplitButton>
  );
}
