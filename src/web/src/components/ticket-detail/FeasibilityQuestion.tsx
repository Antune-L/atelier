import { useId, useRef, useState } from "react";
import { ACTIVE_STAGES } from "@shared/constants";
import type { FeasibilityAnswerInput, Ticket, TriageQuestion } from "@shared/schemas";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { useLocalDraft } from "@/hooks/useLocalDraft";

interface FeasibilityQuestionProps {
  ticket: Ticket;
  question: TriageQuestion;
  index: number;
  onSubmit: (input: FeasibilityAnswerInput) => Promise<{ started: boolean; id: string }>;
  /** Incrementing this fills a blank draft with the usable recommendation (never submits). */
  fillRecommendedSignal?: number;
}

/** Each report/question owns a durable draft, including after a failed or interrupted run. */
export function FeasibilityQuestion({ ticket, question, index, onSubmit, fillRecommendedSignal = 0 }: FeasibilityQuestionProps) {
  const id = useId();
  const run = ticket.feasibilityAnswers.find((candidate) => candidate.reportVersion === ticket.feasibilityReportVersion && candidate.questionIndex === index);
  const [answer, setAnswer] = useLocalDraft(`feasibility:${ticket.id}:${ticket.feasibilityReportVersion}:${index}`, run?.answer ?? "");
  const [posting, setPosting] = useState(false);
  const [accepted, setAccepted] = useState<{ id: string; previousId: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const postingRef = useRef(false);
  const awaitingPush = accepted !== null && (run?.id ?? null) === accepted.previousId && run?.id !== accepted.id;
  const pending = posting || awaitingPush || run?.status === "running";
  const blocked = ticket.feasibilityAnswers.some((candidate) => candidate.status === "running")
    || ticket.column !== "todo" || ticket.archived || ticket.kind !== "feature" || ticket.slotId !== null
    || (ticket.stage !== null && ACTIVE_STAGES.includes(ticket.stage));
  const message = error ?? (run?.status === "failed" ? run.error : null);
  const answerDisabled = pending || run?.status === "done";
  const recommendation = question.recommendedAnswer;
  const recommendationTooLong = recommendation !== null && recommendation.length > 10000;
  const fillable = recommendation !== null && recommendation.trim() !== "" && !recommendationTooLong && !answerDisabled;
  // React to signal changes only (not the mount value), filling blank drafts without submitting.
  const [seenSignal, setSeenSignal] = useState(fillRecommendedSignal);
  if (seenSignal !== fillRecommendedSignal) {
    setSeenSignal(fillRecommendedSignal);
    if (fillable) setAnswer((prev) => prev.trim() === "" ? recommendation : prev);
  }

  const submit = async (): Promise<void> => {
    if (postingRef.current || pending || blocked || run?.status === "done" || !answer.trim()) return;
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
    <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); void submit(); }} aria-busy={pending}>
      <Label htmlFor={id}>{question.question}</Label>
      {question.recommendedAnswer !== null && (
        <p className="text-sm text-muted-foreground">Réponse conseillée : {question.recommendedAnswer}</p>
      )}
      {recommendation !== null && recommendation.trim() !== "" && (
        <>
          <Button type="button" size="sm" variant="outline" disabled={answerDisabled || recommendationTooLong}
            aria-describedby={recommendationTooLong ? `${id}-recommendation-limit` : undefined}
            onClick={() => setAnswer(recommendation)}>
            Utiliser la réponse conseillée
          </Button>
          {recommendationTooLong && (
            <p id={`${id}-recommendation-limit`} className="text-sm text-muted-foreground">
              La réponse conseillée dépasse la limite de 10 000 caractères. Vous pouvez saisir une réponse plus courte manuellement.
            </p>
          )}
        </>
      )}
      <Textarea id={id} value={answer} maxLength={10000}
        onChange={(event) => setAnswer(event.target.value)} disabled={answerDisabled}
        aria-describedby={`${id}-status`} required />
      <Button type="submit" size="sm" variant="secondary" disabled={pending || blocked || run?.status === "done" || !answer.trim()}>
        {pending ? "Intégration en cours…" : run?.status === "failed" ? "Réessayer" : "Intégrer la réponse"}
      </Button>
      <div id={`${id}-status`} role={message ? "alert" : "status"} aria-live="polite">
        {message && <p className="text-sm text-danger">{message}</p>}
        {!message && pending && <p className="text-sm text-muted-foreground">La réponse est en cours d'intégration dans la description.</p>}
        {run?.status === "done" && <p className="text-sm">Réponse intégrée dans la description.</p>}
      </div>
    </form>
  );
}
