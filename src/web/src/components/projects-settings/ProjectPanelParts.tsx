import { ChevronRight, FolderOpen } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";

import type { RepoInspectionSource } from "@shared/constants";
import type { RepoInspection } from "@shared/schemas";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";
import { cn } from "@/lib/utils";

const ENTER_KEY = "Enter";
const HINT_TEXT_CLASS = "text-xs font-normal normal-case tracking-normal text-muted-foreground";

export const INSPECTION_SOURCE_LABELS: Record<RepoInspectionSource, string> = {
  packageManifest: "déduit de package.json",
  folderName: "déduit du nom du dossier",
  parentFolder: "dossier parent",
  remoteHead: "branche par défaut du remote",
  currentBranch: "branche courante",
  remoteUrl: "déduit du remote origin",
  lockfile: "déduit du lockfile et des scripts",
  fallback: "valeur par défaut",
};

interface Suggestion<T> {
  value: T;
  source: RepoInspectionSource;
}

export function suggestionHint<T>(suggestion: Suggestion<T> | null | undefined, current: T): string | undefined {
  if (!suggestion || suggestion.value !== current) return undefined;
  return INSPECTION_SOURCE_LABELS[suggestion.source];
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex items-baseline gap-2">
        <Label className={FIELD_LABEL_CLASSES}>{label}</Label>
        {hint && <span className={HINT_TEXT_CLASS}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

interface RepoPathInputProps {
  value: string;
  canPickFolder: boolean;
  disabled: boolean;
  readOnly?: boolean;
  onChange: (value: string) => void;
  onPick: () => void;
  onSubmit?: () => void;
}

export function RepoPathInput({
  value,
  canPickFolder,
  disabled,
  readOnly = false,
  onChange,
  onPick,
  onSubmit,
}: RepoPathInputProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== ENTER_KEY || !onSubmit) return;
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="flex w-full items-center gap-2">
      <Input
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="/chemin/vers/le/dépôt"
        aria-label="Chemin du dépôt"
      />
      {canPickFolder && (
        <Button variant="outline" onClick={onPick} disabled={disabled} aria-label="Parcourir">
          <FolderOpen className="h-4 w-4" />
          Parcourir
        </Button>
      )}
    </div>
  );
}

interface FolderStepProps {
  repoPath: string;
  canPickFolder: boolean;
  inspecting: boolean;
  disabled: boolean;
  onRepoPathChange: (value: string) => void;
  onPick: () => void;
  onAnalyze: () => void;
}

export function FolderStep({
  repoPath,
  canPickFolder,
  inspecting,
  disabled,
  onRepoPathChange,
  onPick,
  onAnalyze,
}: FolderStepProps) {
  const locked = disabled || inspecting;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Choisissez le dossier du dépôt : le nom, la branche, le fournisseur et la commande de démarrage seront
        préremplis.
      </p>
      <Field label="Chemin">
        <div className="flex w-full items-center gap-2">
          <RepoPathInput
            value={repoPath}
            canPickFolder={canPickFolder}
            disabled={locked}
            onChange={onRepoPathChange}
            onPick={onPick}
            onSubmit={onAnalyze}
          />
          <Button variant="outline" onClick={onAnalyze} disabled={locked || repoPath.trim() === ""}>
            Analyser
          </Button>
        </div>
      </Field>
      {inspecting && (
        <p role="status" className="text-xs text-muted-foreground">
          Analyse du dépôt…
        </p>
      )}
    </div>
  );
}

interface InspectionBannersProps {
  inspection: RepoInspection;
  onOpenExisting: (key: string) => void;
}

export function InspectionBanners({ inspection, onOpenExisting }: InspectionBannersProps) {
  const { existingProjectKey } = inspection;
  return (
    <>
      {!inspection.isGitRepo && (
        <p role="alert" className="text-sm text-destructive">
          Ce dossier n'est pas un dépôt git. Initialisez-le avec <code>git init</code> et ajoutez un remote origin.
        </p>
      )}
      {existingProjectKey !== null && (
        <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-warning">
          Ce dossier est déjà enregistré.
          <Button variant="outline" size="sm" onClick={() => onOpenExisting(existingProjectKey)}>
            Ouvrir le projet existant
          </Button>
        </div>
      )}
    </>
  );
}

interface AdvancedSectionProps {
  open: boolean;
  summary: ReactNode;
  onToggle: () => void;
  children: ReactNode;
}

export function AdvancedSection({ open, summary, onToggle, children }: AdvancedSectionProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex items-center gap-1 text-sm font-medium hover:text-foreground"
        >
          <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
          Avancé
        </button>
        {!open && <span className="flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">{summary}</span>}
      </div>
      {open && children}
    </div>
  );
}
