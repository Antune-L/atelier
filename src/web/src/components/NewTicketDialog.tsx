import { useRef, useState } from "react";

import type { ProjectInfo } from "@shared/schemas";

import { AgentProfileConfig } from "@/components/AgentProfileConfig";
import { AskPanel } from "@/components/AskPanel";
import { ImportTicketsPanel } from "@/components/ImportTicketsPanel";
import { CleanPrPanel } from "@/components/CleanPrPanel";
import { ProjectSelect } from "@/components/ProjectSelect";
import { ReviewPrPanel } from "@/components/ReviewPrPanel";
import { WorktreePanel } from "@/components/WorktreePanel";
import { TicketOptionsToggleGroup } from "@/components/TicketOptionsToggleGroup";
import { Button } from "@/components/ui/button";
import { BranchCombobox, Input, Label, Textarea } from "@/components/ui/input";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useAgentKnobs } from "@/hooks/useAgentKnobs";
import { useBoard } from "@/hooks/useBoard";
import { api } from "@/lib/api";
import { dependencyCandidates } from "@/lib/display";
import { handleMediaPaste } from "@/lib/paste";
import { cn } from "@/lib/utils";

type Tab = "ticket" | "import" | "review" | "clean" | "ask" | "worktree";

const TAB_TITLES: Record<Tab, string> = {
  ticket: "Nouveau ticket",
  import: "Import CSV",
  review: "Review une PR",
  clean: "PR Cleaner",
  ask: "Poser une question",
  worktree: "Worktree",
};

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
  const [externalUrl, setExternalUrl] = useState("");
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
  const [optionsKey, setOptionsKey] = useState(0);
  const [prdEnabled, setPrdEnabled] = useState(false);
  const [prDraft, setPrDraft] = useState(true);
  // null = untouched → fall back to the selected project's configured default.
  const [autoMergeChoice, setAutoMergeChoice] = useState<boolean | null>(null);
  const autoMerge =
    autoMergeChoice ?? selectedProject?.defaultAutoMerge ?? false;
  const [addScreenshotsChoice, setAddScreenshotsChoice] = useState<
    boolean | null
  >(null);
  // Screenshots are unavailable when auto-merge is on (the PR is merged before a human reads it).
  const addScreenshots =
    !autoMerge &&
    (addScreenshotsChoice ?? selectedProject?.defaultAddScreenshots ?? false);
  const [verifyFeature, setVerifyFeature] = useState(false);
  const [argusMultiLoop, setArgusMultiLoop] = useState(false);
  const [stealth, setStealth] = useState(false);
  const { tickets } = useBoard();
  const [dependsOn, setDependsOn] = useState<string | null>(null);
  const dependsCandidates = dependencyCandidates(tickets, project, null);
  // A project change may invalidate the chosen parent; treat an out-of-range choice as none.
  const dependsOnValid =
    dependsOn && dependsCandidates.some((t) => t.id === dependsOn)
      ? dependsOn
      : null;
  // Implementation agent knobs stored on the ticket (null = fall back to server config).
  const agent = useAgentKnobs();
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
    setExternalUrl("");
    setDescription("");
    setBaseBranchChoice(null);
    setPrdEnabled(false);
    setPrDraft(true);
    setAutoMergeChoice(null);
    setAddScreenshotsChoice(null);
    setVerifyFeature(false);
    setArgusMultiLoop(false);
    setStealth(false);
    setDependsOn(null);
    agent.reset();
    setError(null);
    setOptionsKey((k) => k + 1);
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
        externalUrl,
        description,
        project,
        prdEnabled,
        prDraft,
        autoMerge,
        stealth,
        addScreenshots,
        verifyFeature,
        argusMultiLoop,
        baseBranch: baseBranchOverride,
        dependsOn: dependsOnValid,
        model: agent.model,
        effort: agent.effort,
        implementerModel: agent.implementerModel,
        implementerEffort: agent.implementerEffort,
        implementer: agent.implementer,
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
    <Modal
      open={open}
      onClose={onClose}
      className={cn(
        "max-w-5xl",
        // Worktree tab is short; give room for the branch dropdown (max-h-48) without clipping.
        tab === "worktree" && "min-h-[36rem] overflow-visible",
      )}
    >
      <ModalHeader>
        <ModalTitle>{TAB_TITLES[tab]}</ModalTitle>
        <div className="mt-3 flex gap-1">
          <TabButton active={tab === "ticket"} onClick={() => setTab("ticket")}>
            Nouveau ticket
          </TabButton>
          <TabButton active={tab === "import"} onClick={() => setTab("import")}>
            Import CSV
          </TabButton>
          <TabButton active={tab === "review"} onClick={() => setTab("review")}>
            PR Review
          </TabButton>
          <TabButton active={tab === "clean"} onClick={() => setTab("clean")}>
            PR Cleaner
          </TabButton>
          <TabButton active={tab === "ask"} onClick={() => setTab("ask")}>
            Ask
          </TabButton>
          <TabButton active={tab === "worktree"} onClick={() => setTab("worktree")}>
            Worktree
          </TabButton>
        </div>
      </ModalHeader>
      {tab === "import" && (
        <ModalBody>
          <ImportTicketsPanel projects={projects} onClose={onClose} />
        </ModalBody>
      )}
      {tab === "review" && (
        <ModalBody>
          <ReviewPrPanel projects={projects} onClose={onClose} />
        </ModalBody>
      )}
      {tab === "clean" && (
        <ModalBody>
          <CleanPrPanel projects={projects} onClose={onClose} />
        </ModalBody>
      )}
      {tab === "ask" && (
        <ModalBody>
          <AskPanel projects={projects} onClose={onClose} />
        </ModalBody>
      )}
      {tab === "worktree" && (
        <ModalBody>
          <WorktreePanel projects={projects} onClose={onClose} />
        </ModalBody>
      )}
      {tab === "ticket" && (
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
                <div className="space-y-1.5">
                  <Label htmlFor="external-url">Lien externe (optionnel)</Label>
                  <Input
                    id="external-url"
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://notion.so/… ou Trello"
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
                <ProjectSelect
                  id="project"
                  projects={projects}
                  value={project}
                  onChange={setProjectChoice}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="base-branch">
                    Branche de base du worktree
                  </Label>
                  <BranchCombobox
                    id="base-branch"
                    value={baseBranch}
                    onChange={setBaseBranchChoice}
                    options={branchOptions}
                    disabled={branches === null}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="depends-on">
                    Dépend du ticket (stack PR)
                  </Label>
                  <Select
                    id="depends-on"
                    value={dependsOnValid ?? ""}
                    onChange={(e) => setDependsOn(e.target.value || null)}
                    className="w-full"
                  >
                    <option value="">Aucune</option>
                    {dependsCandidates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2 rounded-md border p-3">
                  <h3 className="text-sm font-semibold">
                    Agent d'implémentation
                  </h3>
                  <AgentProfileConfig
                    model={agent.model}
                    effort={agent.effort}
                    implementerModel={agent.implementerModel}
                    implementerEffort={agent.implementerEffort}
                    implementer={agent.implementer}
                    onModelChange={agent.setModel}
                    onEffortChange={agent.setEffort}
                    onImplementerModelChange={agent.setImplementerModel}
                    onImplementerEffortChange={agent.setImplementerEffort}
                    onImplementerChange={agent.setImplementer}
                    onApplyProfile={agent.applyProfile}
                  />
                </div>
                <TicketOptionsToggleGroup
                  key={optionsKey}
                  headingId="ticket-options-heading"
                  values={{
                    prdEnabled,
                    prDraft,
                    autoMerge,
                    stealth,
                    verifyFeature,
                    argusMultiLoop,
                  }}
                  onChange={(next, { autoMergeChanged }) => {
                    setPrdEnabled(next.prdEnabled);
                    setPrDraft(next.prDraft);
                    setVerifyFeature(next.verifyFeature);
                    setArgusMultiLoop(next.argusMultiLoop);
                    setStealth(next.stealth);
                    if (autoMergeChanged) {
                      setAutoMergeChoice(next.autoMerge);
                    }
                  }}
                />
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
              disabled={
                busy || (!title.trim() && !description.trim()) || !project
              }
            >
              Créer
            </Button>
            <Button
              onClick={() => void submit(true)}
              disabled={
                busy || (!title.trim() && !description.trim()) || !project
              }
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
