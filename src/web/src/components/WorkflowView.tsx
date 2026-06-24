import { useMemo } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "reactflow";
import "reactflow/dist/style.css";

import type { Column } from "@shared/constants";
import type { Ticket } from "@shared/schemas";

import { useBoard } from "@/hooks/useBoard";

interface WorkflowViewProps {
  projectFilter: string;
  onOpenTicket: (ticket: Ticket) => void;
}

/** Node background per column, mirroring the board's lane semantics. */
const COLUMN_NODE_COLOR: Partial<Record<Column, string>> = {
  todo: "#64748b",
  implementing: "#3b82f6",
  prd: "#f59e0b",
  to_review: "#a855f7",
  done: "#22c55e",
  merged: "#16a34a",
  reviewed: "#16a34a",
  failed: "#ef4444",
  abandoned: "#ef4444",
};
const DEFAULT_NODE_COLOR = "#64748b";

const NODE_WIDTH = 200;
const X_GAP = 240;
const Y_GAP = 110;
const TITLE_MAX_LENGTH = 32;

function truncate(title: string): string {
  if (title.length <= TITLE_MAX_LENGTH) return title;
  return `${title.slice(0, TITLE_MAX_LENGTH - 1)}…`;
}

/** Depth = length of the dependsOn chain to a root (bounded against cycles). */
function depthOf(ticket: Ticket, byId: Map<string, Ticket>): number {
  const seen = new Set<string>();
  let depth = 0;
  let cursor: Ticket | undefined = ticket;
  while (cursor?.dependsOn) {
    if (seen.has(cursor.id)) break;
    seen.add(cursor.id);
    cursor = byId.get(cursor.dependsOn);
    if (!cursor) break;
    depth += 1;
  }
  return depth;
}

export function WorkflowView({ projectFilter, onOpenTicket }: WorkflowViewProps) {
  const { tickets } = useBoard();

  const { nodes, edges, byId } = useMemo(() => {
    const visible = projectFilter === "all" ? tickets : tickets.filter((t) => t.project === projectFilter);
    const idMap = new Map(visible.map((t) => [t.id, t]));
    const hasChild = new Set<string>();
    for (const t of visible) {
      if (t.dependsOn !== null && idMap.has(t.dependsOn)) hasChild.add(t.dependsOn);
    }
    // Only tickets involved in a dependency (a parent or a child within the visible set).
    const involved = visible.filter(
      (t) => hasChild.has(t.id) || (t.dependsOn !== null && idMap.has(t.dependsOn)),
    );

    const perDepth = new Map<number, number>();
    const builtNodes: Node[] = involved.map((t) => {
      const depth = depthOf(t, idMap);
      const index = perDepth.get(depth) ?? 0;
      perDepth.set(depth, index + 1);
      return {
        id: t.id,
        position: { x: index * X_GAP, y: depth * Y_GAP },
        data: { label: truncate(t.title) },
        style: {
          width: NODE_WIDTH,
          background: COLUMN_NODE_COLOR[t.column] ?? DEFAULT_NODE_COLOR,
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: 12,
        },
      };
    });

    const builtEdges: Edge[] = [];
    for (const t of involved) {
      const dep = t.dependsOn;
      if (dep === null || !idMap.has(dep)) continue;
      builtEdges.push({ id: `${dep}-${t.id}`, source: dep, target: t.id, animated: true });
    }

    return { nodes: builtNodes, edges: builtEdges, byId: idMap };
  }, [tickets, projectFilter]);

  if (edges.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Aucune dépendance entre tickets
      </div>
    );
  }

  const onNodeClick: NodeMouseHandler = (_event, node) => {
    const ticket = byId.get(node.id);
    if (ticket) onOpenTicket(ticket);
  };

  return (
    // min-h floor guards against a collapsed percentage height: ReactFlow needs concrete pixels.
    <div className="h-full min-h-[70vh] w-full">
      <ReactFlow nodes={nodes} edges={edges} onNodeClick={onNodeClick} nodesDraggable={false} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
