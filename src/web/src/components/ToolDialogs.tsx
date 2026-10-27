import { FileUp, GitBranch, GitPullRequest, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

import type { ProjectInfo } from "@shared/schemas";

import { CleanPrPanel } from "@/components/CleanPrPanel";
import { ImportTicketsPanel } from "@/components/ImportTicketsPanel";
import { ReviewPrPanel } from "@/components/ReviewPrPanel";
import { WorktreePanel } from "@/components/WorktreePanel";
import { Dialog, type DialogSize } from "@/components/ui/dialog";

/** The four standalone tools reachable from the header's « Autres outils » menu. */
export type ToolKind = "import" | "review" | "clean" | "worktree";

export const TOOL_KINDS: ToolKind[] = ["import", "review", "clean", "worktree"];

interface ToolMeta {
  /** Menu entry wording. */
  label: string;
  /** Dialog header wording. */
  title: string;
  Icon: LucideIcon;
  size: DialogSize;
  Panel: ComponentType<{ projects: ProjectInfo[]; onClose: () => void }>;
}

export const TOOLS: Record<ToolKind, ToolMeta> = {
  import: {
    label: "Importer un CSV",
    title: "Importer un CSV",
    Icon: FileUp,
    size: "lg",
    Panel: ImportTicketsPanel,
  },
  review: {
    label: "Relire une PR",
    title: "Relire une pull request",
    Icon: GitPullRequest,
    size: "lg",
    Panel: ReviewPrPanel,
  },
  clean: {
    label: "Corriger les retours d’une PR",
    title: "Corriger les retours d’une PR",
    Icon: Sparkles,
    size: "lg",
    Panel: CleanPrPanel,
  },
  worktree: {
    label: "Créer un espace de travail",
    title: "Créer un espace de travail",
    Icon: GitBranch,
    size: "md",
    Panel: WorktreePanel,
  },
};

interface ToolDialogsProps {
  /** The tool currently open, or null when none is. */
  openTool: ToolKind | null;
  projects: ProjectInfo[];
  onClose: () => void;
}

/** Owns the four tool dialogs; only the open one is mounted, so each panel resets between uses. */
export function ToolDialogs({ openTool, projects, onClose }: ToolDialogsProps) {
  const handleOpenChange = (next: boolean): void => {
    if (!next) onClose();
  };

  return (
    <>
      {TOOL_KINDS.map((kind) => {
        const { title, size, Panel } = TOOLS[kind];
        return (
          <Dialog
            key={kind}
            open={openTool === kind}
            onOpenChange={handleOpenChange}
            size={size}
            title={title}
          >
            <Panel projects={projects} onClose={onClose} />
          </Dialog>
        );
      })}
    </>
  );
}
