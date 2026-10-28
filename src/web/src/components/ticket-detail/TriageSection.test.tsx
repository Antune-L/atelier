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

const { ReplyToQuestionButton, TriageSection } = await import("./TriageSection");

const BATCH_LABEL = "Intégrer toutes les réponses";
const QUESTIONS = ["Quelle couleur ?", "Quelle taille ?", "Quel format ?"];

function render(questions: string[], options: { column?: Ticket["column"]; onReplyToQuestion?: (question: string) => void; files?: string[] } = {}): string {
  const triageReport = JSON.stringify({
    verdict: "implementable",
    summary: "Résumé",
    reasons: [],
    questions: questions.map((question) => ({ question, recommendedAnswer: null })),
    files: options.files ?? [],
  });
  const ticket = makeTicket({ column: options.column ?? "todo",triageStatus: "done", triageVerdict: "implementable", triageReport, feasibilityReportVersion: 1, feasibilityAnswers: [] });
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
    onApplyReformulation={async () => {}}
    onReplyToQuestion={options.onReplyToQuestion} />);
}

const REPLY_LABEL = "Répondre";

test("reply button is shown per question on a todo card with the handler", () => {
  const html = render(QUESTIONS, { onReplyToQuestion: () => {} });
  expect(html.split(REPLY_LABEL).length - 1).toBe(QUESTIONS.length);
});

test("reply button is absent without the handler or outside todo", () => {
  expect(render(QUESTIONS)).not.toContain(REPLY_LABEL);
  expect(render(QUESTIONS, { column: "done", onReplyToQuestion: () => {} })).not.toContain(REPLY_LABEL);
});

test("clicking « Répondre » passes the question text to the handler", () => {
  const onReply = mock((_question: string) => {});
  const button = ReplyToQuestionButton({ question: "Quelle couleur ?", onReply });
  const onClick: unknown = button.props.onClick;
  expect(typeof onClick).toBe("function");
  if (typeof onClick === "function") onClick();
  expect(onReply).toHaveBeenCalledWith("Quelle couleur ?");
});

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

test("relevant files are collapsed in a closed details by default", () => {
  const html = render([], { files: ["a.ts", "b.ts"] });
  const details = /<details[^>]*>(?:(?!<\/details>).)*Fichiers concernés \(2\)(?:(?!<\/details>).)*<\/details>/s.exec(html)?.[0] ?? "";
  expect(details).toContain("<summary");
  expect(details).not.toMatch(/^<details[^>]*\sopen/);
  expect(details).toContain("a.ts");
  expect(details).toContain("b.ts");
  expect(render([])).not.toContain("Fichiers concernés");
});
