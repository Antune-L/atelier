import { useState } from "react";

import type { ProjectInfo } from "@shared/schemas";
import type { AgentEffort, AgentModel, Implementer } from "@shared/constants";

import { ImplementationAgentFields } from "@/components/ImplementationAgentFields";
import { ReviewPrPanel } from "@/components/ReviewPrPanel";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { handleMediaPaste } from "@/lib/paste";
import { cn } from "@/lib/utils";

type Tab = "ticket" | "review";

interface NewTicketDialogProps {
  open: boolean;
  projects: ProjectInfo[];
  onClose: () => void;
}

export function NewTicketDialog({ open, projects, onClose }: NewTicketDialogProps) {
  const [tab, setTab] = useState<Tab>("ticket");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // null = no explicit choice yet → fall back to the first loaded project.
  const [projectChoice, setProjectChoice] = useState<string | null>(null);
  const project = projectChoice ?? projects[0]?.key ?? "";
  const selectedProject = projects.find((p) => p.key === project);
  const [prdEnabled, setPrdEnabled] = useState(false);
  const [prDraft, setPrDraft] = useState(true);
  // null = untouched → fall back to the selected project's configured default.
  const [autoMergeChoice, setAutoMergeChoice] = useState<boolean | null>(null);
  const autoMerge = autoMergeChoice ?? selectedProject?.defaultAutoMerge ?? false;
  // Implementation agent knobs stored on the ticket (null = fall back to server config).
  const [model, setModel] = useState<AgentModel | null>(null);
  const [effort, setEffort] = useState<AgentEffort | null>(null);
  const [implementer, setImplementer] = useState<Implementer>("claude");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = (): void => {
    setTitle("");
    setDescription("");
    setPrdEnabled(false);
    setPrDraft(true);
    setAutoMergeChoice(null);
    setModel(null);
    setEffort(null);
    setImplementer("claude");
    setError(null);
  };

  const appendToDescription = (markdown: string): void => {
    setDescription((prev) => (prev.endsWith("\n") || prev === "" ? `${prev}${markdown}\n` : `${prev}\n${markdown}\n`));
  };

  const onPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>): void => {
    void handleMediaPaste(event, appendToDescription).catch((e) =>
      setError(e instanceof Error ? e.message : "Échec de l'upload"),
    );
  };

  const submit = async (start: boolean): Promise<void> => {
    setError(null);
    if (!projects.some((p) => p.key === project)) {
      setError("Projet invalide");
      return;
    }
    setBusy(true);
    try {
      await api.createTicket({ title, description, project, prdEnabled, prDraft, autoMerge, model, effort, implementer, start });
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} className="max-w-3xl">
      <ModalHeader>
        <ModalTitle>{tab === "ticket" ? "Nouveau ticket" : "Reviewer une PR"}</ModalTitle>
        <div className="mt-3 flex gap-1">
          <TabButton active={tab === "ticket"} onClick={() => setTab("ticket")}>
            Nouveau ticket
          </TabButton>
          <TabButton active={tab === "review"} onClick={() => setTab("review")}>
            Reviewer une PR
          </TabButton>
        </div>
      </ModalHeader>
      {tab === "review" ? (
        <ModalBody>
          <ReviewPrPanel projects={projects} onClose={onClose} />
        </ModalBody>
      ) : (
        <>
      <ModalBody>
        <div className="space-y-1.5">
          <Label htmlFor="title">Titre</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du ticket" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="description">Description (markdown)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onPaste={onPaste}
            className="min-h-[320px]"
            placeholder="Description… (colle une image pour l'attacher ; liens Figma détectés automatiquement)"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="project">Projet</Label>
          <Select id="project" value={project} onChange={(e) => setProjectChoice(e.target.value)} className="w-full">
            {projects.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2 rounded-md border p-3">
          <h3 className="text-sm font-semibold">Agent d'implémentation</h3>
          <ImplementationAgentFields
            model={model}
            effort={effort}
            implementer={implementer}
            onModelChange={setModel}
            onEffortChange={setEffort}
            onImplementerChange={setImplementer}
          />
        </div>
        <label className="flex items-center justify-between gap-2 text-sm">
          <span>PRD à implémenter (planification avant code)</span>
          <Switch checked={prdEnabled} onCheckedChange={setPrdEnabled} aria-label="PRD à implémenter" />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm">
          <span>
            Ouvrir la PR en draft
            {autoMerge && <span className="ml-1 text-xs text-muted-foreground">(forcé non-draft pour le merge auto)</span>}
          </span>
          <Switch
            checked={prDraft && !autoMerge}
            disabled={autoMerge}
            onCheckedChange={setPrDraft}
            aria-label="Ouvrir la PR en draft"
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-sm">
          <span>Merger automatiquement la PR après ouverture</span>
          <Switch checked={autoMerge} onCheckedChange={setAutoMergeChoice} aria-label="Merge automatique de la PR" />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Annuler
        </Button>
        <Button variant="outline" onClick={() => void submit(false)} disabled={busy || !title.trim() || !project}>
          Créer
        </Button>
        <Button onClick={() => void submit(true)} disabled={busy || !title.trim() || !project}>
          Créer et lancer
        </Button>
      </ModalFooter>
        </>
      )}
    </Modal>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
