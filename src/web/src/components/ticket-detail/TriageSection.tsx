import { Check, ChevronDown, ClipboardPaste, Copy, RotateCw, Sparkles } from "lucide-react";
import { useId, useState } from "react";

import { AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, type AgentEffort, type AgentModel, type FeasibilityEngine } from "@shared/constants";
import type { Ticket } from "@shared/schemas";
import { TRIAGE_VERDICT_LABELS, parseTriageReport } from "@shared/schemas";

import { TerminalView } from "@/components/TerminalView";
import { SectionHeader } from "@/components/ticket-detail/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { Markdown } from "@/components/ui/markdown";
import { Switch } from "@/components/ui/switch";
import { Tabs } from "@/components/ui/tabs";
import { useCapabilities } from "@/hooks/useCapabilities";
import { cn } from "@/lib/utils";
import { DEFAULT_FEASIBILITY_ENGINE, feasibilityEngineTabOptions, triageVerdictVariant } from "@/lib/display";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";

interface TriageSectionProps {
  ticket: Ticket;
  onTriage: () => Promise<void>;
  onTriagePlus: () => Promise<void>;
  onApplySuggestion: (model: AgentModel, effort: AgentEffort) => void;
  onToggleContext: (checked: boolean) => void;
  onFeasibilityEngineChange: (engine: FeasibilityEngine) => void;
  onReformulate: () => Promise<{ started: boolean }>;
  onApplyReformulation: (text: string) => Promise<void>;
}

/** How long the reformulation copy/apply buttons show their "Copié"/"Appliqué" confirmation. */
const REFORMULATE_FEEDBACK_MS = 1500;

