import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { errorMessage } from "@/lib/errors";
import {
  SCHEDULE_HINT,
  SCHEDULE_TOO_SOON_ERROR,
  defaultScheduleValue,
  isScheduleTooSoon,
} from "@/lib/scheduledLaunch";

const PANE_TITLE = "Programmer le lancement";
const SCHEDULE_FAILED = "Programmation refusée";

interface SchedulePaneProps {
  /** Pre-selected instant; defaults to one hour ahead. */
  initialValue?: number | null;
  confirmLabel: string;
  backLabel?: string;
  onBack: () => void;
  /** Rejects with the message to show under the picker. */
  onSubmit: (scheduledStartAt: number) => Promise<void>;
}

/** Popover pane choosing the date and time of a programmed launch. */
export function SchedulePane({ initialValue = null, confirmLabel, backLabel = "Retour", onBack, onSubmit }: SchedulePaneProps) {
  const [value, setValue] = useState(() => initialValue ?? defaultScheduleValue(Date.now()));
  const [minDate] = useState(() => new Date());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (): Promise<void> => {
    if (isScheduleTooSoon(value, Date.now())) {
      setError(SCHEDULE_TOO_SOON_ERROR);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onSubmit(value);
    } catch (e) {
      setError(errorMessage(e, SCHEDULE_FAILED));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 p-2">
      <p className="text-sm font-medium">{PANE_TITLE}</p>
      <DateTimePicker
        value={value}
        minDate={minDate}
        disabled={busy}
        onChange={(next) => {
          setValue(next);
          setError(null);
        }}
      />
      <p className="text-xs text-warning">{SCHEDULE_HINT}</p>
      {error !== null && <p role="alert" className="text-xs text-danger">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onBack}>
          {backLabel}
        </Button>
        <Button type="button" size="sm" disabled={busy} onClick={() => void submit()}>
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
