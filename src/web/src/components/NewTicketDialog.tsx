import { useRef, useState } from "react";

import type { ProjectInfo } from "@shared/schemas";
import type { AgentEffort, AgentModel, Implementer } from "@shared/constants";

import { AgentProfileConfig } from "@/components/AgentProfileConfig";
import { ReviewPrPanel } from "@/components/ReviewPrPanel";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
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

export function NewTicketDialog({
  open,
  projects,
  onClose,
}: NewTicketDialogProps) {
  const [tab, setTab] = useState<Tab>("ticket");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // null = no explicit choice yet → fall back to the first loaded project.
  const [projectChoice, setProjectChoice] = useState<string | null>(null);
  const project = projectChoice ?? projects[0]?.key ?? "";
  const selectedProject = projects.find((p) => p.key === project);
  // null = untouched → fall back to the selected project's default branch.
  const [baseBranchChoice, setBaseBranchChoice] = useState<string | null>(null);
  const baseBranch = baseBranchChoice ?? selectedProject?.baseBranch ?? "";
  const [branches, setBranches] = useState<string[] | null>(null);
  const [branchesKey, setBranchesKey] = useState<string | null>(null);
  // Tracks the latest requested project so an out-of-order branch fetch is dropped.
  const latestBranchKey = useRef<string | null>(null);
  const [prdEnabled, setPrdEnabled] = useState(false);
  const [prDraft, setPrDraft] = useState(true);
  // null = untouched → fall back to the selected project's configured default.
  const [autoMergeChoice, setAutoMergeChoice] = useState<boolean | null>(null);
  const autoMerge =
    autoMergeChoice ?? selectedProject?.defaultAutoMerge ?? false;
  // Implementation agent knobs stored on the ticket (null = fall back to server config).
  const [model, setModel] = useState<AgentModel | null>(null);
  const [effort, setEffort] = useState<AgentEffort | null>(null);
  const [implementerModel, setImplementerModel] = useState<AgentModel | null>(null);
  const [implementerEffort, setImplementerEffort] = useState<AgentEffort | null>(null);
  const [implementer, setImplementer] = useState<Implementer>("claude");
  const applyProfile = (config: {
    model: AgentModel;
    effort: AgentEffort;
    implementerModel: AgentModel;
    implementerEffort: AgentEffort;
    implementer: Implementer;
  }): void => {
    setModel(config.model);
    setEffort(config.effort);
    setImplementerModel(config.implementerModel);
    setImplementerEffort(config.implementerEffort);
    setImplementer(config.implementer);
  };
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Load the project's branches for the base-branch picker on open and on each
  // project change (mirrors ReviewPrPanel's no-useEffect load-on-render pattern).
  if (open && project && project !== branchesKey) {
    const key = project;
    latestBranchKey.current = key;
    setBranchesKey(key);
    setBranches(null);
    setBaseBranchChoice(null);
    void api
      .projectBranches(key)
      // Ignore a stale response if the project changed again before it resolved.
      .then((list) => latestBranchKey.current === key && setBranches(list))
      .catch(() => latestBranchKey.current === key && setBranches([]));
  }

  // The configured default always selectable, even while the remote list loads or fails.
  const branchOptions = (() => {
    const list = branches ?? [];
    const fallback = selectedProject?.baseBranch;
    if (!fallback) return list;
    return list.includes(fallback) ? list : [fallback, ...list];
  })();

  const reset = (): void => {
    setTitle("");
    setDescription("");
    setBaseBranchChoice(null);
    setPrdEnabled(false);
    setPrDraft(true);
    setAutoMergeChoice(null);
    setModel(null);
    setEffort(null);
    setImplementerModel(null);
    setImplementerEffort(null);
    setImplementer("claude");
    setError(null);
  };

  const appendToDescription = (markdown: string): void => {
    setDescription((prev) =>
      prev.endsWith("\n") || prev === ""
        ? `${prev}${markdown}\n`
        : `${prev}\n${markdown}\n`,
    );
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
      // Send null when the choice matches (or has no) project default → keep "no override" semantics.
      const baseBranchOverride =
        baseBranch && baseBranch !== selectedProject?.baseBranch
          ? baseBranch
          : null;
      await api.createTicket({
        title,
        description,
        project,
        prdEnabled,
        prDraft,
        autoMerge,
        baseBranch: baseBranchOverride,
        model,
        effort,
        implementerModel,
        implementerEffort,
        implementer,
        start,
      });
      reset();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} className="max-w-5xl">
      <ModalHeader>
        <ModalTitle>
          {tab === "ticket" ? "Nouveau ticket" : "Review une PR"}
        </ModalTitle>
        <div className="mt-3 flex gap-1">
          <TabButton active={tab === "ticket"} onClick={() => setTab("ticket")}>
            Nouveau ticket
          </TabButton>
          <TabButton active={tab === "review"} onClick={() => setTab("review")}>
            PR Review
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
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
              <div className="flex flex-col space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Titre (optionnel)</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Titre du ticket (déduit de la description si vide)"
                  />
                </div>
                <div className="flex flex-1 flex-col space-y-1.5">
                  <Label htmlFor="description">Description (markdown)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onPaste={onPaste}
                    className="min-h-[320px] flex-1"
                    placeholder="Description… (colle une image pour l'attacher ; liens Figma détectés automatiquement)"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="project">Projet</Label>
                  <Select
                    id="project"
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
                  <Label htmlFor="base-branch">
                    Branche de base du worktree
                  </Label>
                  <Select
                    id="base-branch"
                    value={baseBranch}
                    onChange={(e) => setBaseBranchChoice(e.target.value)}
                    disabled={branches === null}
                    className="w-full"
                  >
                    {branchOptions.map((b) => (
                      <option key={b} value={b}>
                        {b === selectedProject?.baseBranch
                          ? `${b} (défaut)`
                          : b}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2 rounded-md border p-3">
                  <h3 className="text-sm font-semibold">
                    Agent d'implémentation
                  </h3>
                  <AgentProfileConfig
                    model={model}
                    effort={effort}
                    implementerModel={implementerModel}
                    implementerEffort={implementerEffort}
                    implementer={implementer}
                    onModelChange={setModel}
                    onEffortChange={setEffort}
                    onImplementerModelChange={setImplementerModel}
                    onImplementerEffortChange={setImplementerEffort}
                    onImplementerChange={setImplementer}
                    onApplyProfile={applyProfile}
                  />
                </div>
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span>PRD à implémenter (planification avant code)</span>
                  <Switch
                    checked={prdEnabled}
                    onCheckedChange={setPrdEnabled}
                    aria-label="PRD à implémenter"
                  />
                </label>
                <label className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    Ouvrir la PR en draft
                    {autoMerge && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (forcé non-draft pour le merge auto)
                      </span>
                    )}
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
                  <Switch
                    checked={autoMerge}
                    onCheckedChange={setAutoMergeChoice}
                    aria-label="Merge automatique de la PR"
                  />
                </label>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              variant="outline"
              onClick={() => void submit(false)}
              disabled={busy || (!title.trim() && !description.trim()) || !project}
            >
              Créer
            </Button>
            <Button
              onClick={() => void submit(true)}
              disabled={busy || (!title.trim() && !description.trim()) || !project}
            >
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
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
