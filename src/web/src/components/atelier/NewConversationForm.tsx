import { MessageSquarePlus } from "lucide-react";
import { useState, type ClipboardEvent, type KeyboardEvent } from "react";

import type { Conversation, ProjectInfo, ResearchOptions } from "@shared/schemas";
import { DEFAULT_RESEARCH_OPTIONS } from "@shared/schemas";

import { AtelierAgentFields } from "@/components/atelier/AtelierAgentFields";
import { ResearchFields } from "@/components/atelier/ResearchFields";
import { ProjectSelect } from "@/components/ProjectSelect";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { useBusyAction } from "@/hooks/useBusyAction";
import { useCapabilities } from "@/hooks/useCapabilities";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { defaultAgentSettings, type AtelierAgentSettings, type AtelierSeed } from "@/lib/atelier";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";
import { appendMarkdownLine, handleMediaPaste } from "@/lib/paste";
import { resolveProjectChoice } from "@/lib/projectSelection";
import { boardStore } from "@/lib/store";

interface NewConversationFormProps {
  projects: ProjectInfo[];
  defaultProject: string | null;
  seed: AtelierSeed | null;
  onCreated: (conversation: Conversation) => void;
  onCancel: () => void;
}

const DEFAULT_ORCHESTRATOR = "claude";

function seedMessage(seed: AtelierSeed | null): string {
  if (seed === null) return "";
  const title = seed.title.trim();
  const description = seed.description.trim();
  if (title && description) return `${title}\n\n${description}`;
  return title || description;
}

/** Start an Atelier conversation: project, agent, research mode and the first message. */
export function NewConversationForm({ projects, defaultProject, seed, onCreated, onCancel }: NewConversationFormProps) {
  const capabilities = useCapabilities();
  const [projectChoice, setProjectChoice] = useState<string | null>(seed?.project ?? defaultProject);
  const project = resolveProjectChoice(projects, projectChoice);
  const [title, setTitle] = useState(seed?.title ?? "");
  const [message, setMessage] = useState(() => seedMessage(seed));
  const [agent, setAgent] = useState<AtelierAgentSettings>(() =>
    defaultAgentSettings(DEFAULT_ORCHESTRATOR, capabilities.defaultCodexFast),
  );
  const [researchEnabled, setResearchEnabled] = useState(false);
  const [researchOptions, setResearchOptions] = useState<ResearchOptions>(DEFAULT_RESEARCH_OPTIONS);
  const { busy, error, setError, run } = useBusyAction();

  const appendToMessage = (markdown: string): void => {
    setMessage((prev) => appendMarkdownLine(prev, markdown));
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>): void => {
    void handleMediaPaste(event, appendToMessage).catch((e: unknown) =>
      setError(errorMessage(e, "Échec de l'upload")),
    );
  };

  const submitDisabled = busy || !message.trim() || !projects.some((p) => p.key === project);

  const submit = async (): Promise<void> => {
    if (submitDisabled) return;
    await run(async () => {
      const conversation = await api.atelierCreateConversation({
        project,
        title: title.trim() || undefined,
        ...agent,
        researchEnabled,
        researchOptions,
        seed: message.trim(),
      });
      boardStore.rememberConversation(conversation);
      onCreated(conversation);
    }, "Création de la conversation impossible");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return;
    event.preventDefault();
    void submit();
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 overflow-y-auto p-4">
      <h2 className="text-sm font-medium">Nouvelle conversation</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ProjectSelect id="atelier-project" projects={projects} value={project} onChange={setProjectChoice} />
        <div className="space-y-1.5">
          <Label htmlFor="atelier-title" className={FIELD_LABEL_CLASSES}>Titre (optionnel)</Label>
          <Input
            id="atelier-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Déduit du premier message si vide"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="atelier-first-message" className={FIELD_LABEL_CLASSES}>Premier message</Label>
        <Textarea
          id="atelier-first-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onPaste={onPaste}
          onKeyDown={onKeyDown}
          className="min-h-[160px]"
          placeholder="Décris la feature ou le fix… (colle une image pour l'attacher, ⌘+Entrée pour démarrer)"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2 rounded-md border border-border p-3">
          <h3 className={FIELD_LABEL_CLASSES}>Session</h3>
          <AtelierAgentFields value={agent} onChange={(patch) => setAgent((prev) => ({ ...prev, ...patch }))} />
        </div>
        <div className="space-y-2 rounded-md border border-border p-3">
          <h3 className={FIELD_LABEL_CLASSES}>Mode</h3>
          <ResearchFields
            enabled={researchEnabled}
            options={researchOptions}
            onEnabledChange={setResearchEnabled}
            onOptionsChange={setResearchOptions}
          />
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
        <Button size="sm" onClick={() => void submit()} disabled={submitDisabled}>
          <MessageSquarePlus className="h-4 w-4" />
          Démarrer la conversation
        </Button>
      </div>
    </div>
  );
}
