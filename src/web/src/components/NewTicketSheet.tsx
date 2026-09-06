import { useRef, useState } from "react";

import { isNotionUrl } from "@shared/notion";
import type { ProjectInfo } from "@shared/schemas";

import { AgentProfileConfig } from "@/components/AgentProfileConfig";
import { ProjectSelect } from "@/components/ProjectSelect";
import { TicketOptionsToggleGroup } from "@/components/TicketOptionsToggleGroup";
import { Button } from "@/components/ui/button";
import { BranchCombobox, Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import { useAgentKnobs } from "@/hooks/useAgentKnobs";
import { useBoard } from "@/hooks/useBoard";
import { api } from "@/lib/api";
import { dependencyCandidates } from "@/lib/display";
import { FIELD_LABEL_CLASSES, SHEET_FOOTER_CLASSES } from "@/lib/overlayStyles";
import { handleMediaPaste } from "@/lib/paste";

const SHEET_TITLE = "Nouveau ticket";

interface NewTicketSheetProps {
  open: boolean;
  projects: ProjectInfo[];
  onClose: () => void;
}

const NEW_TICKET_TITLE_DRAFT = "new-ticket:title";
const NEW_TICKET_URL_DRAFT = "new-ticket:external-url";
const NEW_TICKET_DESCRIPTION_DRAFT = "new-ticket:description";

export function NewTicketSheet({ open, projects, onClose }: NewTicketSheetProps) {
  const notionRequest = useRef(0);
  // Drop any in-flight Notion import on each open→closed transition (no-useEffect idiom).
  const wasOpen = useRef(false);
  if (open && !wasOpen.current) {
    wasOpen.current = true;
  } else if (!open && wasOpen.current) {
    wasOpen.current = false;
    notionRequest.current += 1;
  }
  const [title, setTitle, clearTitle] = useLocalDraft(NEW_TICKET_TITLE_DRAFT);
  const [externalUrl, setExternalUrl, clearExternalUrl] = useLocalDraft(NEW_TICKET_URL_DRAFT);
  const [importingNotion, setImportingNotion] = useState(false);
  if (!open && importingNotion) setImportingNotion(false);
  const [description, setDescription, clearDescription] = useLocalDraft(NEW_TICKET_DESCRIPTION_DRAFT);
  // null = no explicit choice yet → fall back to the first loaded project.
  const [projectChoice, setProjectChoice] = useState<string | null>(null);
  const project = projectChoice ?? projects[0]?.key ?? "";
  const selectedProject = projects.find((p) => p.key === project);
  const notionScope = `${project}\n${externalUrl}`;
  const currentNotionScope = useRef(notionScope);
  if (currentNotionScope.current !== notionScope) {
    currentNotionScope.current = notionScope;
    notionRequest.current += 1;
    if (importingNotion) setImportingNotion(false);
  }
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
  const autoMerge = autoMergeChoice ?? selectedProject?.defaultAutoMerge ?? false;
  const [addScreenshotsChoice, setAddScreenshotsChoice] = useState<boolean | null>(null);
  // Screenshots are unavailable when auto-merge is on (the PR is merged before a human reads it).
  const addScreenshots =
    !autoMerge && (addScreenshotsChoice ?? selectedProject?.defaultAddScreenshots ?? false);
  const [verifyFeature, setVerifyFeature] = useState(false);
  const [argusMultiLoop, setArgusMultiLoop] = useState(false);
  const [stealth, setStealth] = useState(false);
  const [directPush, setDirectPush] = useState(false);
  const { tickets } = useBoard();
  const [dependsOn, setDependsOn] = useState<string | null>(null);
  const dependsCandidates = dependencyCandidates(tickets, project, null);
  // A project change may invalidate the chosen parent; treat an out-of-range choice as none.
  const dependsOnValid =
    dependsOn && dependsCandidates.some((t) => t.id === dependsOn) ? dependsOn : null;
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
    notionRequest.current += 1;
    clearTitle();
    clearExternalUrl();
    setImportingNotion(false);
    clearDescription();
    setBaseBranchChoice(null);
    setPrdEnabled(false);
    setPrDraft(true);
    setAutoMergeChoice(null);
    setAddScreenshotsChoice(null);
    setVerifyFeature(false);
    setArgusMultiLoop(false);
    setStealth(false);
    setDirectPush(false);
    setDependsOn(null);
    agent.reset();
    setError(null);
    setOptionsKey((k) => k + 1);
  };

  const appendToDescription = (markdown: string): void => {
    setDescription((prev) =>
      prev.endsWith("\n") || prev === "" ? `${prev}${markdown}\n` : `${prev}\n${markdown}\n`,
    );
  };

  const importFromNotion = async (): Promise<void> => {
    if (importingNotion) return;
    const requestId = ++notionRequest.current;
    setError(null);
    setImportingNotion(true);
    try {
      const { markdown } = await api.importNotion({
        url: externalUrl,
        orchestrator: agent.orchestrator,
        ...(agent.orchestrator === "codex"
          ? {
              codexModel: agent.codexModel ?? undefined,
              codexEffort: agent.codexEffort ?? undefined,
              codexFast: agent.codexFast,
            }
          : {
              model: agent.model ?? undefined,
              effort: agent.effort ?? undefined,
            }),
      });
      if (requestId === notionRequest.current) appendToDescription(markdown);
    } catch (e) {
      if (requestId === notionRequest.current)
        setError(e instanceof Error ? e.message : "Échec de l'import Notion");
    } finally {
      if (requestId === notionRequest.current) setImportingNotion(false);
    }
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
        baseBranch && baseBranch !== selectedProject?.baseBranch ? baseBranch : null;
      await api.createTicket({
        title,
        externalUrl,
        description,
        project,
        prdEnabled,
        prDraft,
        autoMerge,
        stealth,
        directPush,
        addScreenshots,
        verifyFeature,
        argusMultiLoop,
        baseBranch: baseBranchOverride,
        dependsOn: dependsOnValid,
        orchestrator: agent.orchestrator,
        model: agent.model,
        effort: agent.effort,
        implementerModel: agent.implementerModel,
        implementerEffort: agent.implementerEffort,
        implementer: agent.implementer,
        codexModel: agent.codexModel,
        codexEffort: agent.codexEffort,
        codexFast: agent.codexFast,
        codexImplementerModel: agent.codexImplementerModel,
        codexImplementerEffort: agent.codexImplementerEffort,
        codexImplementerFast: agent.codexImplementerFast,
        feasibilityEngine: null,
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

  const submitDisabled = busy || (!title.trim() && !description.trim()) || !project;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      size="lg"
      title={SHEET_TITLE}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            <div className="flex flex-col space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title" className={FIELD_LABEL_CLASSES}>
                  Titre (optionnel)
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titre du ticket (déduit de la description si vide)"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="external-url" className={FIELD_LABEL_CLASSES}>
                  Lien externe (optionnel)
                </Label>
                <Input
                  id="external-url"
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://notion.so/… ou Trello"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void importFromNotion()}
                  disabled={!isNotionUrl(externalUrl) || importingNotion}
                >
                  {importingNotion ? "Import en cours…" : "Importer depuis Notion"}
                </Button>
              </div>
              <div className="flex flex-1 flex-col space-y-1.5">
                <Label htmlFor="description" className={FIELD_LABEL_CLASSES}>
                  Description (markdown)
                </Label>
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
                <Label htmlFor="base-branch" className={FIELD_LABEL_CLASSES}>
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
                <Label htmlFor="depends-on" className={FIELD_LABEL_CLASSES}>
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
              <div className="space-y-2 rounded-md border border-border p-3">
                <h3 className={FIELD_LABEL_CLASSES}>Agent d'implémentation</h3>
                <AgentProfileConfig
                  orchestrator={agent.orchestrator}
                  model={agent.model}
                  effort={agent.effort}
                  implementerModel={agent.implementerModel}
                  implementerEffort={agent.implementerEffort}
                  implementer={agent.implementer}
                  codexModel={agent.codexModel}
                  codexEffort={agent.codexEffort}
                  codexFast={agent.codexFast}
                  codexImplementerModel={agent.codexImplementerModel}
                  codexImplementerEffort={agent.codexImplementerEffort}
                  codexImplementerFast={agent.codexImplementerFast}
                  onOrchestratorChange={agent.setOrchestrator}
                  onModelChange={agent.setModel}
                  onEffortChange={agent.setEffort}
                  onImplementerModelChange={agent.setImplementerModel}
                  onImplementerEffortChange={agent.setImplementerEffort}
                  onImplementerChange={agent.setImplementer}
                  onCodexModelChange={agent.setCodexModel}
                  onCodexEffortChange={agent.setCodexEffort}
                  onCodexFastChange={agent.setCodexFast}
                  onCodexImplementerModelChange={agent.setCodexImplementerModel}
                  onCodexImplementerEffortChange={agent.setCodexImplementerEffort}
                  onCodexImplementerFastChange={agent.setCodexImplementerFast}
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
                  directPush,
                  verifyFeature,
                  argusMultiLoop,
                }}
                onChange={(next, { autoMergeChanged }) => {
                  setPrdEnabled(next.prdEnabled);
                  setPrDraft(next.prDraft);
                  setVerifyFeature(next.verifyFeature);
                  setArgusMultiLoop(next.argusMultiLoop);
                  setStealth(next.stealth);
                  setDirectPush(next.directPush);
                  if (autoMergeChanged) {
                    setAutoMergeChoice(next.autoMerge);
                  }
                }}
              />
              {error && <p className="text-sm text-danger">{error}</p>}
            </div>
          </div>
        </div>
        <div className={SHEET_FOOTER_CLASSES}>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void submit(false)}
            disabled={submitDisabled}
          >
            Créer
          </Button>
          <Button size="sm" onClick={() => void submit(true)} disabled={submitDisabled}>
            Créer et lancer
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
