import { FolderOpen } from "lucide-react";
import { useState, type ReactNode } from "react";

import type { VcsProvider } from "@shared/constants";
import { DEFAULT_PROJECT_COLOR, DEFAULT_VCS_PROVIDER, VCS_PROVIDERS, VCS_PROVIDER_LABELS } from "@shared/constants";
import type { CreateProjectInput, ManagedProject, UpdateProjectInput, VcsConnectionResult } from "@shared/schemas";
import { vcsProviderSchema } from "@shared/schemas";

import { Button } from "@/components/ui/button";
import { ConfirmPopover } from "@/components/ui/confirm";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SettingsFooter } from "@/components/ui/settings";
import { useSavedFlag } from "@/hooks/useSavedFlash";
import { api } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";
import { timeoutUnitMs, timeoutUnitOf, type TimeoutUnit } from "@/lib/projectDisplay";

const DEFAULT_COMMIT_TIMEOUT_MS = 600000;
const TIMEOUT_UNITS: TimeoutUnit[] = ["min", "s"];
const MUTED_TEXT_CLASS = "text-muted-foreground";
const PROJECT_GROUP_LIST_ID = "project-group-suggestions";

function toVcsProvider(value: string): VcsProvider {
  const parsed = vcsProviderSchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_VCS_PROVIDER;
}

interface ConnectionHint {
  message: string;
  className: string;
}

