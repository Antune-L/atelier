import { FolderOpen, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import type { CreateProjectInput, ManagedProject, UpdateProjectInput } from "@shared/schemas";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm";
import { Input, Label } from "@/components/ui/input";
import { useCapabilities } from "@/hooks/useCapabilities";
import { refreshProjects } from "@/hooks/useProjects";
import { api } from "@/lib/api";

const DEFAULT_PROJECT_COLOR = "#6366f1";
const DEFAULT_COMMIT_TIMEOUT_MS = 600000;

function isPositiveIntegerString(value: string): boolean {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0;
}

function isValidDraft(label: string, repoPath: string, baseBranch: string, commitTimeoutMs: string): boolean {
  return (
    label.trim() !== "" &&
    repoPath.trim() !== "" &&
    baseBranch.trim() !== "" &&
    isPositiveIntegerString(commitTimeoutMs)
  );
}

/** Projects tab: list, add, edit and delete the managed projects (also reused in onboarding). */
export function ProjectsSettings() {
  const { canPickFolder } = useCapabilities();
  const [projects, setProjects] = useState<ManagedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .manageProjects()
      .then((data) => {
        if (active) setProjects(data);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Erreur");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const reload = async (): Promise<void> => {
    const data = await api.manageProjects();
    setProjects(data);
    await refreshProjects();
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  return (
    <div className="space-y-3">
      {projects.length === 0 && <p className="text-sm text-muted-foreground">Aucun projet.</p>}
      {projects.map((project) => (
        <ProjectRow
          key={project.key}
          project={project}
          canPickFolder={canPickFolder}
          onError={setError}
          onChanged={reload}
        />
      ))}
      <AddProjectForm canPickFolder={canPickFolder} onError={setError} onChanged={reload} />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

interface ProjectRowProps {
  project: ManagedProject;
  canPickFolder: boolean;
  onError: (message: string | null) => void;
  onChanged: () => Promise<void>;
}

function ProjectRow({ project, canPickFolder, onError, onChanged }: ProjectRowProps) {
  const [label, setLabel] = useState(project.label);
  const [repoPath, setRepoPath] = useState(project.repoPath);
  const [baseBranch, setBaseBranch] = useState(project.baseBranch);
  const [commitTimeoutMs, setCommitTimeoutMs] = useState(String(project.commitTimeoutMs));
  const [color, setColor] = useState(project.color ?? DEFAULT_PROJECT_COLOR);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const dirty =
    label !== project.label ||
    repoPath !== project.repoPath ||
    baseBranch !== project.baseBranch ||
    commitTimeoutMs !== String(project.commitTimeoutMs) ||
    color !== (project.color ?? DEFAULT_PROJECT_COLOR);

  const valid = isValidDraft(label, repoPath, baseBranch, commitTimeoutMs);

  const pickFolder = async (): Promise<void> => {
    onError(null);
    setPicking(true);
    try {
      const picked = await api.pickFolder();
      if (picked !== null) setRepoPath(picked);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setPicking(false);
    }
  };

  const buildPatch = (): UpdateProjectInput => {
    const patch: UpdateProjectInput = {};
    if (label !== project.label) patch.label = label.trim();
    if (repoPath !== project.repoPath) patch.repoPath = repoPath.trim();
    if (baseBranch !== project.baseBranch) patch.baseBranch = baseBranch.trim();
    if (commitTimeoutMs !== String(project.commitTimeoutMs)) patch.commitTimeoutMs = Number(commitTimeoutMs);
    if (color !== (project.color ?? DEFAULT_PROJECT_COLOR)) patch.color = color;
    return patch;
  };

  const save = async (): Promise<void> => {
    onError(null);
    setBusy(true);
    try {
      await api.updateProject(project.key, buildPatch());
      await onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (): Promise<void> => {
    setConfirmOpen(false);
    onError(null);
    setBusy(true);
    try {
      await api.deleteProject(project.key);
      await onChanged();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <ProjectFields
            label={label}
            repoPath={repoPath}
            baseBranch={baseBranch}
            commitTimeoutMs={commitTimeoutMs}
            color={color}
            canPickFolder={canPickFolder}
            onLabel={setLabel}
            onRepoPath={setRepoPath}
            onBaseBranch={setBaseBranch}
            onCommitTimeoutMs={setCommitTimeoutMs}
            onColor={setColor}
            onPickFolder={() => void pickFolder()}
            pickDisabled={picking || busy}
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setConfirmOpen(true)}
          disabled={busy}
          aria-label={`Supprimer ${project.label}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => void save()} disabled={busy || !dirty || !valid}>
          Enregistrer
        </Button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Supprimer le projet"
        description={`Supprimer le projet « ${project.label} » ?`}
        confirmLabel="Supprimer"
        destructive
        onConfirm={() => void remove()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

interface AddProjectFormProps {
  canPickFolder: boolean;
  onError: (message: string | null) => void;
  onChanged: () => Promise<void>;
}

function AddProjectForm({ canPickFolder, onError, onChanged }: AddProjectFormProps) {
  const [label, setLabel] = useState("");
  const [repoPath, setRepoPath] = useState("");
  const [baseBranch, setBaseBranch] = useState("");
  const [commitTimeoutMs, setCommitTimeoutMs] = useState(String(DEFAULT_COMMIT_TIMEOUT_MS));
  const [color, setColor] = useState(DEFAULT_PROJECT_COLOR);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);

  const valid = isValidDraft(label, repoPath, baseBranch, commitTimeoutMs);

  const pickFolder = async (): Promise<void> => {
    onError(null);
    setPicking(true);
    try {
      const picked = await api.pickFolder();
      if (picked !== null) setRepoPath(picked);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setPicking(false);
    }
  };

  const reset = (): void => {
    setLabel("");
    setRepoPath("");
    setBaseBranch("");
    setCommitTimeoutMs(String(DEFAULT_COMMIT_TIMEOUT_MS));
    setColor(DEFAULT_PROJECT_COLOR);
  };

  const submit = async (): Promise<void> => {
    onError(null);
    setBusy(true);
    try {
      const input: CreateProjectInput = {
        label: label.trim(),
        repoPath: repoPath.trim(),
        baseBranch: baseBranch.trim(),
        commitTimeoutMs: Number(commitTimeoutMs),
        color,
      };
      await api.createProject(input);
      await onChanged();
      reset();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-dashed p-3">
      <p className="text-sm font-medium text-muted-foreground">Nouveau projet</p>
      <ProjectFields
        label={label}
        repoPath={repoPath}
        baseBranch={baseBranch}
        commitTimeoutMs={commitTimeoutMs}
        color={color}
        canPickFolder={canPickFolder}
        onLabel={setLabel}
        onRepoPath={setRepoPath}
        onBaseBranch={setBaseBranch}
        onCommitTimeoutMs={setCommitTimeoutMs}
        onColor={setColor}
        onPickFolder={() => void pickFolder()}
        pickDisabled={picking || busy}
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={() => void submit()} disabled={busy || !valid}>
          <Plus className="h-4 w-4" />
          Ajouter le projet
        </Button>
      </div>
    </div>
  );
}

interface ProjectFieldsProps {
  label: string;
  repoPath: string;
  baseBranch: string;
  commitTimeoutMs: string;
  color: string;
  canPickFolder: boolean;
  onLabel: (value: string) => void;
  onRepoPath: (value: string) => void;
  onBaseBranch: (value: string) => void;
  onCommitTimeoutMs: (value: string) => void;
  onColor: (value: string) => void;
  onPickFolder: () => void;
  pickDisabled: boolean;
}

function ProjectFields({
  label,
  repoPath,
  baseBranch,
  commitTimeoutMs,
  color,
  canPickFolder,
  onLabel,
  onRepoPath,
  onBaseBranch,
  onCommitTimeoutMs,
  onColor,
  onPickFolder,
  pickDisabled,
}: ProjectFieldsProps) {
  return (
    <div className="flex flex-col gap-2">
      <Field label="Nom">
        <Input value={label} onChange={(e) => onLabel(e.target.value)} placeholder="Nom du projet" />
      </Field>
      <Field label="Chemin">
        <div className="flex w-full items-center gap-2">
          <Input
            value={repoPath}
            onChange={(e) => onRepoPath(e.target.value)}
            placeholder="/chemin/vers/le/dépôt"
          />
          {canPickFolder && (
            <Button variant="outline" onClick={onPickFolder} disabled={pickDisabled} aria-label="Parcourir">
              <FolderOpen className="h-4 w-4" />
              Parcourir
            </Button>
          )}
        </div>
      </Field>
      <Field label="Branche de base">
        <Input value={baseBranch} onChange={(e) => onBaseBranch(e.target.value)} placeholder="main" />
      </Field>
      <Field label="Temps max de commit (ms)">
        <Input
          type="number"
          min={1}
          step={1}
          value={commitTimeoutMs}
          onChange={(e) => onCommitTimeoutMs(e.target.value)}
        />
      </Field>
      <Field label="Couleur">
        <input
          type="color"
          value={color}
          onChange={(e) => onColor(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background"
          aria-label="Couleur"
        />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
