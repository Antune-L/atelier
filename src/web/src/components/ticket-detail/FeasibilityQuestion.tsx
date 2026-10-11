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
}

/** Each report/question owns a durable draft, including after a failed or interrupted run. */
export function FeasibilityQuestion({ ticket, question, index, onSubmit }: FeasibilityQuestionProps) {
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
      <Textarea id={id} value={answer} maxLength={10000}
        onChange={(event) => setAnswer(event.target.value)} disabled={pending || run?.status === "done"}
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
