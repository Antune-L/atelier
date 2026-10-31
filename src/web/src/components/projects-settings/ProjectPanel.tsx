import { useRef, useState } from "react";

import type { VcsProvider } from "@shared/constants";
import { DEFAULT_VCS_PROVIDER, VCS_PROVIDERS, VCS_PROVIDER_LABELS, pickProjectColor } from "@shared/constants";
import type {
  CreateProjectInput,
  ManagedProject,
  RepoInspection,
  UpdateProjectInput,
  VcsConnectionResult,
} from "@shared/schemas";
import { vcsProviderSchema } from "@shared/schemas";

import { GithubCloneStep } from "@/components/projects-settings/GithubCloneStep";
import { GithubSetupGuide } from "@/components/projects-settings/GithubSetupGuide";
import {
  AdvancedSection,
  Field,
  FolderStep,
  InspectionBanners,
  RepoPathInput,
  SummaryItem,
  suggestionHint,
  type FolderSourceMode,
} from "@/components/projects-settings/ProjectPanelParts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectPreviewSettings } from "@/components/projects-settings/ProjectPreviewSettings";
import { ProjectAuditSettings } from "@/components/projects-settings/ProjectAuditSettings";
import { ConfirmPopover } from "@/components/ui/confirm";
import { BranchCombobox, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SettingsFooter } from "@/components/ui/settings";
import { ValidationConfigFields, validationDraft, validationDraftConfig, type ValidationDraft } from "@/components/projects-settings/ValidationConfigFields";
import { useCapabilities } from "@/hooks/useCapabilities";
import { useGithubAccounts } from "@/hooks/useGithubAccounts";
import { useSavedFlag } from "@/hooks/useSavedFlash";
import { api } from "@/lib/api";
import type { CloneProjectResponse } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { connectionHint } from "@/lib/projectConnection";
import { timeoutUnitMs, timeoutUnitOf, type TimeoutUnit } from "@/lib/projectDisplay";

const DEFAULT_COMMIT_TIMEOUT_MS = 600000;
const TIMEOUT_UNITS: TimeoutUnit[] = ["min", "s"];
const PROJECT_GROUP_LIST_ID = "project-group-suggestions";
const SUMMARY_SEPARATOR = " · ";
const MACHINE_ACCOUNT_VALUE = "";
const BASE_BRANCH_INPUT_ID = "project-base-branch";

type CreateStep = "folder" | "form";

function toVcsProvider(value: string): VcsProvider {
  const parsed = vcsProviderSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_VCS_PROVIDER;
}

function isPositiveIntegerString(value: string): boolean {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
}

function isValidDraft(label: string, repoPath: string, baseBranch: string, timeoutValue: string): boolean {
  return (
    label.trim() !== "" &&
    repoPath.trim() !== "" &&
    baseBranch.trim() !== "" &&
    isPositiveIntegerString(timeoutValue)
  );
}

interface ProjectPanelProps {
  project: ManagedProject | null;
  projects: ManagedProject[];
  canPickFolder: boolean;
  cancellable: boolean;
  onError: (message: string | null) => void;
  onSaved: () => Promise<void>;
  onCreated: (created: ManagedProject) => Promise<void>;
  onDeleted: () => Promise<void>;
  onCancelCreate: () => void;
  onOpenExisting: (key: string) => void;
}

