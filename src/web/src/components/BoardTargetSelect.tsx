import type { ReactNode } from "react";

import { VCS_PROVIDER_LABELS } from "@shared/constants";
import type { BoardProject } from "@shared/vpsBridge";

import { Input, Label, Textarea } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import type { TabOption } from "@/components/ui/tabs";
import { FIELD_LABEL_CLASSES } from "@/lib/overlayStyles";

export type BoardTarget = "local" | "other";

const MAC_BOARD_TARGET_OPTIONS: readonly TabOption<BoardTarget>[] = [
  { value: "local", label: "Ce Mac" },
  { value: "other", label: "VPS" },
];

const VPS_BOARD_TARGET_OPTIONS: readonly TabOption<BoardTarget>[] = [
  { value: "local", label: "Ce VPS" },
  { value: "other", label: "Mac" },
];

interface BoardTargetSelectProps {
  cloudHost: boolean;
  value: BoardTarget;
  onChange: (target: BoardTarget) => void;
}

export function BoardTargetSelect({ cloudHost, value, onChange }: BoardTargetSelectProps) {
  return (
    <div className="space-y-1.5">
      <span id="board-target-label" className={FIELD_LABEL_CLASSES}>Board cible</span>
      <Tabs
        aria-labelledby="board-target-label"
        options={cloudHost ? VPS_BOARD_TARGET_OPTIONS : MAC_BOARD_TARGET_OPTIONS}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

export interface OtherBoardFormProps {
  header: ReactNode;
  title: string;
  onTitleChange: (title: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  onDraftSent: () => void;
  onClose: () => void;
}

export function boardProjectOptionLabel(project: BoardProject): string {
  return `${project.label} · ${VCS_PROVIDER_LABELS[project.vcsProvider]} · ${project.baseBranch}`;
}

interface OtherBoardDraftFieldsProps {
  idPrefix: string;
  title: string;
  onTitleChange: (title: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  boardLabel: string;
}

export function OtherBoardDraftFields({ idPrefix, title, onTitleChange, description, onDescriptionChange, boardLabel }: OtherBoardDraftFieldsProps) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-description`} className={FIELD_LABEL_CLASSES}>Quel résultat souhaitez-vous ?</Label>
        <Textarea
          id={`${idPrefix}-description`}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="min-h-48"
          placeholder="Décrivez le résultat attendu, le contexte et les critères de réussite…"
        />
        <p className="text-xs text-muted-foreground">Markdown accepté. Les images collées ne sont pas envoyées au {boardLabel}.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-title`} className={FIELD_LABEL_CLASSES}>Titre (optionnel)</Label>
        <Input id={`${idPrefix}-title`} value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="Titre du ticket (déduit de la description si vide)" />
      </div>
    </>
  );
}
