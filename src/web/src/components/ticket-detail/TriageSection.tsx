import { Check, ChevronDown, ChevronLeft, ChevronRight, ClipboardPaste, Copy, MessageSquareReply, RotateCw, Sparkles } from "lucide-react";
import { useId, useRef, useState } from "react";

import { AGENT_EFFORT_LABELS, AGENT_MODEL_LABELS, type AgentEffort, type AgentModel, type FeasibilityEngine } from "@shared/constants";
import type { FeasibilityAnswerBatchInput, FeasibilityAnswerInput, Ticket } from "@shared/schemas";
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
import { useLocalDraftList } from "@/hooks/useLocalDraft";
import { cn } from "@/lib/utils";
import { feasibilityEngineTabOptions, triageVerdictVariant } from "@/lib/display";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";
import { FeasibilityQuestion, feasibilityAnswersBlocked } from "./FeasibilityQuestion";

interface TriageSectionProps {
  ticket: Ticket;
  onTriage: () => Promise<void>;
  onTriagePlus: () => Promise<void>;
  onApplySuggestion: (model: AgentModel, effort: AgentEffort) => void;
  onToggleContext: (checked: boolean) => void;
  onFeasibilityEngineChange: (engine: FeasibilityEngine) => void;
  onReformulate: () => Promise<{ started: boolean }>;
  onAnswerFeasibility: (input: FeasibilityAnswerInput) => Promise<{ started: boolean; id: string }>;
  onAnswerFeasibilityBatch: (input: FeasibilityAnswerBatchInput) => Promise<{ started: boolean; ids: string[] }>;
  onApplyReformulation: (text: string) => Promise<void>;
  /** Quotes a feasibility question into the comment composer (TODO tickets only). */
  onReplyToQuestion?: (question: string) => void;
}

