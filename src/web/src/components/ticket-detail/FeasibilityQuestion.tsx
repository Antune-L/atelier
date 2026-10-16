import { useId, useRef, useState } from "react";
import { ACTIVE_STAGES } from "@shared/constants";
import type { FeasibilityAnswerInput, Ticket, TriageQuestion } from "@shared/schemas";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";

interface FeasibilityQuestionProps {
  ticket: Ticket;
  question: TriageQuestion;
  index: number;
  answer: string;
  submissionPending?: boolean;
  onAnswerChange: (value: string) => void;
  onSubmit: (input: FeasibilityAnswerInput) => Promise<{ started: boolean; id: string }>;
}

const MAX_FEASIBILITY_ANSWER_LENGTH = 10000;

export function feasibilityAnswersBlocked(ticket: Ticket): boolean {
  return ticket.feasibilityAnswers.some((candidate) => candidate.status === "running")
    || ticket.column !== "todo" || ticket.archived || ticket.kind !== "feature" || ticket.slotId !== null
    || (ticket.stage !== null && ACTIVE_STAGES.includes(ticket.stage));
}

/** The draft is owned by the parent so every answer of the report can be integrated at once. */
export function FeasibilityQuestion({ ticket, question, index, answer, submissionPending = false, onAnswerChange: setAnswer, onSubmit }: FeasibilityQuestionProps) {
  const id = useId();
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const run = ticket.feasibilityAnswers.find((candidate) => candidate.reportVersion === ticket.feasibilityReportVersion && candidate.questionIndex === index);
  const [posting, setPosting] = useState(false);
  const [accepted, setAccepted] = useState<{ id: string; previousId: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const postingRef = useRef(false);
  const awaitingPush = accepted !== null && (run?.id ?? null) === accepted.previousId && run?.id !== accepted.id;
  const pending = posting || awaitingPush || run?.status === "running";
  const blocked = feasibilityAnswersBlocked(ticket);
  const message = error ?? (run?.status === "failed" ? run.error : null);
  const answerDisabled = pending || run?.status === "done";
  const recommendation = question.recommendedAnswer;
  const recommendationTooLong = recommendation !== null && recommendation.length > MAX_FEASIBILITY_ANSWER_LENGTH;
  let submitLabel = "Intégrer la réponse";
  if (pending) submitLabel = "Intégration en cours…";
  else if (run?.status === "failed") submitLabel = "Réessayer";

  const submit = async (): Promise<void> => {
    if (postingRef.current || pending || submissionPending || blocked || run?.status === "done" || !answer.trim()) return;
    postingRef.current = true;
    setPosting(true);
    setError(null);
    try {
      const response = await onSubmit({ answer, questionIndex: index, revision: ticket.feasibilityRevision, reportVersion: ticket.feasibilityReportVersion });
      setAccepted({ id: response.id, previousId: run?.id ?? null });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      postingRef.current = false;
      setPosting(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void submit(); }} aria-busy={pending}>
      <Label htmlFor={id} className="block leading-relaxed">{question.question}</Label>
      {question.recommendedAnswer !== null && (
        <div className="space-y-2 rounded-md bg-muted/40 p-2.5">
          <p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">Réponse conseillée : {question.recommendedAnswer}</p>
          {recommendation !== null && recommendation.trim() !== "" && (
            <>
              <Button type="button" size="sm" variant="outline" className="h-auto min-h-8 whitespace-normal text-left" disabled={answerDisabled || recommendationTooLong}
                aria-describedby={recommendationTooLong ? `${id}-recommendation-limit` : undefined}
                onClick={() => { setAnswer(recommendation); answerRef.current?.focus(); }}>
                Utiliser la réponse conseillée
              </Button>
              {recommendationTooLong && (
                <p id={`${id}-recommendation-limit`} className="text-xs text-muted-foreground">
                  La réponse conseillée dépasse la limite de 10 000 caractères. Vous pouvez saisir une réponse plus courte manuellement.
                </p>
              )}
            </>
          )}
        </div>
      )}
      <Textarea ref={answerRef} id={id} value={answer} maxLength={MAX_FEASIBILITY_ANSWER_LENGTH} className="min-h-32" placeholder="Votre réponse…"
        onChange={(event) => setAnswer(event.target.value)} disabled={answerDisabled}
        aria-describedby={`${id}-status`} required />
      <Button type="submit" size="sm" variant="secondary" className="h-auto min-h-8 whitespace-normal" disabled={pending || submissionPending || blocked || run?.status === "done" || !answer.trim()}>
        {submitLabel}
      </Button>
      <div id={`${id}-status`} role={message ? "alert" : "status"} aria-live="polite">
        {message && <p className="text-sm text-danger">{message}</p>}
        {!message && pending && <p className="text-sm text-muted-foreground">La réponse est en cours d'intégration dans la description.</p>}
        {run?.status === "done" && <p className="text-sm">Réponse intégrée dans la description.</p>}
      </div>
    </form>
  );
}
