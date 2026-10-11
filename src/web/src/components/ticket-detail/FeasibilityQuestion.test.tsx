import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { makeTicket } from "../../../../server/testing/fixtures.ts";
import type { FeasibilityAnswerRun } from "@shared/schemas";
import { FeasibilityQuestion } from "./FeasibilityQuestion";

const baseRun: FeasibilityAnswerRun = {
  id: "run", question: "Colour?", questionIndex: 0, answer: "Blue", revision: 0, reportVersion: 1, status: "failed", error: "Provider error",
};

function render(run?: FeasibilityAnswerRun): string {
  return renderToStaticMarkup(<FeasibilityQuestion
    ticket={makeTicket({ column: "todo", feasibilityReportVersion: 1, feasibilityAnswers: run ? [run] : [] })}
    question="Colour?" index={0} onSubmit={async () => ({ started: true, id: "next" })} />);
}

test("question input has a label, bounded textarea and submit action", () => {
  const html = render();
  expect(html).toContain("Colour?");
  expect(html).toMatch(/<label[^>]+for="([^"]+)"/);
  const inputId = html.match(/<label[^>]+for="([^"]+)"/)?.[1];
  expect(html).toContain(`id="${inputId}"`);
  expect(html).toContain('maxLength="10000"');
  expect(html).toContain('type="submit"');
  expect(html).toContain("Intégrer la réponse");
  expect(html).toContain('aria-describedby=');
});

test("pending, success and failure states are accessible and keep the persisted answer", () => {
  const pending = render({ ...baseRun, status: "running", error: null });
  expect(pending).toContain('aria-busy="true"');
  expect(pending).toContain("Intégration en cours");
  expect(pending).toContain("Blue</textarea>");
  const done = render({ ...baseRun, status: "done", error: null });
  expect(done).toContain("Réponse intégrée dans la description.");
  expect(done).toContain('disabled=""');
  const failed = render(baseRun);
  expect(failed).toContain('role="alert"');
  expect(failed).toContain("Provider error");
  expect(failed).toContain("Réessayer");
  expect(failed).toContain("Blue</textarea>");
});
