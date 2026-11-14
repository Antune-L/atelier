import { useId, useState } from "react";
import type { ButtonHTMLAttributes } from "react";

import { AUTONOMOUS_MINUTE_MS, autonomousResumeSchema } from "@shared/autonomous";
import type { AutonomousResumeInput, AutonomousResumeTarget, AutonomousState } from "@shared/autonomous";
import { QUALITY_MAX_OBSERVATION_LENGTH, latestAcceptanceSnapshot } from "@shared/quality";
import type { QualityCriteriaSnapshot, QualityGate, TicketQuality } from "@shared/quality";
import type { Ticket } from "@shared/schemas";

import { QualityCriterionReference, qualityCriterionRows } from "@/components/ticket-detail/QualityCriteriaPanel";
import type { QualityCriterionRow } from "@/components/ticket-detail/QualityCriteriaPanel";
import { QualityResult } from "@/components/ticket-detail/QualityResults";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api } from "@/lib/api";
import { plural } from "@/lib/auditDisplay";
import { formatDateTime } from "@/lib/display";
import { formatQualityCriterionText } from "@/lib/qualityMessages";
import { cn } from "@/lib/utils";

type TargetAction = AutonomousResumeTarget["action"];
type ExtensionField = "additionalCorrections" | "additionalMinutes" | "additionalStarts";
type MissingLimit = "deadline" | "starts" | "corrections";

interface TargetDraft {
  selected: boolean;
  action: TargetAction;
  observationOpen: boolean;
  observation: string;
}

const ACTION_OPTIONS: Array<{ value: TargetAction; label: string }> = [
  { value: "verify", label: "Revérifier seulement" },
  { value: "fix", label: "Corriger le code" },
];
const EXTENSION_FIELDS: Array<{ field: ExtensionField; label: string }> = [
  { field: "additionalCorrections", label: "Corrections supplémentaires" },
  { field: "additionalMinutes", label: "Minutes supplémentaires" },
  { field: "additionalStarts", label: "Démarrages supplémentaires" },
];
const INITIAL_EXTENSION: Record<ExtensionField, string> = { additionalCorrections: "", additionalMinutes: "", additionalStarts: "" };
const EXTENSION_ERROR = "Indiquez au moins une allocation entière positive dans les limites autorisées.";
const MISSING_LIMIT_LABELS: Record<MissingLimit, string> = {
  deadline: "l’échéance est dépassée",
  starts: "les démarrages sont épuisés",
  corrections: "aucune correction ne reste pour corriger le code",
};
const LINK_CLASS = "text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50";