/** « Répondre » action quoting a feasibility question into the comment composer. */
export function ReplyToQuestionButton({ question, onReply }: { question: string; onReply: (question: string) => void }) {
  return (
    <Button type="button" size="sm" variant="ghost" onClick={() => onReply(question)}>
      <MessageSquareReply className="h-3.5 w-3.5" /> Répondre
    </Button>
  );
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
  onAnswerFeasibility,
  onAnswerFeasibilityBatch,
  onApplyReformulation,
  onReplyToQuestion,
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

  const questions = result?.questions ?? [];
  const questionPanelId = useId();
  const questionScope = `${ticket.id}:${ticket.feasibilityReportVersion}`;
  const [questionSelection, setQuestionSelection] = useState({ scope: questionScope, index: 0 });
  const questionButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedQuestionIndex = questionSelection.scope === questionScope && questions[questionSelection.index]
    ? questionSelection.index
    : 0;
  const selectQuestion = (index: number): void => {
    setQuestionSelection({ scope: questionScope, index });
    questionButtons.current[index]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
  const currentRuns = questions.map((_question, index) => ticket.feasibilityAnswers.find((candidate) =>
    candidate.reportVersion === ticket.feasibilityReportVersion && candidate.questionIndex === index));
  const [answers, setAnswerAt] = useLocalDraftList(
    questions.map((_question, index) => `feasibility:${ticket.id}:${ticket.feasibilityReportVersion}:${index}`),
    currentRuns.map((run) => run?.answer ?? ""),
  );
  const [submitting, setSubmitting] = useState(false);
  const [submittedQuestionKeys, setSubmittedQuestionKeys] = useState<string[]>([]);
  const [questionSubmissionErrors, setQuestionSubmissionErrors] = useState<Record<string, boolean>>({});
  const [batchError, setBatchError] = useState<string | null>(null);
  const batchAnswers = answers.flatMap((answer, questionIndex) => {
    const status = currentRuns[questionIndex]?.status;
    if (!answer.trim() || status === "done" || status === "running") return [];
    return [{ questionIndex, answer }];
  });
  const [acceptedIds, setAcceptedIds] = useState<string[] | null>(null);
  const arrived = acceptedIds !== null
    && acceptedIds.every((id) => ticket.feasibilityAnswers.some((run) => run.id === id));
  if (arrived) setAcceptedIds(null);
  const awaitingPush = acceptedIds !== null && !arrived;
  const submissionPending = submitting || awaitingPush;
  const batchDisabled = batchAnswers.length === 0 || submissionPending || feasibilityAnswersBlocked(ticket);

  const trackSubmission = async <T,>(send: () => Promise<T>, idsOf: (response: T) => string[], questionIndexes: number[]): Promise<T> => {
    setSubmitting(true);
    setSubmittedQuestionKeys(questionIndexes.map((index) => `${questionScope}:${index}`));
    setAcceptedIds(null);
    try {
      const response = await send();
      setAcceptedIds(idsOf(response));
      return response;
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswerQuestion = async (input: FeasibilityAnswerInput): Promise<{ started: boolean; id: string }> => {
    const key = `${questionScope}:${input.questionIndex}`;
    setQuestionSubmissionErrors((current) => ({ ...current, [key]: false }));
    try {
      return await trackSubmission(() => onAnswerFeasibility(input), (response) => [response.id], [input.questionIndex]);
    } catch (error) {
      setQuestionSubmissionErrors((current) => ({ ...current, [key]: true }));
      throw error;
    }
  };

  const handleAnswerBatch = async (): Promise<void> => {
    if (batchDisabled) return;
    setBatchError(null);
    try {
      await trackSubmission(
        () => onAnswerFeasibilityBatch({ revision: ticket.feasibilityRevision, reportVersion: ticket.feasibilityReportVersion, answers: batchAnswers }),
        (response) => response.ids,
        batchAnswers.map((answer) => answer.questionIndex),
      );
    } catch (error) {
      setBatchError(error instanceof Error ? error.message : String(error));
    }
  };

  const suggestion =
    ticket.triageVerdict === "implementable" && result?.suggestedModel && result.suggestedEffort
      ? { model: result.suggestedModel, effort: result.suggestedEffort }
      : null;
  const suggestionApplied =
    suggestion !== null && ticket.model === suggestion.model && ticket.effort === suggestion.effort;
  const analysis = result && (
    <div className="space-y-2">
      <Markdown content={result.summary} />
      {result.reasons.length > 0 && (
        <div>
          <SectionHeader>Raisons</SectionHeader>
          <ul className="list-disc pl-5">
            {result.reasons.map((reason) => <li key={reason}>{reason}</li>)}
          </ul>
        </div>
      )}
      {result.files.length > 0 && (
        <details className="group/files">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-xs text-muted-foreground [&::-webkit-details-marker]:hidden">
            <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open/files:rotate-180" />
            Fichiers concernés ({result.files.length})
          </summary>
          <ul className="mt-1 font-mono text-2xs text-muted-foreground">
            {result.files.map((file) => <li key={file}>{file}</li>)}
          </ul>
        </details>
      )}
      {result.solutions && result.solutions.length > 0 && (
        <div>
          <SectionHeader>Solutions envisageables</SectionHeader>
          <ul className="list-disc pl-5">
            {result.solutions.map((solution) => <li key={solution}>{solution}</li>)}
          </ul>
        </div>
      )}
    </div>
  );

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
          {questions.length > 0 ? (
            <details className="group rounded-md border border-border/60 px-3 py-2">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-xs text-muted-foreground [&::-webkit-details-marker]:hidden">
                <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
                Voir l’analyse et les points d’attention
              </summary>
              <div className="mt-3">{analysis}</div>
            </details>
          ) : analysis}
          {result.questions.length > 0 && (
            <div className="space-y-2">
              <SectionHeader aside={
                <span className="text-2xs font-normal text-muted-foreground" aria-live="polite">
                  {currentRuns.filter((run) => run?.status === "done").length} / {questions.length} intégrées
                </span>
              }>Questions à préciser</SectionHeader>
              <div className="feasibility-workspace">
                <div className="feasibility-workspace-layout overflow-hidden rounded-md border border-border">
                  <nav className="feasibility-question-nav bg-muted/30 p-1.5" aria-label="Questions de faisabilité">
                    {questions.map((question, index) => {
                      const run = currentRuns[index];
                      const key = `${questionScope}:${index}`;
                      const pending = run?.status === "running" || (submissionPending && submittedQuestionKeys.includes(key));
                      let failed = false;
                      let preview = answers[index]?.trim() || "À répondre";
                      let indicator = <span>{index + 1}</span>;
                      if (run?.status === "done") {
                        preview = "Réponse intégrée";
                        indicator = <Check className="h-3 w-3" />;
                      } else if (pending) {
                        preview = "Intégration en cours…";
                        indicator = <RotateCw className="h-3 w-3 animate-spin" />;
                      } else if (run?.status === "failed" || questionSubmissionErrors[key]) {
                        failed = true;
                        preview = "Échec, à réessayer";
                      }
                      return (
                        <button key={`${questionScope}:${index}`} type="button"
                          ref={(element) => { questionButtons.current[index] = element; }}
                          aria-current={selectedQuestionIndex === index ? "true" : undefined}
                          aria-controls={`${questionPanelId}-${index}`} title={question.question}
                          onClick={() => selectQuestion(index)}
                          className={cn("feasibility-question-link flex gap-2 rounded-md border border-transparent p-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                            selectedQuestionIndex === index && "border-border bg-accent/70")}
                        >
                          <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border text-2xs text-muted-foreground",
                            run?.status === "done" && "border-brand/50 bg-brand/10 text-brand",
                            failed && "border-danger/50 text-danger")}>{indicator}</span>
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 text-xs font-medium leading-relaxed">{question.question}</span>
                            <span className={cn("mt-0.5 block truncate text-2xs text-muted-foreground", failed && "text-danger")}>{preview}</span>
                          </span>
                        </button>
                      );
                    })}
                  </nav>
                  <div className="flex min-w-0 flex-1 flex-col gap-4 p-3">
                    {questions.map((question, index) => (
                      <div key={`${questionScope}:${index}`} id={`${questionPanelId}-${index}`} hidden={selectedQuestionIndex !== index} className="space-y-2">
                        <p className="text-2xs text-muted-foreground">Question {index + 1} sur {questions.length}</p>
                        <FeasibilityQuestion ticket={ticket} question={question} index={index}
                          answer={answers[index] ?? ""} submissionPending={submissionPending} onAnswerChange={(value) => setAnswerAt(index, value)} onSubmit={handleAnswerQuestion} />
                        {ticket.column === "todo" && onReplyToQuestion && (
                          <ReplyToQuestionButton question={question.question} onReply={onReplyToQuestion} />
                        )}
                      </div>
                    ))}
                    {questions.length > 1 && (
                      <div className="order-first flex justify-between gap-2 border-b border-border pb-3">
                        <Button type="button" size="sm" variant="ghost" disabled={selectedQuestionIndex === 0} onClick={() => selectQuestion(selectedQuestionIndex - 1)}>
                          <ChevronLeft className="h-3.5 w-3.5" /> Précédente
                        </Button>
                        <Button type="button" size="sm" variant="outline" disabled={selectedQuestionIndex === questions.length - 1} onClick={() => selectQuestion(selectedQuestionIndex + 1)}>
                          Suivante <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {result.questions.length > 1 && (
                <div className="sticky bottom-0 z-10 mt-3 space-y-1 border-t border-border bg-card py-2">
                  <Button size="sm" variant="secondary" disabled={batchDisabled} onClick={() => void handleAnswerBatch()}>
                    Intégrer toutes les réponses ({batchAnswers.length})
                  </Button>
                  {batchError && <p role="alert" className="text-sm text-danger">{batchError}</p>}
                </div>
              )}
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
            <span>Utiliser l’analyse au lancement</span>
            <Switch
              checked={ticket.feasibilityContext}
              onCheckedChange={onToggleContext}
              aria-label="Utiliser l’analyse au lancement"
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
        <Label id={engineLabelId}>Moteur d'analyse</Label>
        <Tabs
          options={feasibilityEngineTabOptions(codex)}
          value={ticket.feasibilityEngine ?? ticket.orchestrator}
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
          {ticket.triageStatus === "none" && !running ? "Analyser le ticket" : "Relancer l’analyse"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          title="Analyse approfondie : faisabilité + solutions via sous-agents parallèles"
          disabled={running}
          onClick={() => void onTriagePlus()}
        >
          <Sparkles className="h-4 w-4" />
          Analyse approfondie
        </Button>
        <Button
          size="sm"
          variant="secondary"
          title="Reformuler proprement le besoin à partir de la description et de l'analyse"
          disabled={reformulating || running}
          onClick={() => void handleReformulate()}
        >
          {reformulating ? <RotateCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Reformuler
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
