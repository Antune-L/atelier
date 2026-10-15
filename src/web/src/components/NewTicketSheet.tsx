import { MessageSquare } from "lucide-react";
import { useRef, useState } from "react";

import { AUTONOMOUS_DEFAULT_MAX_CORRECTIONS, AUTONOMOUS_DEFAULT_TIMEOUT_MINUTES, AUTONOMOUS_DEFAULT_MAX_STARTS, AUTONOMOUS_DEFAULT_FINALIZATION_MINUTES, AUTONOMOUS_DEFAULT_MAX_PUBLICATION_ATTEMPTS } from "@shared/autonomous";
import { isNotionUrl } from "@shared/notion";
import type { ProjectInfo } from "@shared/schemas";

import { AutonomousOptions, autonomousEligibility, prOnlyAutonomousOptions } from "@/components/AutonomousOptions";
import type { AutonomousOptionValues } from "@/components/AutonomousOptions";
import { ImplementationSettings } from "@/components/ImplementationSettings";
import { ProjectSelect } from "@/components/ProjectSelect";
import { TicketOptionsToggleGroup } from "@/components/TicketOptionsToggleGroup";
import { Button } from "@/components/ui/button";
import { BranchCombobox, Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import { useAgentKnobs } from "@/hooks/useAgentKnobs";
import { useBoard } from "@/hooks/useBoard";
import { useCapabilities } from "@/hooks/useCapabilities";
import { api } from "@/lib/api";
import type { AtelierSeed } from "@/lib/atelier";
import { dependencyCandidates } from "@/lib/display";
import { FIELD_LABEL_CLASSES, SHEET_FOOTER_CLASSES } from "@/lib/overlayStyles";
import { appendMarkdownLine, handleMediaPaste } from "@/lib/paste";
import { resolveProjectChoice } from "@/lib/projectSelection";

const SHEET_TITLE = "Créer un ticket";

interface NewTicketSheetProps {
  open: boolean;
  projects: ProjectInfo[];
  onClose: () => void;
  onOpenAtelier?: (seed: AtelierSeed) => void;
}

const NEW_TICKET_TITLE_DRAFT = "new-ticket:title";
const NEW_TICKET_URL_DRAFT = "new-ticket:external-url";
const NEW_TICKET_DESCRIPTION_DRAFT = "new-ticket:description";

export function NewTicketSheet({ open, projects, onClose, onOpenAtelier }: NewTicketSheetProps) {
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
  const project = resolveProjectChoice(projects, projectChoice);
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
  // A cloud host refuses auto-merge, direct push and merge delivery: force them off, not only hide them.
  const { prOnly } = useCapabilities();
  const [autonomousChoice, setAutonomousOptions] = useState<AutonomousOptionValues>({ autonomous: false, autonomousDelivery: null, autonomousMaxCorrections: AUTONOMOUS_DEFAULT_MAX_CORRECTIONS, autonomousTimeoutMinutes: AUTONOMOUS_DEFAULT_TIMEOUT_MINUTES, autonomousMaxStarts: AUTONOMOUS_DEFAULT_MAX_STARTS, autonomousFinalizationMinutes: AUTONOMOUS_DEFAULT_FINALIZATION_MINUTES, autonomousMaxPublicationAttempts: AUTONOMOUS_DEFAULT_MAX_PUBLICATION_ATTEMPTS });
  const autonomousOptions = prOnlyAutonomousOptions(autonomousChoice, prOnly);
  const [prdEnabled, setPrdEnabled] = useState(false);
  const [prDraft, setPrDraft] = useState(true);
  // null = untouched → fall back to the selected project's configured default.
  const [autoMergeChoice, setAutoMergeChoice] = useState<boolean | null>(null);
  const autoMerge = !prOnly && (autoMergeChoice ?? selectedProject?.defaultAutoMerge ?? false);
  // Screenshots are unavailable when auto-merge is on (the PR is merged before a human reads it).
  const addScreenshots =
    !autoMerge && (selectedProject?.defaultAddScreenshots ?? false);
  const [verifyFeature, setVerifyFeature] = useState(false);
  const [argusMultiLoop, setArgusMultiLoop] = useState(false);
  const [stealth, setStealth] = useState(false);
  const [directPushChoice, setDirectPush] = useState(false);
  const directPush = !prOnly && directPushChoice;
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
    setAutonomousOptions({ autonomous: false, autonomousDelivery: null, autonomousMaxCorrections: AUTONOMOUS_DEFAULT_MAX_CORRECTIONS, autonomousTimeoutMinutes: AUTONOMOUS_DEFAULT_TIMEOUT_MINUTES, autonomousMaxStarts: AUTONOMOUS_DEFAULT_MAX_STARTS, autonomousFinalizationMinutes: AUTONOMOUS_DEFAULT_FINALIZATION_MINUTES, autonomousMaxPublicationAttempts: AUTONOMOUS_DEFAULT_MAX_PUBLICATION_ATTEMPTS });
    setPrdEnabled(false);
    setPrDraft(true);
    setAutoMergeChoice(null);
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
    setDescription((prev) => appendMarkdownLine(prev, markdown));
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
        autoMerge: autonomousOptions.autonomous ? false : autoMerge,
        ...autonomousOptions,
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

  const autonomousAvailability = autonomousEligibility(selectedProject, agent.implementer, !dependsOnValid);
  const autonomousEligible = autonomousAvailability.eligible;
  const updateAutonomousOptions = (next: AutonomousOptionValues): void => {
    setAutonomousOptions(next);
    if (next.autonomous) {
      setAutoMergeChoice(false);
      setStealth(false);
      setDirectPush(false);
    }
  };
  let deliveryLabel = prDraft ? "Pull request brouillon" : "Pull request non brouillon";
  if (autonomousOptions.autonomous) {
    if (autonomousOptions.autonomousDelivery === "merge") deliveryLabel = "Fusion après les contrôles autonomes";
    else if (autonomousOptions.autonomousDelivery === "pr_only") deliveryLabel = "Pull request après les contrôles autonomes";
    else deliveryLabel = "Livraison autonome à choisir";
  } else if (directPush) deliveryLabel = "Push direct sur la branche cible";
  else if (stealth) deliveryLabel = "Branche à relire, sans pull request";
  else if (autoMerge) deliveryLabel = "Fusion automatique de la pull request";

  const submitDisabled = busy || (!title.trim() && !description.trim()) || !project || (autonomousOptions.autonomous && (!autonomousEligible || autonomousOptions.autonomousDelivery === null));

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
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            <p className="text-xs text-muted-foreground">Ticket d’implémentation · créez une carte à préparer ou lancez son exécution.</p>
            <ProjectSelect
              id="project"
              projects={projects}
              value={project}
              onChange={setProjectChoice}
            />
            <div className="flex flex-1 flex-col space-y-1.5">
              <Label htmlFor="description" className={FIELD_LABEL_CLASSES}>
                Quel résultat souhaitez-vous ?
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onPaste={onPaste}
                className="min-h-48 flex-1"
                placeholder="Décrivez le résultat attendu, le contexte et les critères de réussite…"
              />
              <p className="text-xs text-muted-foreground">Markdown accepté. Collez une image pour l’attacher ; les liens Figma sont conservés.</p>
              {onOpenAtelier && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={() => onOpenAtelier({ project, title, description })}
                  disabled={!project}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Élaborer dans l'Atelier
                </Button>
              )}
            </div>
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
            <details className="rounded-md border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium">Lien externe et import Notion{externalUrl ? " · lien renseigné" : ""}</summary>
              <div className="mt-3">
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
              </div>
            </details>
            <ImplementationSettings agent={agent} />
            <section className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
              <h3 className="text-sm font-medium">Livraison et contrôles</h3>
              <dl className="space-y-1 text-xs">
                <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Branche de départ</dt><dd className="break-all font-mono">{baseBranch || "Défaut du projet"}</dd></div>
                <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Livraison</dt><dd>{deliveryLabel}</dd></div>
                <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Plan préalable</dt><dd>{prdEnabled ? "PRD demandée" : "Sans PRD"}</dd></div>
                <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Vérification de la fonctionnalité</dt><dd>{verifyFeature ? "Demandée avant la PR" : "Non demandée"}</dd></div>
                <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Corrections de relecture</dt><dd>{argusMultiLoop ? "Jusqu’à deux boucles" : "Une passe"}</dd></div>
                <div className="flex flex-wrap justify-between gap-2"><dt className="text-muted-foreground">Captures dans la PR</dt><dd>{addScreenshots ? "Demandées" : "Non demandées"}</dd></div>
              </dl>
              {dependsOnValid && <p className="text-xs text-muted-foreground">Dépend de : {dependsCandidates.find((ticket) => ticket.id === dependsOnValid)?.title}</p>}
              {autonomousOptions.autonomous && <p className="text-xs text-muted-foreground">Exécution autonome · {autonomousOptions.autonomousMaxCorrections} correction(s) maximum · {autonomousOptions.autonomousTimeoutMinutes} minutes.</p>}
              {autonomousOptions.autonomous && !autonomousEligible && <p role="alert" className="text-xs text-danger">{autonomousAvailability.reason}</p>}
              {autonomousOptions.autonomous && autonomousOptions.autonomousDelivery === null && <p role="alert" className="text-xs text-danger">Choisissez la livraison autonome dans les options avant de créer le ticket.</p>}
              {prOnly && <p className="text-xs text-muted-foreground">Cet environnement livre uniquement une pull request ; fusion automatique et push direct ne sont pas disponibles.</p>}
            </section>
            <details open className="rounded-md border border-border p-3">
              <summary className="cursor-pointer text-sm font-medium">Modifier la branche, les dépendances et les options</summary>
              <div className="mt-3 space-y-4 border-t border-border pt-3">
                <div className="space-y-1.5">
                  <Label htmlFor="base-branch" className={FIELD_LABEL_CLASSES}>
                    Branche de départ
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
                    Dépendance (PR empilée)
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
                <TicketOptionsToggleGroup
                  autonomous={autonomousOptions.autonomous}
                  autonomousControl={{
                    disabled: !autonomousEligible && !autonomousOptions.autonomous,
                    unavailableReason: autonomousAvailability.reason,
                    onChange: (autonomous) => updateAutonomousOptions({ ...autonomousOptions, autonomous }),
                  }}
                  key={optionsKey}
                  prOnly={prOnly}
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
                >
                  <AutonomousOptions id="new-autonomous" values={autonomousOptions} prOnly={prOnly} onChange={updateAutonomousOptions} />
                </TicketOptionsToggleGroup>
              </div>
            </details>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
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
            Créer le ticket
          </Button>
          <Button size="sm" onClick={() => void submit(true)} disabled={submitDisabled}>
            Créer et lancer
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
