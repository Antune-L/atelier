import { expect, mock, test } from "bun:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { makeTicket } from "../../../../server/testing/fixtures.ts";

// The real Markdown instantiates DOMPurify on `window`, which does not exist under SSR.
mock.module("@/components/ui/markdown", () => ({
  Markdown: ({ content }: { content: string }) => <div>{content}</div>,
  renderMarkdownToSafeHtml: (content: string) => content,
}));

const { TriageSection } = await import("./TriageSection");

const BATCH_LABEL = "Intégrer toutes les réponses";
const QUESTIONS = ["Quelle couleur ?", "Quelle taille ?", "Quel format ?"];

function render(questions: string[]): string {
  const triageReport = JSON.stringify({
    verdict: "implementable",
    summary: "Résumé",
    reasons: [],
    questions: questions.map((question) => ({ question, recommendedAnswer: null })),
    files: [],
  });
  const ticket = makeTicket({ column: "todo", triageStatus: "done", triageVerdict: "implementable", triageReport, feasibilityReportVersion: 1, feasibilityAnswers: [] });
  return renderToStaticMarkup(<TriageSection
    ticket={ticket}
    onTriage={async () => {}}
    onTriagePlus={async () => {}}
    onApplySuggestion={() => {}}
    onToggleContext={() => {}}
    onFeasibilityEngineChange={() => {}}
    onReformulate={async () => ({ started: true })}
    onAnswerFeasibility={async () => ({ started: true, id: "run" })}
    onAnswerFeasibilityBatch={async () => ({ started: true, ids: [] })}
    onApplyReformulation={async () => {}} />);
}

test("batch integrate button is rendered after the question list", () => {
  const html = render(QUESTIONS);
  const lastQuestion = QUESTIONS[QUESTIONS.length - 1] ?? "";
  expect(html.indexOf(lastQuestion)).toBeGreaterThan(-1);
  expect(html.indexOf(BATCH_LABEL)).toBeGreaterThan(html.lastIndexOf(lastQuestion));
});

test("batch integrate button sits in a sticky bottom bar", () => {
  const html = render(QUESTIONS);
  const before = html.slice(0, html.indexOf(BATCH_LABEL));
  const classes = [...before.matchAll(/<div[^>]*class="([^"]*)"/g)].map((match) => match[1] ?? "");
  const wrapper = classes.findLast((value) => value.includes("sticky"));
  expect(wrapper).toBeDefined();
  expect(wrapper ?? "").toContain("bottom-0");
});

test("batch integrate button is absent with a single question", () => {
  const html = render(["Unique question ?"]);
  expect(html).toContain("Unique question ?");
  expect(html).not.toContain(BATCH_LABEL);
});
