import type { ReactNode } from "react";
import { type Layout, Group, Panel, Separator } from "react-resizable-panels";

import { TERMINAL_PANEL_MIN_PERCENT } from "@shared/constants";

import { cn } from "@/lib/utils";

import { TerminalCell } from "./TerminalCell";
import type { SplitOrientation, TreeNode } from "./tree";

interface SplitTreeProps {
  node: TreeNode;
  /** Map of layout leaf id → short cell title (e.g. "repo · #2"). */
  titleFor: (terminalId: string) => string;
  focusedLeafId: string | null;
  onFocusLeaf: (leafId: string) => void;
  onCloseLeaf: (leafId: string) => void;
  onSplitLeaf: (leafId: string, orientation: SplitOrientation) => void;
  onResize: (splitId: string, sizes: number[]) => void;
}

/** `row` (side-by-side) → horizontal group; `column` (stacked) → vertical group. */
function groupOrientation(orientation: SplitOrientation): "horizontal" | "vertical" {
  return orientation === "row" ? "horizontal" : "vertical";
}

function panelId(splitId: string, index: 0 | 1): string {
  return `${splitId}::${index}`;
}

/** Convert a panel-flexGrow layout map back to the two child percentages, in child order. */
function layoutToSizes(splitId: string, layout: Layout): number[] {
  const a = layout[panelId(splitId, 0)];
  const b = layout[panelId(splitId, 1)];
  if (a === undefined || b === undefined) return [];
  const total = a + b;
  if (total <= 0) return [];
  return [(a / total) * 100, (b / total) * 100];
}

/**
 * Renders a split tree as nested `react-resizable-panels` groups: each split is a Group of two
 * Panels separated by a draggable Separator; each leaf is a TerminalCell. Panel sizes round-trip
 * through the tree (persisted in localStorage) via `defaultSize` + `onLayoutChanged`.
 */
export function SplitTree(props: SplitTreeProps): ReactNode {
  const { node } = props;

  if (node.kind === "leaf") {
    return (
      <TerminalCell
        terminalId={node.terminalId}
        title={props.titleFor(node.terminalId)}
        focused={props.focusedLeafId === node.id}
        onFocus={() => props.onFocusLeaf(node.id)}
        onClose={() => props.onCloseLeaf(node.id)}
        onSplitVertical={() => props.onSplitLeaf(node.id, "row")}
        onSplitHorizontal={() => props.onSplitLeaf(node.id, "column")}
      />
    );
  }

  const [first, second] = node.children;
  const [firstSize, secondSize] = node.sizes;
  const horizontal = node.orientation === "row";

  return (
    <Group
      orientation={groupOrientation(node.orientation)}
      className="min-h-0 min-w-0 flex-1"
      onLayoutChanged={(layout) => {
        const sizes = layoutToSizes(node.id, layout);
        if (sizes.length === 2) props.onResize(node.id, sizes);
      }}
    >
      <Panel
        id={panelId(node.id, 0)}
        defaultSize={firstSize}
        minSize={TERMINAL_PANEL_MIN_PERCENT}
        className="flex min-h-0 min-w-0"
      >
        <SplitTree {...props} node={first} />
      </Panel>
      <Separator
        className={cn(
          "bg-border transition-colors data-[separator]:hover:bg-primary/50",
          horizontal ? "w-1 cursor-col-resize" : "h-1 cursor-row-resize",
        )}
      />
      <Panel
        id={panelId(node.id, 1)}
        defaultSize={secondSize}
        minSize={TERMINAL_PANEL_MIN_PERCENT}
        className="flex min-h-0 min-w-0"
      >
        <SplitTree {...props} node={second} />
      </Panel>
    </Group>
  );
}
