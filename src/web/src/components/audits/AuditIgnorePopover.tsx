import { ChevronDown, Loader2 } from "lucide-react";
import { useId, useState } from "react";

import { AUDIT_DECISIONS, AUDIT_DECISION_LABELS } from "@shared/audit";
import type { AuditDecisionInput, AuditDecisionKind } from "@shared/audit";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AUDIT_DECISION_HINTS } from "@/lib/auditDisplay";

const NOTE_MAX_CHARS = 500;
const DEFAULT_DECISION: AuditDecisionKind = "false_positive";

interface AuditIgnorePopoverProps {
  /** The linked card is still in TODO, so it can be abandoned with the decision. */
  todoCard: boolean;
  disabled: boolean;
  onIgnore: (input: AuditDecisionInput) => Promise<boolean>;
}

export function AuditIgnorePopover({ todoCard, disabled, onIgnore }: AuditIgnorePopoverProps) {
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<AuditDecisionKind>(DEFAULT_DECISION);
  const [note, setNote] = useState("");
  const [abandonTodoCard, setAbandonTodoCard] = useState(false);
  const [pending, setPending] = useState(false);

  const submit = async (): Promise<void> => {
    setPending(true);
    const trimmed = note.trim();
    const ok = await onIgnore({ kind, note: trimmed === "" ? null : trimmed, abandonTodoCard: todoCard && abandonTodoCard });
    setPending(false);
    if (ok) setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={disabled}>
          Ignorer
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-2 p-3">
        <p className="text-sm font-medium">Ignorer ce constat</p>
        <div role="radiogroup" aria-label="Raison" className="space-y-1">
          {AUDIT_DECISIONS.map((decision) => (
            <label key={decision} className="flex items-start gap-2 text-sm">
              <input type="radio" name={`${fieldId}-decision`} className="mt-1" checked={kind === decision} onChange={() => setKind(decision)} />
              <span>
                {AUDIT_DECISION_LABELS[decision]}
                <span className="text-xs text-muted-foreground"> · {AUDIT_DECISION_HINTS[decision]}</span>
              </span>
            </label>
          ))}
        </div>
        <Textarea aria-label="Note (facultatif)" placeholder="Note (facultatif)" maxLength={NOTE_MAX_CHARS} className="min-h-[56px] text-xs" value={note} onChange={(event) => setNote(event.target.value)} />
        {todoCard && (
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={abandonTodoCard} onChange={(event) => setAbandonTodoCard(event.target.checked)} />
            Abandonner aussi la carte encore dans TODO
          </label>
        )}
        <p className="text-xs text-muted-foreground">Un nouveau problème au même endroit sera quand même signalé. Vous pourrez rétablir ce constat depuis « Masqués par une décision ».</p>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>Annuler</Button>
          <Button size="sm" disabled={pending} onClick={() => void submit()}>
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Ignorer
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
