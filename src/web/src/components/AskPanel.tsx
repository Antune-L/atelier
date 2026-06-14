import { MessageCircleQuestion } from "lucide-react";
import { useState } from "react";

import type { ProjectInfo } from "@shared/schemas";
import {
  AGENT_EFFORTS,
  AGENT_EFFORT_LABELS,
  AGENT_MODELS,
  AGENT_MODEL_LABELS,
  type AgentEffort,
  type AgentModel,
} from "@shared/constants";
import { agentEffortSchema, agentModelSchema } from "@shared/schemas";

import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tabs, type TabOption } from "@/components/ui/tabs";
import { useCapabilities } from "@/hooks/useCapabilities";
import { api } from "@/lib/api";
import { handleMediaPaste } from "@/lib/paste";

interface AskPanelProps {
  projects: ProjectInfo[];
  onClose: () => void;
}

const MODEL_OPTIONS: TabOption<AgentModel>[] = AGENT_MODELS.map((m) => ({ value: m, label: AGENT_MODEL_LABELS[m] }));
const EFFORT_OPTIONS: TabOption<AgentEffort>[] = AGENT_EFFORTS.map((e) => ({ value: e, label: AGENT_EFFORT_LABELS[e] }));

/**
 * "Ask" mode: pose a read-only question about a project. The agent (chosen model + reasoning
 * effort) explores the worktree and answers as a comment — no branch, no PR. Launches immediately.
 */
export function AskPanel({ projects, onClose }: AskPanelProps) {
  const { defaultModel, defaultEffort } = useCapabilities();
  const [projectChoice, setProjectChoice] = useState<string | null>(null);
  const project = projectChoice ?? projects[0]?.key ?? "";
  const [question, setQuestion] = useState("");
  // null = follow the server default; resolve it so the matching tab is highlighted.
  const [model, setModel] = useState<AgentModel | null>(null);
  const [effort, setEffort] = useState<AgentEffort | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedDefaultModel = agentModelSchema.safeParse(defaultModel);
  const resolvedDefaultModel = parsedDefaultModel.success ? parsedDefaultModel.data : null;
  const parsedDefaultEffort = agentEffortSchema.safeParse(defaultEffort);
  const resolvedDefaultEffort = parsedDefaultEffort.success ? parsedDefaultEffort.data : null;

  const appendToQuestion = (markdown: string): void => {
    setQuestion((prev) => (prev.endsWith("\n") || prev === "" ? `${prev}${markdown}\n` : `${prev}\n${markdown}\n`));
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
      await api.createAsk({ title: "", description: question, project, model, effort });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec du lancement de la question");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="ask-project">Projet</Label>
        <Select
          id="ask-project"
          value={project}
          onChange={(e) => setProjectChoice(e.target.value)}
          className="w-full"
        >
          {projects.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ask-question">Question (markdown)</Label>
        <Textarea
          id="ask-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onPaste={onPaste}
          className="min-h-[200px]"
          placeholder="Ta question sur le projet… (colle une image pour l'attacher)"
        />
      </div>

      <div className="flex flex-col items-start gap-1.5">
        <Label id="ask-model">Modèle</Label>
        <Tabs
          options={MODEL_OPTIONS}
          value={model ?? resolvedDefaultModel}
          onChange={(value) => setModel(value === resolvedDefaultModel ? null : value)}
          aria-labelledby="ask-model"
        />
      </div>

      <div className="flex flex-col items-start gap-1.5">
        <Label id="ask-effort">Réflexion (effort)</Label>
        <Tabs
          options={EFFORT_OPTIONS}
          value={effort ?? resolvedDefaultEffort}
          onChange={(value) => setEffort(value === resolvedDefaultEffort ? null : value)}
          aria-labelledby="ask-effort"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={() => void launch()} disabled={busy || !question.trim() || !project}>
          <MessageCircleQuestion className="h-4 w-4" />
          Poser la question
        </Button>
      </div>
    </div>
  );
}
