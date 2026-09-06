import type { Comment } from "@shared/schemas";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Markdown } from "@/components/ui/markdown";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import { formatDateTime } from "@/lib/display";
import { cn } from "@/lib/utils";

interface CommentRowProps {
  comment: Comment;
  onAnswer: (questionId: string, body: string) => Promise<void>;
}

const AUTHOR_BADGES: Record<Comment["author"], { label: string; glyph: string | null; className: string }> = {
  agent: { label: "Agent", glyph: "🤖", className: "bg-info/15 text-info" },
  user: { label: "Toi", glyph: "🧑", className: "bg-primary/15 text-primary" },
  system: { label: "Système", glyph: null, className: "bg-muted text-muted-foreground" },
};

function AuthorBadge({ author }: { author: Comment["author"] }) {
  const { label, glyph, className } = AUTHOR_BADGES[author];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-2xs font-semibold",
        className,
      )}
    >
      {glyph && <span aria-hidden>{glyph}</span>} {label}
    </span>
  );
}

/** One comment card; an unanswered agent question carries its own (draft-backed) reply box. */
export function CommentRow({ comment, onAnswer }: CommentRowProps) {
  const questionId = comment.questionId;
  const isQuestion = comment.author === "agent" && questionId !== null && !comment.answered;
  const [reply, setReply, clearReply] = useLocalDraft(`reply:${questionId ?? comment.id}`);

  const answer = async (): Promise<void> => {
    if (questionId === null || !reply.trim()) return;
    await onAnswer(questionId, reply.trim());
    clearReply();
  };

  return (
    <div
      className={cn(
        "rounded-md border p-2 text-sm",
        comment.author === "agent" && "border-info/40 bg-info/5",
        comment.author === "system" && "bg-muted/30 text-muted-foreground",
        comment.author === "user" && "border-primary/30 bg-primary/5",
        isQuestion && "border-warning/50 bg-warning/10",
      )}
    >
      <div className="mb-1 flex items-center gap-2">
        <AuthorBadge author={comment.author} />
        {isQuestion && <Badge variant="warning">Question</Badge>}
        <span className="ml-auto font-mono text-2xs text-muted-foreground">
          {formatDateTime(comment.createdAt)}
        </span>
      </div>
      <Markdown content={comment.body} />
      {isQuestion && (
        <div className="mt-2 flex gap-2">
          <Input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Votre réponse…"
            onKeyDown={(e) => e.key === "Enter" && void answer()}
          />
          <Button size="sm" onClick={() => void answer()}>
            Répondre
          </Button>
        </div>
      )}
    </div>
  );
}