/** Feasibility analysis, model suggestion and need reformulation — TODO tickets only. */
export function TriageSection({
  ticket,
  onTriage,
  onTriagePlus,
  onApplySuggestion,
  onToggleContext,
  onFeasibilityEngineChange,
  onReformulate,
  onApplyReformulation,
}: TriageSectionProps) {
  const { codex } = useCapabilities();
  const engineLabelId = useId();
  const running = ticket.triageStatus === "running";
  const result = parseTriageReport(ticket.triageReport);
  // Reformulation runs async server-side: status + result live on the ticket and arrive over WS.
  const reformulating = ticket.reformulateStatus === "running";
  const reformulation = ticket.reformulateStatus === "done" ? ticket.reformulation : null;
  const statusError = ticket.reformulateStatus === "failed" ? ticket.reformulation : null;
  // Only a failed POST (e.g. 409 while one is already running) is tracked locally; the run's own
  // failure reason comes from the ticket.
  const [startError, setStartError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const reformulateError = startError ?? statusError;

  const handleReformulate = async (): Promise<void> => {
    setStartError(null);
    try {
      await onReformulate();
    } catch (error) {
      setStartError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleCopyReformulation = (event: React.MouseEvent): void => {
    event.preventDefault();
    if (!reformulation) return;
    void navigator.clipboard.writeText(reformulation).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), REFORMULATE_FEEDBACK_MS);
    });
  };

  const handleApplyReformulation = async (event: React.MouseEvent): Promise<void> => {
    event.preventDefault();
    if (!reformulation) return;
    setStartError(null);
    try {
      await onApplyReformulation(reformulation);
      setApplied(true);
      setTimeout(() => setApplied(false), REFORMULATE_FEEDBACK_MS);
    } catch (error) {
      setStartError(error instanceof Error ? error.message : String(error));
    }
  };

  const suggestion =
    ticket.triageVerdict === "implementable" && result?.suggestedModel && result.suggestedEffort
      ? { model: result.suggestedModel, effort: result.suggestedEffort }
      : null;
  const suggestionApplied =
    suggestion !== null && ticket.model === suggestion.model && ticket.effort === suggestion.effort;

  return (
    <section className="space-y-2">
      <SectionHeader
        aside={
          ticket.triageStatus === "done" && ticket.triageVerdict ? (
            <Badge variant={triageVerdictVariant(ticket.triageVerdict)}>
              {TRIAGE_VERDICT_LABELS[ticket.triageVerdict]}
            </Badge>
          ) : undefined
        }
      >
        Faisabilité
      </SectionHeader>

      {ticket.triageStatus === "done" && result && (
        <div className="space-y-2 text-sm">
          <Markdown content={result.summary} />
          {result.reasons.length > 0 && (
            <div>
              <SectionHeader>Raisons</SectionHeader>
              <ul className="list-disc pl-5">
                {result.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
          {result.questions.length > 0 && (
            <div>
              <SectionHeader>Questions</SectionHeader>
              <ul className="list-disc pl-5 text-warning">
                {result.questions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ul>
            </div>
          )}
          {result.files.length > 0 && (
            <ul className="font-mono text-2xs text-muted-foreground">
              {result.files.map((file) => (
                <li key={file}>{file}</li>
              ))}
            </ul>
          )}
          {result.solutions && result.solutions.length > 0 && (
            <div>
              <SectionHeader>Solutions envisageables</SectionHeader>
              <ul className="list-disc pl-5">
                {result.solutions.map((solution) => (
                  <li key={solution}>{solution}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {suggestion && (
        <div className="rounded-md border border-dashed p-2 text-sm">
          <SectionHeader>Suggestion agent d'implémentation</SectionHeader>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span>
              Modèle <strong>{AGENT_MODEL_LABELS[suggestion.model]}</strong> · Effort{" "}
              <strong>{AGENT_EFFORT_LABELS[suggestion.effort]}</strong>
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={suggestionApplied}
              onClick={() => onApplySuggestion(suggestion.model, suggestion.effort)}
            >
              {suggestionApplied ? "Appliquée" : "Appliquer"}
            </Button>
          </div>
        </div>
      )}

      {ticket.column === "todo" &&
        ticket.triageStatus === "done" &&
        ticket.triageVerdict === "implementable" && (
          <label className="flex items-center justify-between gap-2 text-sm">
            <span>Injecter le contexte de faisabilité dans le contrat</span>
            <Switch
              checked={ticket.feasibilityContext}
              onCheckedChange={onToggleContext}
              aria-label="Injecter le contexte de faisabilité dans le contrat"
            />
          </label>
        )}

      {ticket.triageStatus === "failed" && (
        <div className="space-y-2 text-sm">
          <p className="text-danger">L'analyse a échoué.</p>
          {ticket.triageReport && (
            <details>
              <summary className={cn("cursor-pointer", FIELD_LABEL_CLASSES)}>
                Détails
              </summary>
              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-muted/40 p-2 text-2xs">
                {ticket.triageReport}
              </pre>
            </details>
          )}
        </div>
      )}

      {running && <TerminalView ticketId={ticket.id} />}

      <div className="flex flex-col items-start gap-1.5">
        <Label id={engineLabelId}>Modèle d'analyse</Label>
        <Tabs
          options={feasibilityEngineTabOptions(codex)}
          value={ticket.feasibilityEngine ?? DEFAULT_FEASIBILITY_ENGINE}
          onChange={onFeasibilityEngineChange}
          aria-labelledby={engineLabelId}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          title={running ? "Tuer la session de faisabilité bloquée et la relancer" : undefined}
          onClick={() => void onTriage()}
        >
          {running && <RotateCw className="h-4 w-4" />}
          {ticket.triageStatus === "none" && !running ? "Analyse" : "Relancer l'analyse"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          title="Analyse approfondie : faisabilité + solutions via sous-agents parallèles"
          disabled={running}
          onClick={() => void onTriagePlus()}
        >
          <Sparkles className="h-4 w-4" />
          Analyse +
        </Button>
        <Button
          size="sm"
          variant="secondary"
          title="Reformuler proprement le besoin à partir de la description et de l'analyse"
          disabled={reformulating || running}
          onClick={() => void handleReformulate()}
        >
          {reformulating ? <RotateCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Reformuler le besoin
        </Button>
      </div>

      {reformulateError && <p className="text-sm text-danger">{reformulateError}</p>}

      {reformulation && (
        <details className="group">
          <summary className={cn("flex cursor-pointer items-center justify-between gap-2", FIELD_LABEL_CLASSES)}>
            <span className="flex items-center gap-2">
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              Besoin reformulé
            </span>
            <span className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={(event) => void handleApplyReformulation(event)}>
                {applied ? <Check className="h-4 w-4" /> : <ClipboardPaste className="h-4 w-4" />}
                {applied ? "Appliqué" : "Appliquer"}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCopyReformulation}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copié" : "Copier"}
              </Button>
            </span>
          </summary>
          <div className="mt-2 max-h-64 overflow-y-auto">
            <Markdown content={reformulation} />
          </div>
        </details>
      )}
    </section>
  );
}
