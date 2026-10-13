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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 overflow-y-auto p-4 md:p-6">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Nouvelle discussion</h2>
        <p className="text-sm text-muted-foreground">Précisez le résultat attendu. Vous pourrez préparer un PRD après la discussion.</p>
      </header>
      <div className="space-y-2 rounded-lg border border-border bg-card p-4">
        <Label htmlFor="atelier-first-message" className={FIELD_LABEL_CLASSES}>Votre idée</Label>
        <Textarea id="atelier-first-message" value={message} onChange={(e) => setMessage(e.target.value)} onPaste={onPaste} onKeyDown={onKeyDown} className="min-h-[200px]" placeholder="Décrivez la feature ou le correctif, le résultat attendu et les contraintes…" />
        <p className="text-xs text-muted-foreground">Collez une image pour l’attacher. ⌘ ou Ctrl + Entrée démarre la discussion.</p>
      </div>
      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <ProjectSelect id="atelier-project" projects={projects} value={project} onChange={setProjectChoice} />
        <div className="border-t border-border pt-4">
          <h3 className="mb-2 text-sm font-medium">Agent</h3>
          <AtelierAgentFields value={agent} onChange={(patch) => setAgent((prev) => ({ ...prev, ...patch }))} />
        </div>
      </div>
      <details className="rounded-lg border border-border p-4">
        <summary className="cursor-pointer text-sm font-medium">Titre et vérifications avant de proposer</summary>
        <div className="mt-4 flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="atelier-title" className={FIELD_LABEL_CLASSES}>Titre (facultatif)</Label>
            <Input id="atelier-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Déduit du premier message si vide" />
          </div>
          <div className="space-y-2 border-t border-border pt-4">
            <h3 className="text-sm font-medium">Avant de proposer</h3>
            <ResearchFields enabled={researchEnabled} options={researchOptions} onEnabledChange={setResearchEnabled} onOptionsChange={setResearchOptions} />
          </div>
        </div>
      </details>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background py-3">
        <p className="text-xs text-muted-foreground">Le projet et l’agent ci-dessus seront utilisés.</p>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel}>Annuler</Button>
          <Button size="sm" onClick={() => void submit()} disabled={submitDisabled}><MessageSquarePlus className="h-4 w-4" />Commencer la discussion</Button>
        </div>
      </div>
    </div>
  );
}
