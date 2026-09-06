import { FileUp, GitBranch, GitPullRequest, MessageCircleQuestion, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

import type { ProjectInfo } from "@shared/schemas";

import { AskPanel } from "@/components/AskPanel";
import { CleanPrPanel } from "@/components/CleanPrPanel";
import { ImportTicketsPanel } from "@/components/ImportTicketsPanel";
import { ReviewPrPanel } from "@/components/ReviewPrPanel";
import { WorktreePanel } from "@/components/WorktreePanel";
import { Dialog, type DialogSize } from "@/components/ui/dialog";

/** The five standalone tools reachable from the header's « Autres outils » menu. */
export type ToolKind = "import" | "review" | "clean" | "ask" | "worktree";

export const TOOL_KINDS: ToolKind[] = ["import", "review", "clean", "ask", "worktree"];

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
    title: "Import CSV",
    Icon: FileUp,
    size: "md",
    Panel: ImportTicketsPanel,
  },
  review: {
    label: "Reviewer une PR",
    title: "PR Review",
    Icon: GitPullRequest,
    size: "lg",
    Panel: ReviewPrPanel,
  },
  clean: {
    label: "Nettoyer une PR",
    title: "PR Cleaner",
    Icon: Sparkles,
    size: "lg",
    Panel: CleanPrPanel,
  },
  ask: {
    label: "Poser une question",
    title: "Poser une question",
    Icon: MessageCircleQuestion,
    size: "md",
    Panel: AskPanel,
  },
  worktree: {
    label: "Worktree",
    title: "Worktree",
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

/** Owns the five tool dialogs; only the open one is mounted, so each panel resets between uses. */
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
