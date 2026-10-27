import { expect, mock, test } from "bun:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Ticket } from "@shared/schemas";
import { makeTicket } from "../../../../server/testing/fixtures.ts";

// The real Markdown instantiates DOMPurify on `window`, which does not exist under SSR.
mock.module("@/components/ui/markdown", () => ({
  Markdown: ({ content }: { content: string }) => <div>{content}</div>,
  renderMarkdownToSafeHtml: (content: string) => content,
}));

const { ActivityTab, appendQuote } = await import("./ActivityTab");

const COMPOSER_LABEL = "Ajouter un commentaire";
const TODO_HELP = "Votre commentaire sera pris en compte à la prochaine analyse.";

function render(column: Ticket["column"]): string {
  return renderToStaticMarkup(<ActivityTab
    ticket={makeTicket({ column })}
    comments={[]}
    onAnswer={async () => {}}
    onComment={async () => {}}
    draft=""
    setDraft={() => {}}
    clearDraft={() => {}} />);
}

test("todo card shows the comment composer and its help text", () => {
  const html = render("todo");
  expect(html).toContain(`aria-label="${COMPOSER_LABEL}"`);
  expect(html).toContain(TODO_HELP);
});

test("done and merged cards have no comment composer", () => {
  const columns: Ticket["column"][] = ["done", "merged"];
  for (const column of columns) {
    expect(render(column)).not.toContain(COMPOSER_LABEL);
  }
});

test("appendQuote quotes into an empty draft", () => {
  expect(appendQuote("", "Q")).toBe("> Q\n\n");
});

test("appendQuote keeps the existing draft before the quote", () => {
  expect(appendQuote("abc", "Q")).toBe("abc\n> Q\n\n");
});

test("appendQuote prefixes every line of a multi-line question", () => {
  expect(appendQuote("", "L1\nL2")).toBe("> L1\n> L2\n\n");
});
