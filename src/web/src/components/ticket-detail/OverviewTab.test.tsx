import { expect, mock, test } from "bun:test";
import { Children, isValidElement } from "react";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { makeTicket } from "../../../../server/testing/fixtures.ts";

// The real Markdown instantiates DOMPurify on `window`, which does not exist under SSR.
mock.module("@/components/ui/markdown", () => ({
  Markdown: ({ content }: { content: string }) => <div>{content}</div>,
  renderMarkdownToSafeHtml: (content: string) => content,
}));
// The real store opens a WebSocket at module load.
mock.module("@/lib/store", () => ({
  boardStore: { subscribe: () => () => undefined, getSnapshot: () => ({ tickets: [] }) },
}));
const { OverviewTab } = await import("./OverviewTab");

const BASE = makeTicket({
  id: "pr-ticket",
  kind: "feature",
  column: "merged",
  prUrl: "https://github.com/o/r/pull/1",
  agentSummary: "Résumé",
});
const VARIANTS = [BASE, { ...BASE, error: "Échec", agentSummary: "Autre résumé" }];

function childKeys(node: ReactNode): string[] {
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return Children.toArray(node.props.children).flatMap((child) => isValidElement(child) && child.key !== null ? [child.key] : []);
}

test("a merged feature ticket with a PR renders the brief once", () => {
  for (const ticket of VARIANTS) {
    const html = renderToStaticMarkup(<OverviewTab ticket={ticket} projects={[]} locked={false} onNavigate={() => undefined} />);
    expect(html.split("Demande initiale").length - 1).toBe(1);
  }
});

test("overview sections use distinct sibling keys", () => {
  for (const ticket of VARIANTS) {
    let keys: string[] = [];
    // Invoke OverviewTab inside a component render so its hooks run, then inspect its root children.
    const Probe = () => {
      const tree = OverviewTab({ ticket, projects: [], locked: false, onNavigate: () => undefined });
      keys = childKeys(tree);
      return tree;
    };
    renderToStaticMarkup(<Probe />);
    expect(keys.length).toBeGreaterThan(1);
    expect(new Set(keys).size).toBe(keys.length);
  }
});
