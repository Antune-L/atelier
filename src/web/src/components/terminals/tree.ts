/**
 * Binary split-tree model for the Terminals (CMUX) view. Each leaf is a terminal cell backed by a
 * server-side tmux session (addressed by `terminalId`); each internal node splits its area into two
 * resizable children along an orientation. Trees are persisted per project in localStorage.
 */

import { z } from "zod";

/** `row` = side-by-side (vertical split bar); `column` = stacked (horizontal split bar). */
export type SplitOrientation = "row" | "column";

export interface LeafNode {
  kind: "leaf";
  /** Stable layout id (distinct from the server terminalId so a leaf survives a session swap). */
  id: string;
  /** Opaque server terminal id resolved to a tmux session by the WS stream. */
  terminalId: string;
}

export interface SplitNode {
  kind: "split";
  id: string;
  orientation: SplitOrientation;
  children: [TreeNode, TreeNode];
  /** Panel sizes in percent, parallel to `children`; summing to 100. */
  sizes: [number, number];
}

export type TreeNode = LeafNode | SplitNode;

const EVEN_SPLIT = 50;

let idCounter = 0;

/** Monotonic layout-node id, unique within a session (not persisted across reloads). */
export function nextNodeId(): string {
  idCounter += 1;
  return `n${idCounter}-${Date.now().toString(36)}`;
}

export function makeLeaf(terminalId: string): LeafNode {
  return { kind: "leaf", id: nextNodeId(), terminalId };
}

/** Collect every leaf's terminalId in left-to-right order. */
export function collectTerminalIds(node: TreeNode | null): string[] {
  if (!node) return [];
  if (node.kind === "leaf") return [node.terminalId];
  return [...collectTerminalIds(node.children[0]), ...collectTerminalIds(node.children[1])];
}

/** Replace the leaf with `leafId` by a split of [original leaf, newLeaf] along `orientation`. */
export function splitLeaf(
  node: TreeNode,
  leafId: string,
  orientation: SplitOrientation,
  newLeaf: LeafNode,
): TreeNode {
  if (node.kind === "leaf") {
    if (node.id !== leafId) return node;
    return {
      kind: "split",
      id: nextNodeId(),
      orientation,
      children: [node, newLeaf],
      sizes: [EVEN_SPLIT, EVEN_SPLIT],
    };
  }
  return {
    ...node,
    children: [
      splitLeaf(node.children[0], leafId, orientation, newLeaf),
      splitLeaf(node.children[1], leafId, orientation, newLeaf),
    ],
  };
}

/** Remove the leaf with `leafId`; a split with one child left collapses onto that sibling. */
export function removeLeaf(node: TreeNode, leafId: string): TreeNode | null {
  if (node.kind === "leaf") return node.id === leafId ? null : node;
  const left = removeLeaf(node.children[0], leafId);
  const right = removeLeaf(node.children[1], leafId);
  if (left === null) return right;
  if (right === null) return left;
  return { ...node, children: [left, right] };
}

/** Remove every leaf whose terminalId is not in `liveIds` (sessions lost after a backend restart). */
export function pruneToLive(node: TreeNode | null, liveIds: Set<string>): TreeNode | null {
  if (!node) return null;
  if (node.kind === "leaf") return liveIds.has(node.terminalId) ? node : null;
  const left = pruneToLive(node.children[0], liveIds);
  const right = pruneToLive(node.children[1], liveIds);
  if (left === null) return right;
  if (right === null) return left;
  return { ...node, children: [left, right] };
}

/** Apply new panel sizes to the split node with `splitId` (from a resize handle drag). */
export function applySizes(node: TreeNode, splitId: string, sizes: number[]): TreeNode {
  if (node.kind === "leaf") return node;
  if (node.id === splitId && sizes.length === 2) {
    const [a, b] = sizes;
    if (a !== undefined && b !== undefined) return { ...node, sizes: [a, b] };
  }
  return {
    ...node,
    children: [applySizes(node.children[0], splitId, sizes), applySizes(node.children[1], splitId, sizes)],
  };
}

/** First leaf id in the tree (used to pick a default focus after structural changes). */
export function firstLeafId(node: TreeNode | null): string | null {
  if (!node) return null;
  if (node.kind === "leaf") return node.id;
  return firstLeafId(node.children[0]) ?? firstLeafId(node.children[1]);
}

const leafNodeSchema = z.object({
  kind: z.literal("leaf"),
  id: z.string(),
  terminalId: z.string(),
});

/** Recursive schema validating a persisted (localStorage) split tree before it is trusted. */
export const treeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
  z.union([
    leafNodeSchema,
    z.object({
      kind: z.literal("split"),
      id: z.string(),
      orientation: z.enum(["row", "column"]),
      children: z.tuple([treeNodeSchema, treeNodeSchema]),
      sizes: z.tuple([z.number(), z.number()]),
    }),
  ]),
);

/** Parse a persisted tree, returning null on any malformed/legacy payload. */
export function parseTree(raw: unknown): TreeNode | null {
  const parsed = treeNodeSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Find the leaf with `leafId`, or null. */
export function findLeaf(node: TreeNode | null, leafId: string): LeafNode | null {
  if (!node) return null;
  if (node.kind === "leaf") return node.id === leafId ? node : null;
  return findLeaf(node.children[0], leafId) ?? findLeaf(node.children[1], leafId);
}
