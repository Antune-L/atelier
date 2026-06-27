import { ClipboardCheck, Copy, RefreshCw, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";

import { PrdAnnotator } from "@/components/PrdAnnotator";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

/** How long the "Copié !" confirmation stays visible. */
const COPIED_FEEDBACK_MS = 2_000;

export function PrdView(): ReactNode {
  const [description, setDescription] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [feedback, setFeedback] = useState("");
  const [hasFeedback, setHasFeedback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = async (revise: boolean): Promise<void> => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const result = await api.generatePrd(
        revise ? { description, previousPrd: markdown, feedback } : { description },
      );
      // A new PRD invalidates prior annotations; the remounted PrdAnnotator (key) starts clean.
      setFeedback("");
      setHasFeedback(false);
      setMarkdown(result.markdown);
    } catch (err) {
      setError(err instanceof Error ? err.message : "échec de génération du PRD");
    } finally {
      setLoading(false);
    }
  };

  const onFeedbackChange = (next: string, present: boolean): void => {
    setFeedback(next);
    setHasFeedback(present);
  };

  const copyMarkdown = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    } catch {
      setError("copie dans le presse-papiers impossible");
    }
  };

  const canGenerate = !loading && description.trim().length > 0;

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="shrink-0 space-y-2">
        <Label htmlFor="prd-description">Décris ce que tu veux</Label>
        <Textarea
          id="prd-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[120px]"
          placeholder="Décris la fonctionnalité ou le besoin. Tu peux référencer des chemins d'images locaux absolus (ex. /Users/.../uploads/xxx.png)…"
        />
        <div className="flex items-center gap-2">
          <Button onClick={() => void generate(false)} disabled={!canGenerate}>
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Générer le PRD
          </Button>
        </div>
      </div>

      {error && (
        <div className="shrink-0 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {markdown && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-2">
            <span className="text-sm font-semibold">PRD généré</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void generate(true)}
                disabled={loading || !hasFeedback}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                Régénérer avec les retours
              </Button>
              <Button variant="outline" size="sm" onClick={() => void copyMarkdown()}>
                {copied ? <ClipboardCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copié !" : "Copier le PRD"}
              </Button>
            </div>
          </div>
          <PrdAnnotator
            key={markdown}
            markdown={markdown}
            actionable
            onFeedbackChange={onFeedbackChange}
          />
        </div>
      )}
    </div>
  );
}
