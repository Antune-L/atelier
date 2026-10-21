import { MessageCircleQuestion } from "lucide-react";
import { useState } from "react";

import type { ProjectInfo } from "@shared/schemas";
import { type AgentEffort, type AgentModel, type CodexEffort, type CodexModel, type Orchestrator } from "@shared/constants";

import { ProjectSelect } from "@/components/ProjectSelect";
import { ToolAgentSettings } from "@/components/ToolAgentSettings";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { useCapabilities } from "@/hooks/useCapabilities";
import { api } from "@/lib/api";
import { FIELD_LABEL_CLASSES, PANEL_FOOTER_CLASSES } from "@/lib/overlayStyles";
import { appendMarkdownLine, handleMediaPaste } from "@/lib/paste";
import { resolveProjectChoice } from "@/lib/projectSelection";

interface AskPanelProps {
  projects: ProjectInfo[];
  onClose: () => void;
  /** Prefill from another surface (e.g. an audit finding). */
  initialProject?: string;
  initialQuestion?: string;
}

/**
 * "Ask" mode: pose a read-only question about a project. The agent (chosen model + reasoning
 * effort) explores the worktree and answers as a comment — no branch, no PR. Launches immediately.
 */
export function AskPanel({ projects, onClose, initialProject, initialQuestion = "" }: AskPanelProps) {
  const capabilities = useCapabilities();
  const [projectChoice, setProjectChoice] = useState<string | null>(initialProject ?? null);
  const project = resolveProjectChoice(projects, projectChoice);
  const [question, setQuestion] = useState(initialQuestion);
  // null = follow the server default; resolve it so the matching tab is highlighted.
  const [model, setModel] = useState<AgentModel | null>(null);
  const [effort, setEffort] = useState<AgentEffort | null>(null);
  const [orchestrator, setOrchestrator] = useState<Orchestrator>("claude");
  const [codexModel, setCodexModel] = useState<CodexModel | null>(null);
  const [codexEffort, setCodexEffort] = useState<CodexEffort | null>(null);
  const [codexFastOverride, setCodexFast] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const codexFast = codexFastOverride ?? capabilities.defaultCodexFast;

  const appendToQuestion = (markdown: string): void => {
    setQuestion((prev) => appendMarkdownLine(prev, markdown));
  };

  const onPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>): void => {
    void handleMediaPaste(event, appendToQuestion).catch((e) =>
      setError(e instanceof Error ? e.message : "Échec de l'upload"),
    );
  };

  const launch = async (): Promise<void> => {
    if (!question.trim() || !projects.some((p) => p.key === project)) {
      setError("Question et projet requis");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // Title left blank: the server derives it from the question (deriveTitleFromDescription).
      await api.createAsk({
        title: "",
        description: question,
        project,
        model,
        effort,
        orchestrator,
        codexModel,
        codexEffort,
        codexFast,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec du lancement de la question");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <ProjectSelect id="ask-project" projects={projects} value={project} onChange={setProjectChoice} />

      <div className="space-y-1.5">
        <Label htmlFor="ask-question" className={FIELD_LABEL_CLASSES}>Votre question</Label>
        <Textarea
          id="ask-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onPaste={onPaste}
          className="min-h-[200px]"
          placeholder="Que souhaitez-vous comprendre sur ce projet ?"
        />
        <p className="text-xs text-muted-foreground">Markdown accepté. Collez une image pour l’attacher.</p>
      </div>

      <p className="rounded-md border border-border bg-muted/30 p-3 text-sm">L’agent répond sur le projet en lecture seule. Sa réponse sera ajoutée à la carte.</p>

      <ToolAgentSettings
        id="ask"
        model={model}
        effort={effort}
        onModelChange={setModel}
        onEffortChange={setEffort}
        orchestrator={orchestrator}
        codexModel={codexModel}
        codexEffort={codexEffort}
        codexFast={codexFast}
        onOrchestratorChange={setOrchestrator}
        onCodexModelChange={setCodexModel}
        onCodexEffortChange={setCodexEffort}
        onCodexFastChange={setCodexFast}
      />

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <div className={PANEL_FOOTER_CLASSES}>
        <Button size="sm" variant="ghost" onClick={onClose}>
          Annuler
        </Button>
        <Button size="sm" onClick={() => void launch()} disabled={busy || !question.trim() || !project}>
          <MessageCircleQuestion className="h-4 w-4" />
          Poser la question
        </Button>
      </div>
    </div>
  );
}