export function ProjectPanel({
  project,
  projects,
  canPickFolder,
  cancellable,
  onError,
  onSaved,
  onCreated,
  onDeleted,
  onCancelCreate,
  onOpenExisting,
}: ProjectPanelProps) {
  const initialTimeoutMs = project?.commitTimeoutMs ?? DEFAULT_COMMIT_TIMEOUT_MS;
  const initialUnit = timeoutUnitOf(initialTimeoutMs);

  const [label, setLabel] = useState(project?.label ?? "");
  const [group, setGroup] = useState(project?.group ?? "");
  const [repoPath, setRepoPath] = useState(project?.repoPath ?? "");
  const [baseBranch, setBaseBranch] = useState(project?.baseBranch ?? "");
  const [vcsProvider, setVcsProvider] = useState<VcsProvider>(project?.vcsProvider ?? DEFAULT_VCS_PROVIDER);
  const [connection, setConnection] = useState<VcsConnectionResult | null>(null);
  const [testing, setTesting] = useState(false);
  const connectionGeneration = useRef(0);
  const [unit, setUnit] = useState<TimeoutUnit>(initialUnit);
  const [timeoutValue, setTimeoutValue] = useState(String(initialTimeoutMs / timeoutUnitMs(initialUnit)));
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [step, setStep] = useState<CreateStep>(project === null ? "folder" : "form");
  const [inspection, setInspection] = useState<RepoInspection | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [repoOpen, setRepoOpen] = useState(false);
  const [validation, setValidation] = useState(() => validationDraft(project?.validation));
  const [validationInspection, setValidationInspection] = useState<RepoInspection | null>(null);
  const validationInspectionGeneration = useRef(0);
  const [savedBranches, setSavedBranches] = useState<string[] | null>(null);
  const [sourceMode, setSourceMode] = useState<FolderSourceMode>("local");
  const [githubAccount, setGithubAccount] = useState<string | null>(project?.githubAccount ?? null);
  const [clonedUrl, setClonedUrl] = useState<string | null>(null);
  const { githubAvailable } = useCapabilities();
  const { accounts: githubAccounts } = useGithubAccounts();
  const { saved: savedVisible, flashSaved } = useSavedFlag();

  const commitTimeoutMs = String(Number(timeoutValue) * timeoutUnitMs(unit));
  const validationConfig = validationDraftConfig(validation);
  const validationDirty = JSON.stringify(validation) !== JSON.stringify(validationDraft(project?.validation));
  const valid = isValidDraft(label, repoPath, baseBranch, timeoutValue) && (!validation.enabled || validationConfig !== null);
  const normalizedGroup = group.trim();
  const grouped = normalizedGroup !== "";
  const groupSuggestions = Array.from(
    new Set(projects.flatMap((managedProject) => (managedProject.group ? [managedProject.group] : []))),
  ).sort((left, right) => left.localeCompare(right));

  const dirty =
    project === null ||
    label !== project.label ||
    group !== (project.group ?? "") ||
    repoPath !== project.repoPath ||
    commitTimeoutMs !== String(project.commitTimeoutMs) ||
    baseBranch !== project.baseBranch ||
    vcsProvider !== project.vcsProvider ||
    githubAccount !== project.githubAccount ||
    validationDirty;

  const creating = project === null;
  // Keep the current account selectable even if it is no longer registered (its status shows in Réglages).
  const githubAccountOptions = Array.from(new Set([
    ...githubAccounts.map((account) => account.login),
    ...(githubAccount !== null ? [githubAccount] : []),
  ])).sort((left, right) => left.localeCompare(right));
  const hint = connectionHint(testing, connection, vcsProvider);
  const inspectionBlocks =
    creating && inspection !== null && (!inspection.isGitRepo || inspection.existingProjectKey !== null);
  const providerUndetected = creating && inspection !== null && inspection.isGitRepo && inspection.vcsProvider === null;
  const branchOptions = inspection?.branchCandidates ?? savedBranches ?? [];
  const identityOrigin = suggestionHint(inspection?.group, group);
  const labelOrigin = suggestionHint(inspection?.label, label);
  const deliveryOrigin = [suggestionHint(inspection?.baseBranch, baseBranch), suggestionHint(inspection?.vcsProvider, vcsProvider)]
    .filter(Boolean).join(SUMMARY_SEPARATOR);

  const clearConnection = (): void => {
    connectionGeneration.current += 1;
    setTesting(false);
    setConnection(null);
  };

  const changeRepoPath = (value: string): void => {
    setRepoPath(value);
    clearConnection();
  };

  const changeVcsProvider = (value: VcsProvider): void => {
    setVcsProvider(value);
    clearConnection();
    // An account only applies to GitHub projects; the server refuses it on Azure DevOps.
    if (value !== "github") setGithubAccount(null);
  };

  const changeGithubAccount = (value: string | null): void => {
    setGithubAccount(value);
    clearConnection();
  };

  const runConnectionTest = async (request: () => Promise<VcsConnectionResult>): Promise<void> => {
    const generation = ++connectionGeneration.current;
    setTesting(true);
    try {
      const result = await request();
      if (generation === connectionGeneration.current) setConnection(result);
    } catch (e) {
      if (generation === connectionGeneration.current) setConnection({ ok: false, message: errorMessage(e), checkedAt: Date.now() });
    } finally {
      if (generation === connectionGeneration.current) setTesting(false);
    }
  };

  const applyInspection = (result: RepoInspection, account: string | null): void => {
    const provider = result.vcsProvider?.value ?? DEFAULT_VCS_PROVIDER;
    setInspection(result);
    setRepoPath(result.repoPath);
    clearConnection();
    setLabel(result.label?.value ?? "");
    setGroup(result.group?.value ?? "");
    setBaseBranch(result.baseBranch?.value ?? "");
    setVcsProvider(provider);
    setGithubAccount(provider === "github" ? account : null);
  };

  const deliveryNeedsReview = (result: RepoInspection): boolean => {
    if (!result.isGitRepo) return false;
    const base = result.baseBranch;
    return result.vcsProvider === null
      || base?.source !== "remoteHead"
      || (result.currentBranch !== null && result.currentBranch !== base.value);
  };

  const enterForm = (result: RepoInspection, account: string | null): void => {
    applyInspection(result, account);
    setRepoOpen(deliveryNeedsReview(result));
    setStep("form");
    const detected = result.vcsProvider;
    if (result.isGitRepo && detected !== null) {
      void runConnectionTest(() =>
        api.testDraftConnection({ repoPath: result.repoPath, vcsProvider: detected.value }),
      );
    }
  };

  /** « Depuis GitHub »: the server-side clone joins the same form as an inspected local folder. */
  const applyClone = (result: CloneProjectResponse, account: string | null): void => {
    setClonedUrl(result.cloneUrl);
    enterForm(result.inspection, account);
  };

  const inspect = async (path: string): Promise<void> => {
    const trimmed = path.trim();
    if (trimmed === "") return;
    onError(null);
    setInspecting(true);
    try {
      const result = await api.inspectProject({ repoPath: trimmed });
      setClonedUrl(null);
      enterForm(result, result.githubAccount?.value ?? null);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setInspecting(false);
    }
  };

  const pickFolder = async (): Promise<void> => {
    onError(null);
    setPicking(true);
    try {
      const picked = await api.pickFolder();
      if (picked === null) return;
      changeRepoPath(picked);
      if (creating) await inspect(picked);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setPicking(false);
    }
  };

  const prefillValidationStartCommand = async (current: ManagedProject): Promise<void> => {
    const generation = ++validationInspectionGeneration.current;
    try {
      const result = await api.inspectProject({ repoPath: current.repoPath });
      if (generation !== validationInspectionGeneration.current) return;
      setValidationInspection(result);
      const suggested = result.validationStartCommand?.value;
      if (suggested === undefined) return;
      setValidation((draft) => (draft.enabled && draft.startCommand.trim() === "" ? { ...draft, startCommand: suggested } : draft));
    } catch {
      return;
    }
  };

  const changeValidation = (next: ValidationDraft): void => {
    const neverConfigured = project !== null && project.validation === undefined;
    if (neverConfigured && !next.enabled) {
      validationInspectionGeneration.current += 1;
      setValidation(validationDraft(undefined));
      return;
    }
    setValidation(next);
    if (neverConfigured && !validation.enabled && next.enabled && next.startCommand.trim() === "") {
      void prefillValidationStartCommand(project);
    }
  };

  const loadSavedBranches = async (): Promise<void> => {
    if (project === null || savedBranches !== null) return;
    setSavedBranches([]);
    try {
      setSavedBranches(await api.projectBranches(project.key));
    } catch {
      return;
    }
  };

  const buildPatch = (current: ManagedProject): UpdateProjectInput => {
    const patch: UpdateProjectInput = {};
    if (label !== current.label) patch.label = label.trim();
    if (group !== (current.group ?? "")) patch.group = normalizedGroup || null;
    if (repoPath !== current.repoPath) patch.repoPath = repoPath.trim();
    if (baseBranch !== current.baseBranch) patch.baseBranch = baseBranch.trim();
    if (commitTimeoutMs !== String(current.commitTimeoutMs)) patch.commitTimeoutMs = Number(commitTimeoutMs);
    if (vcsProvider !== current.vcsProvider) patch.vcsProvider = vcsProvider;
    if (validationDirty) patch.validation = validationConfig;
    if (githubAccount !== current.githubAccount) patch.githubAccount = githubAccount;
    return patch;
  };

  const create = async (): Promise<void> => {
    const input: CreateProjectInput = {
      label: label.trim(),
      repoPath: repoPath.trim(),
      baseBranch: baseBranch.trim(),
      commitTimeoutMs: Number(commitTimeoutMs),
      vcsProvider,
      ...(normalizedGroup !== "" ? { group: normalizedGroup } : {}),
      ...(vcsProvider === "github" && githubAccount !== null ? { githubAccount } : {}),
    };
    if (!grouped) input.color = pickProjectColor(projects.map((managedProject) => managedProject.color));
    const created = await api.createProject(input);
    await onCreated(created);
  };

  const update = async (current: ManagedProject): Promise<void> => {
    const saved = await api.updateProject(current.key, buildPatch(current));
    setLabel(saved.label);
    setGroup(saved.group ?? "");
    setRepoPath(saved.repoPath);
    setBaseBranch(saved.baseBranch);
    setVcsProvider(saved.vcsProvider);
    setGithubAccount(saved.githubAccount);
    setValidation(validationDraft(saved.validation));
    clearConnection();
    await onSaved();
    flashSaved();
  };

  const testConnection = async (): Promise<void> => {
    onError(null);
    if (project !== null && !dirty) {
      await runConnectionTest(() => api.testProjectConnection(project.key));
      return;
    }
    await runConnectionTest(() => api.testDraftConnection({ repoPath: repoPath.trim(), vcsProvider }));
  };

  const submit = async (): Promise<void> => {
    onError(null);
    setBusy(true);
    try {
      if (project === null) {
        await create();
        return;
      }
      await update(project);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (current: ManagedProject): Promise<void> => {
    onError(null);
    setBusy(true);
    try {
      await api.deleteProject(current.key);
      await onDeleted();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const cancelButton = creating && cancellable && (
    <Button variant="ghost" size="sm" onClick={onCancelCreate} disabled={busy || inspecting}>
      Annuler
    </Button>
  );

  if (creating && step === "folder") {
    return (
      <div className="space-y-5 rounded-xl border bg-background p-5 sm:p-6">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Étape 1 sur 2 · Source du projet</p>
          <h4 className="text-lg font-semibold">Ajouter un projet</h4>
          <p className="text-sm text-muted-foreground">Sélectionnez un dépôt. Vous pourrez confirmer les réglages proposés avant de l’ajouter.</p>
        </div>
        <FolderStep
          repoPath={repoPath}
          canPickFolder={canPickFolder}
          inspecting={inspecting}
          disabled={picking || busy}
          onRepoPathChange={changeRepoPath}
          onPick={() => void pickFolder()}
          onAnalyze={() => void inspect(repoPath)}
          githubAvailable={githubAvailable}
          mode={sourceMode}
          onModeChange={setSourceMode}
          githubStep={<GithubCloneStep disabled={picking || busy} onCloned={applyClone} onError={onError} />}
        />
        <GithubSetupGuide provider={vcsProvider} />
        {cancelButton && (
          <SettingsFooter dirty={false} justSaved={false}>
            {cancelButton}
          </SettingsFooter>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2 py-1">
        {creating && <p className="mb-2 text-xs font-medium text-muted-foreground">Étape 2 sur 2 · Confirmer le projet</p>}
        {project !== null && (
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{normalizedGroup || "Sans groupe"}</span>
            {project.hidden && <Badge variant="outline">Masqué</Badge>}
          </div>
        )}
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nom du projet"
          aria-label="Nom du projet"
          className="-mx-2 h-auto border-transparent bg-transparent px-2 py-1 text-2xl font-semibold shadow-none hover:border-input focus-visible:border-input"
        />
        {labelOrigin && <p className="mt-1 text-xs text-muted-foreground">Nom {labelOrigin}</p>}
        {project !== null && <p className="mt-1 text-sm text-muted-foreground">Le nécessaire pour travailler sur ce projet.</p>}
        {creating && <p className="mt-2 text-xs text-muted-foreground">Les valeurs ci-dessous sont proposées depuis le dépôt. Vérifiez-les, puis confirmez l’ajout. Aucune commande de démarrage n’a été exécutée.</p>}
      </div>

      {creating && inspection !== null && (
        <InspectionBanners inspection={inspection} onOpenExisting={onOpenExisting} />
      )}

      <div className="flex flex-col gap-3">
        <AdvancedSection
          title="Dépôt et livraison"
          open={repoOpen || baseBranch.trim() === ""}
          onToggle={() => setRepoOpen((open) => !open)}
          summary={
            <div className="flex w-full flex-col gap-2">
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                <SummaryItem label="Hébergement">{VCS_PROVIDER_LABELS[vcsProvider]}</SummaryItem>
                <SummaryItem label="Branche cible">{baseBranch || "À renseigner"}</SummaryItem>
                {vcsProvider === "github" && (
                  <SummaryItem label="Compte GitHub">{githubAccount ?? "Compte par défaut de la machine"}</SummaryItem>
                )}
                {project !== null && (
                  <SummaryItem label="Délai de préparation">{timeoutValue} {unit}</SummaryItem>
                )}
              </div>
              <code className="break-all text-xs">{repoPath}</code>
              {identityOrigin && <p>Groupe {identityOrigin}</p>}
              {deliveryOrigin && <p>{deliveryOrigin}</p>}
              <p role="status" className={hint.className}>{hint.message}</p>
            </div>
          }
        >
        <Field label="Groupe / client" hint={suggestionHint(inspection?.group, group)}>
          <Input
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            placeholder="Fauna"
            aria-label="Groupe ou client"
            list={PROJECT_GROUP_LIST_ID}
          />
          <datalist id={PROJECT_GROUP_LIST_ID}>
            {groupSuggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </Field>
        <Field label="Chemin">
          <RepoPathInput
            value={repoPath}
            canPickFolder={canPickFolder}
            disabled={picking || busy || inspecting}
            readOnly={creating}
            onChange={changeRepoPath}
            onPick={() => void pickFolder()}
          />
        </Field>
        {creating && clonedUrl !== null && (
          <p className="text-xs text-muted-foreground">
            Cloné depuis <code>{clonedUrl}</code>
          </p>
        )}
        {inspecting && (
          <p role="status" className="text-xs text-muted-foreground">
            Analyse du dépôt…
          </p>
        )}
        <Field label="Branche de base" hint={suggestionHint(inspection?.baseBranch, baseBranch)}>
          <div className="w-full" onFocus={() => void loadSavedBranches()}>
            <BranchCombobox
              id={BASE_BRANCH_INPUT_ID}
              value={baseBranch}
              onChange={(value) => { setRepoOpen(true); setBaseBranch(value); }}
              options={branchOptions}
              placeholder="main"
            />
          </div>
        </Field>
        <Field label="Fournisseur" hint={suggestionHint(inspection?.vcsProvider, vcsProvider)}>
          <div className="flex w-full flex-col items-start gap-1.5">
            {providerUndetected && (
              <p role="alert" className="text-xs text-warning">
                Aucun fournisseur reconnu dans le remote origin : GitHub est proposé par défaut, choisissez le bon fournisseur.
              </p>
            )}
            <Select
              value={vcsProvider}
              onChange={(e) => changeVcsProvider(toVcsProvider(e.target.value))}
              aria-label="Fournisseur"
            >
              {VCS_PROVIDERS.map((option) => (
                <option key={option} value={option}>
                  {VCS_PROVIDER_LABELS[option]}
                </option>
              ))}
            </Select>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void testConnection()}
                disabled={repoPath.trim() === "" || testing || busy || inspecting}
              >
                Tester la connexion
              </Button>
              <span role="status" className={`text-xs ${hint.className}`}>
                {hint.message}
              </span>
            </div>
            {vcsProvider === "github" && dirty && (
              <p className="text-xs text-muted-foreground">
                Ce test de brouillon utilise le compte résolu depuis le dépôt et le serveur, pas le sélecteur non enregistré.
                Enregistrez le projet puis retestez pour vérifier le compte enregistré.
              </p>
            )}
            <GithubSetupGuide provider={vcsProvider} />
          </div>
        </Field>
        {vcsProvider === "github" && (
          <Field label="Compte GitHub" hint={clonedUrl === null ? suggestionHint(inspection?.githubAccount, githubAccount) : undefined}>
            <div className="flex w-full flex-col items-start gap-1">
              <Select
                value={githubAccount ?? MACHINE_ACCOUNT_VALUE}
                onChange={(e) => changeGithubAccount(e.target.value === MACHINE_ACCOUNT_VALUE ? null : e.target.value)}
                aria-label="Compte GitHub du projet"
                disabled={busy || inspecting || (creating && clonedUrl !== null)}
              >
                <option value={MACHINE_ACCOUNT_VALUE}>Compte par défaut de la machine</option>
                {githubAccountOptions.map((login) => (
                  <option key={login} value={login}>
                    {login}
                  </option>
                ))}
              </Select>
              <span className="text-xs text-muted-foreground">
                Toutes les opérations GitHub du projet (agents, push, PR) utilisent ce compte. Non modifiable tant que
                des tickets sont en cours.
              </span>
            </div>
          </Field>
        )}
        {project !== null && (
          <Field label="Délai de préparation (setup + installation)">
            <div className="flex w-full items-center gap-2">
              <Input
                type="number"
                min={1}
                step={1}
                className="w-28"
                value={timeoutValue}
                onChange={(e) => setTimeoutValue(e.target.value)}
              />
              <Select
                value={unit}
                onChange={(e) => setUnit(e.target.value === "s" ? "s" : "min")}
                aria-label="Unité du délai"
              >
                {TIMEOUT_UNITS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
          </Field>
        )}
        </AdvancedSection>
        {creating && (
          <p className="text-xs text-muted-foreground">Validation, prévisualisations et audit se configurent après l’ajout du projet.</p>
        )}
        {project !== null && (
          <section className="flex flex-col gap-3 pt-2">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Fonctions du projet</h3>
              <p className="text-xs text-muted-foreground">Leur état reste visible. Chacune a sa propre portée d’enregistrement.</p>
            </div>
            <ValidationConfigFields
              value={validation}
              onChange={changeValidation}
              startCommandHint={suggestionHint(validationInspection?.validationStartCommand, validation.startCommand)}
              composeFile={validationInspection?.composeFile ?? null}
              pending={validationDirty}
            />
            <ProjectPreviewSettings key={project.key} project={project} />
            <ProjectAuditSettings key={project.key} project={project} collapsible />
          </section>
        )}
      </div>

      <SettingsFooter dirty={dirty && !creating} justSaved={savedVisible}>
        {project !== null && (
          <ConfirmPopover
            title="Supprimer le projet"
            description={`Supprimer le projet « ${project.label} » ?`}
            confirmLabel="Supprimer"
            destructive
            onConfirm={() => remove(project)}
          >
            <Button variant="outline" size="sm" disabled={busy}>
              Supprimer
            </Button>
          </ConfirmPopover>
        )}
        {creating && (
          <Button variant="ghost" size="sm" onClick={() => setStep("folder")} disabled={busy || inspecting}>
            Changer de source
          </Button>
        )}
        {cancelButton}
        {dirty && (
          <Button size="sm" onClick={() => void submit()} disabled={busy || inspecting || !valid || inspectionBlocks}>
            {creating ? "Ajouter le projet" : "Enregistrer"}
          </Button>
        )}
      </SettingsFooter>
    </div>
  );
}
