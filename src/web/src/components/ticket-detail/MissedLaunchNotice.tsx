import { useState } from "react";

import { SchedulePane } from "@/components/SchedulePane";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBusyAction } from "@/hooks/useBusyAction";
import { api } from "@/lib/api";
import { formatScheduleDate, formatScheduleTime } from "@/lib/scheduledLaunch";

interface MissedLaunchNoticeProps {
  ticketId: string;
  missedAt: number;
}

/** Warning shown when the programmed launch time passed while the app was not running. */
export function MissedLaunchNotice({ ticketId, missedAt }: MissedLaunchNoticeProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const dismiss = useBusyAction();

  return (
    <div role="alert" className="rounded-md border border-warning/30 bg-warning/5 p-3 text-sm text-warning">
      Lancement programmé du {formatScheduleDate(missedAt)} à {formatScheduleTime(missedAt)} non effectué : l’application n’était pas active à l’heure prévue.
      <div className="mt-2 flex gap-2">
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger>
            <Button size="sm" variant="outline" className="text-foreground" disabled={dismiss.busy}>
              Reprogrammer
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80">
            <SchedulePane
              confirmLabel="Programmer"
              backLabel="Annuler"
              onBack={() => setPickerOpen(false)}
              onSubmit={async (scheduledStartAt) => {
                await api.scheduleTicket(ticketId, scheduledStartAt);
                setPickerOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
        <Button
          size="sm"
          variant="ghost"
          className="text-foreground"
          disabled={dismiss.busy}
          onClick={() => void dismiss.run(() => api.scheduleTicket(ticketId, null), "Impossible d’ignorer ce message")}
        >
          Ignorer
        </Button>
      </div>
      {dismiss.error !== null && <p className="mt-2 text-xs text-danger">{dismiss.error}</p>}
    </div>
  );
}
