import { CalendarDays } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatScheduleDay, timeInputValue, withDay, withTime } from "@/lib/scheduledLaunch";

interface DateTimePickerProps {
  /** Selected instant, epoch ms. */
  value: number;
  onChange: (value: number) => void;
  /** Days before this instant's day are disabled in the calendar. */
  minDate: Date;
  disabled?: boolean;
}

/** Day button opening a calendar plus a time input; emits the combined instant in epoch ms. */
export function DateTimePicker({ value, onChange, minDate, disabled = false }: DateTimePickerProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const day = new Date(value);
  const firstDay = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());

  return (
    <div className="flex gap-2">
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label="Date du lancement"
            className="h-9 min-w-0 flex-1 justify-start px-3 font-normal"
          >
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{formatScheduleDay(value)}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            required
            autoFocus
            selected={day}
            defaultMonth={day}
            disabled={{ before: firstDay }}
            onSelect={(next) => {
              onChange(withDay(value, next));
              setCalendarOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <Input
        type="time"
        aria-label="Heure"
        disabled={disabled}
        className="w-24 font-mono"
        value={timeInputValue(value)}
        onChange={(event) => {
          const next = withTime(value, event.target.value);
          if (next !== null) onChange(next);
        }}
      />
    </div>
  );
}
