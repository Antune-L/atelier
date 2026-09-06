import type { ReactNode } from "react";

import type { Comment, Ticket } from "@shared/schemas";

import { CommentRow } from "@/components/ticket-detail/CommentRow";
import { SectionHeader } from "@/components/ticket-detail/SectionHeader";
import { Input } from "@/components/ui/input";
import { useLocalDraft } from "@/hooks/useLocalDraft";

/** Columns where the API rejects new free-form comments. */
const NO_COMMENT_COLUMNS: Ticket["column"][] = ["todo", "done", "merged"];

interface ActivityTabProps {
  ticket: Ticket;
  comments: Comment[];
  onAnswer: (questionId: string, body: string) => Promise<void>;
  onComment: (body: string) => Promise<void>;
  /** Feasibility block, rendered below the thread (TODO tickets only). */
  triage?: ReactNode;
}

function isUnanswered(comment: Comment): boolean {
  return comment.author === "agent" && comment.questionId !== null && !comment.answered;
}

/** Agent questions, the comment thread and the composer. */
export function ActivityTab({ ticket, comments, onAnswer, onComment, triage }: ActivityTabProps) {
  const [draft, setDraft, clearDraft] = useLocalDraft(`comment:${ticket.id}`);
  const questions = comments.filter(isUnanswered);
  const thread = comments.filter((c) => !isUnanswered(c));
  const canComment = !NO_COMMENT_COLUMNS.includes(ticket.column);

  const submit = async (): Promise<void> => {
    if (!draft.trim()) return;
    await onComment(draft.trim());
    clearDraft();
  };

  return (
    <div className="space-y-4">
      {questions.length > 0 && (
        <section className="space-y-2">
          <SectionHeader>Questions en attente</SectionHeader>
          {questions.map((c) => (
            <CommentRow key={c.id} comment={c} onAnswer={onAnswer} />
          ))}
        </section>
      )}

      <section className="space-y-2">
        <SectionHeader>Commentaires</SectionHeader>
        {thread.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun commentaire</p>
        ) : (
          thread.map((c) => <CommentRow key={c.id} comment={c} onAnswer={onAnswer} />)
        )}
        {canComment && (
          <Input
            aria-label="Ajouter un commentaire"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Votre message…"
            onKeyDown={(e) => e.key === "Enter" && void submit()}
          />
        )}
      </section>

      {triage}
    </div>
  );
}