export function RecoveryLink({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" className={cn(LINK_CLASS, className)} {...props} />;
}

function isTargetAction(value: string): value is TargetAction {
  return ACTION_OPTIONS.some((option) => option.value === value);
}

function defaultDraft(row: QualityCriterionRow): TargetDraft {
  return { selected: true, action: row.evidence?.status === "failed" ? "fix" : "verify", observationOpen: false, observation: "" };
}

function useTargetDrafts(rows: QualityCriterionRow[]) {
  const [overrides, setOverrides] = useState<Record<string, Partial<TargetDraft>>>({});
  const drafts = rows.map((row) => ({ row, draft: { ...defaultDraft(row), ...overrides[row.criterion.id] } }));
  const update = (criterionId: string, patch: Partial<TargetDraft>): void => setOverrides((current) => ({ ...current, [criterionId]: { ...current[criterionId], ...patch } }));
  const selectAll = (selected: boolean): void => setOverrides((current) => Object.fromEntries(rows.map((row) => [row.criterion.id, { ...current[row.criterion.id], selected }])));
  return { drafts, update, selectAll };
}

function missingLimits(state: AutonomousState, fixSelected: boolean, now: number): MissingLimit[] {
  const execution = state.execution;
  if (!execution) return [];
  const missing: MissingLimit[] = [];
  if (now >= execution.deadlineAt) missing.push("deadline");
  if (execution.starts.length >= execution.maxStarts) missing.push("starts");
  if (fixSelected && state.corrections >= execution.maxCorrections) missing.push("corrections");
  return missing;
}

function targetInput(row: QualityCriterionRow, draft: TargetDraft): AutonomousResumeTarget {
  const observation = draft.observation.trim();
  if (!draft.observationOpen || observation === "") return { criterionId: row.criterion.id, action: draft.action };
  return { criterionId: row.criterion.id, action: draft.action, observation };
}

function selectionSummary(verifyCount: number, fixCount: number, reserveCount: number): string {
  const parts: string[] = [];
  if (verifyCount > 0) parts.push(`${verifyCount} à revérifier`);
  if (fixCount > 0) parts.push(`${fixCount} à corriger`);
  if (reserveCount > 0) parts.push(`${plural(reserveCount, "laissé", "laissés")} en réserve sur la PR`);
  return `${parts.join(", ")}.`;
}

function TargetRow({ row, draft, creator, disabled, onChange }: { row: QualityCriterionRow; draft: TargetDraft; creator: QualityCriteriaSnapshot["createdBy"]; disabled: boolean; onChange: (patch: Partial<TargetDraft>) => void }) {
  const id = useId();
  const text = formatQualityCriterionText(row.criterion, creator);
  return (
    <div className="space-y-2 px-3 py-3">
      <div className="flex items-start gap-2">
        <input id={`${id}-selected`} type="checkbox" className="mt-0.5" disabled={disabled} checked={draft.selected} onChange={(event) => onChange({ selected: event.target.checked })} />
        <div className="min-w-0 flex-1 space-y-1">
          <label htmlFor={`${id}-selected`} className="line-clamp-2 text-xs" title={text}>{text}</label>
          <QualityCriterionReference criterion={row.criterion} index={row.index} />
        </div>
        <QualityResult status={row.result} />
      </div>
      {draft.selected && <div className="space-y-2 pl-5">
        <ToggleGroup type="single" variant="outline" size="sm" className="flex-wrap justify-start" aria-label="Action demandée" value={draft.action} disabled={disabled} onValueChange={(value) => { if (isTargetAction(value)) onChange({ action: value }); }}>
          {ACTION_OPTIONS.map((option) => <ToggleGroupItem key={option.value} value={option.value} className="h-7 text-xs">{option.label}</ToggleGroupItem>)}
        </ToggleGroup>
        <RecoveryLink disabled={disabled} aria-expanded={draft.observationOpen} onClick={() => onChange({ observationOpen: !draft.observationOpen })}>{draft.observationOpen ? "Masquer l’observation" : "Ajouter une observation"}</RecoveryLink>
        {draft.observationOpen && <div className="space-y-1">
          <Label htmlFor={`${id}-observation`} className="text-xs">Vérifications effectuées et résultat observé</Label>
          <Textarea id={`${id}-observation`} disabled={disabled} maxLength={QUALITY_MAX_OBSERVATION_LENGTH} value={draft.observation} onChange={(event) => onChange({ observation: event.target.value })} />
        </div>}
      </div>}
    </div>
  );
}

export function AutonomousResumeSection({ ticket, state, quality, gate, pending, act }: {
  ticket: Ticket;
  state: AutonomousState;
  quality: TicketQuality;
  gate: QualityGate;
  pending: boolean;
  act: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const rows = qualityCriterionRows(quality, gate).filter((row) => row.criterion.required && !row.verified);
  const { drafts, update, selectAll } = useTargetDrafts(rows);
  const [extension, setExtension] = useState(INITIAL_EXTENSION);
  const [extensionOpen, setExtensionOpen] = useState(false);
  const [extensionError, setExtensionError] = useState<string | null>(null);
  const execution = state.execution;
  const creator = latestAcceptanceSnapshot(quality)?.createdBy ?? "system";
  const selected = drafts.filter(({ draft }) => draft.selected);
  const fixCount = selected.filter(({ draft }) => draft.action === "fix").length;
  const verifyCount = selected.length - fixCount;
  const missing = missingLimits(state, fixCount > 0, Date.now());
  const extensionShown = missing.length > 0 || extensionOpen;
  const allocated = Object.values(extension).some((value) => value !== "");
  const extending = execution !== undefined && (missing.length > 0 || (extensionOpen && allocated));
  const targeted = rows.length > 0;
  const allSelected = targeted && selected.length === rows.length;

  let submitLabel = targeted ? `Continuer sur ${plural(selected.length, "critère")}` : "Reprendre avec les limites restantes";
  if (extending) submitLabel = "Accorder et continuer";
  if (targeted && selected.length === 0) submitLabel = "Sélectionnez un critère";

  const submit = async (): Promise<void> => {
    const input: AutonomousResumeInput = { action: extending ? "extend" : "resume" };
    if (targeted) input.targets = selected.map(({ row, draft }) => targetInput(row, draft));
    if (extending) {
      for (const { field } of EXTENSION_FIELDS) {
        if (extension[field] !== "") input[field] = Number(extension[field]);
      }
    }
    const parsed = autonomousResumeSchema.safeParse(input);
    if (!parsed.success || (extending && !allocated)) {
      setExtensionError(EXTENSION_ERROR);
      return;
    }
    setExtensionError(null);
    await act(async () => {
      await api.resumeAutonomous(ticket.id, parsed.data);
      setExtension(INITIAL_EXTENSION);
      setExtensionOpen(false);
    });
  };

  return (
    <div className="space-y-3">
      {targeted && <section className="space-y-2">
        <p className="font-medium">À reprendre · {plural(rows.length, "critère requis", "critères requis")} sur {gate.requiredCriteria.length} {rows.length > 1 ? "ne sont pas vérifiés" : "n’est pas vérifié"}</p>
        <label className="flex items-center gap-2"><input type="checkbox" disabled={pending} checked={allSelected} ref={(element) => { if (element) element.indeterminate = selected.length > 0 && !allSelected; }} onChange={(event) => selectAll(event.target.checked)} />Tout sélectionner</label>
        <div className="divide-y divide-border rounded border border-border bg-background">
          {drafts.map(({ row, draft }) => <TargetRow key={row.criterion.id} row={row} draft={draft} creator={creator} disabled={pending} onChange={(patch) => update(row.criterion.id, patch)} />)}
        </div>
        <p className="text-muted-foreground">{selectionSummary(verifyCount, fixCount, rows.length - selected.length)}</p>
      </section>}
      {execution && <p className="text-muted-foreground">Il reste {plural(Math.max(0, execution.maxStarts - execution.starts.length), "démarrage")} et {plural(Math.max(0, execution.maxCorrections - state.corrections), "correction")}, jusqu’au {formatDateTime(execution.deadlineAt)}.</p>}
      {execution && extensionShown && <div className="space-y-2">
        {missing.length > 0 && <p className="text-warning">Les limites restantes ne couvrent pas cette reprise : {missing.map((limit) => MISSING_LIMIT_LABELS[limit]).join(", ")}. Accordez des limites supplémentaires pour continuer.</p>}
        <div className="grid gap-2 sm:grid-cols-3">
          {EXTENSION_FIELDS.map(({ field, label }) => <div key={field} className="space-y-1"><Label htmlFor={`extend-${field}`} className="text-xs">{label}</Label><Input id={`extend-${field}`} type="number" min={1} value={extension[field]} disabled={pending} onChange={(event) => setExtension({ ...extension, [field]: event.target.value })} /></div>)}
        </div>
        {extension.additionalMinutes !== "" && Number.isFinite(Number(extension.additionalMinutes)) && <p className="text-muted-foreground">Nouvelle échéance proposée : {formatDateTime(Math.max(Date.now(), execution.deadlineAt) + Number(extension.additionalMinutes) * AUTONOMOUS_MINUTE_MS)}.</p>}
        <p className="text-muted-foreground">Seules les allocations indiquées sont ajoutées. Les consommations et réserves existantes sont conservées et cette décision est enregistrée.</p>
      </div>}
      {extensionError && <p role="alert" className="text-danger">{extensionError}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" disabled={pending || (targeted && selected.length === 0)} onClick={() => void submit()}>{submitLabel}</Button>
        {execution && missing.length === 0 && !extensionOpen && <RecoveryLink disabled={pending} onClick={() => setExtensionOpen(true)}>Ajouter des limites</RecoveryLink>}
      </div>
    </div>
  );
}