function connectionHint(
  saved: boolean,
  dirty: boolean,
  testing: boolean,
  result: VcsConnectionResult | null,
): ConnectionHint {
  if (!saved) return { message: "Enregistrez le projet pour tester la connexion.", className: MUTED_TEXT_CLASS };
  if (dirty) {
    return { message: "Enregistrez vos modifications pour tester la connexion.", className: MUTED_TEXT_CLASS };
  }
  if (testing) return { message: "Test en cours…", className: MUTED_TEXT_CLASS };
  if (result === null) return { message: "", className: MUTED_TEXT_CLASS };
  return { message: result.message, className: result.ok ? "text-success" : "text-destructive" };
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
}: ProjectPanelProps) {
  const initialTimeoutMs = project?.commitTimeoutMs ?? DEFAULT_COMMIT_TIMEOUT_MS;
  const initialUnit = timeoutUnitOf(initialTimeoutMs);

  const [label, setLabel] = useState(project?.label ?? "");
  const [group, setGroup] = useState(project?.group ?? "");
  const [repoPath, setRepoPath] = useState(project?.repoPath ?? "");
  const [baseBranch, setBaseBranch] = useState(project?.baseBranch ?? "");
  const [runScript, setRunScript] = useState(project?.runScript ?? "");
  const [vcsProvider, setVcsProvider] = useState<VcsProvider>(project?.vcsProvider ?? DEFAULT_VCS_PROVIDER);
  const [connection, setConnection] = useState<VcsConnectionResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [unit, setUnit] = useState<TimeoutUnit>(initialUnit);
  const [timeoutValue, setTimeoutValue] = useState(String(initialTimeoutMs / timeoutUnitMs(initialUnit)));
  const [color, setColor] = useState(project?.color ?? DEFAULT_PROJECT_COLOR);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const { saved: savedVisible, flashSaved } = useSavedFlag();

  const commitTimeoutMs = String(Number(timeoutValue) * timeoutUnitMs(unit));
  const valid = isValidDraft(label, repoPath, baseBranch, timeoutValue);
  const normalizedGroup = group.trim();
  const grouped = normalizedGroup !== "";
  const inheritedColor = projects.find((managedProject) => managedProject.group?.trim() === normalizedGroup)?.color
    ?? DEFAULT_PROJECT_COLOR;
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
    runScript !== (project.runScript ?? "") ||
    vcsProvider !== project.vcsProvider ||
    (!grouped && color !== (project.color ?? DEFAULT_PROJECT_COLOR));

  const hint = connectionHint(project !== null, dirty, testing, connection);

  const pickFolder = async (): Promise<void> => {
    onError(null);
    setPicking(true);
    try {
      const picked = await api.pickFolder();
      if (picked !== null) setRepoPath(picked);
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setPicking(false);
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
    if (runScript !== (current.runScript ?? "")) patch.runScript = runScript.trim() || null;
    if (!grouped && color !== (current.color ?? DEFAULT_PROJECT_COLOR)) patch.color = color;
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
      ...(runScript.trim() !== "" ? { runScript: runScript.trim() } : {}),
    };
    if (!grouped) input.color = color;
    const created = await api.createProject(input);
    await onCreated(created);
  };

  const update = async (current: ManagedProject): Promise<void> => {
    const saved = await api.updateProject(current.key, buildPatch(current));
    setLabel(saved.label);
    setGroup(saved.group ?? "");
    setRepoPath(saved.repoPath);
    setBaseBranch(saved.baseBranch);
    setRunScript(saved.runScript ?? "");
    setVcsProvider(saved.vcsProvider);
    setColor(saved.color ?? DEFAULT_PROJECT_COLOR);
    setConnection(null);
    await onSaved();
    flashSaved();
  };

  const testConnection = async (current: ManagedProject): Promise<void> => {
    onError(null);
    setTesting(true);
    try {
      setConnection(await api.testProjectConnection(current.key));
    } catch (e) {
      setConnection({ ok: false, message: errorMessage(e), checkedAt: Date.now() });
    } finally {
      setTesting(false);
    }
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

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-4">
      <p className="text-sm font-semibold">{project?.label ?? "Nouveau projet"}</p>

      <div className="flex flex-col gap-3">
        <Field label="Nom">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nom du projet" />
        </Field>
        <Field label="Groupe / client">
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
          <div className="flex w-full items-center gap-2">
            <Input
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="/chemin/vers/le/dépôt"
            />
            {canPickFolder && (
              <Button
                variant="outline"
                onClick={() => void pickFolder()}
                disabled={picking || busy}
                aria-label="Parcourir"
              >
                <FolderOpen className="h-4 w-4" />
                Parcourir
              </Button>
            )}
          </div>
        </Field>
        <Field label="Branche de base">
          <Input value={baseBranch} onChange={(e) => setBaseBranch(e.target.value)} placeholder="main" />
        </Field>
        <Field label="Fournisseur">
          <div className="flex w-full flex-col items-start gap-1.5">
            <Select
              value={vcsProvider}
              onChange={(e) => setVcsProvider(toVcsProvider(e.target.value))}
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
                onClick={() => {
                  if (project !== null) void testConnection(project);
                }}
                disabled={project === null || dirty || testing || busy}
              >
                Tester la connexion
              </Button>
              <span role="status" className={`text-xs ${hint.className}`}>
                {hint.message}
              </span>
            </div>
          </div>
        </Field>
        <Field label="Commande de démarrage">
          <Input
            value={runScript}
            onChange={(e) => setRunScript(e.target.value)}
            placeholder="bun run dev"
          />
        </Field>
        <Field label="Délai max d'un commit">
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
        <Field label="Couleur">
          {grouped ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className="h-6 w-6 shrink-0 rounded border border-input"
                style={{ backgroundColor: inheritedColor }}
                aria-hidden="true"
              />
              Héritée du groupe « {normalizedGroup} »
            </div>
          ) : (
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background"
              aria-label="Couleur du projet"
            />
          )}
        </Field>
      </div>

      <SettingsFooter dirty={dirty && project !== null} justSaved={savedVisible}>
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
        {project === null && cancellable && (
          <Button variant="ghost" size="sm" onClick={onCancelCreate} disabled={busy}>
            Annuler
          </Button>
        )}
        {dirty && (
          <Button size="sm" onClick={() => void submit()} disabled={busy || !valid}>
            {project === null ? "Ajouter le projet" : "Enregistrer"}
          </Button>
        )}
      </SettingsFooter>

    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <Label className={FIELD_LABEL_CLASSES}>{label}</Label>
      {children}
    </div>
  );
}
