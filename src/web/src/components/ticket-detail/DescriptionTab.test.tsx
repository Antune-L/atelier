import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { makeTicket } from "../../../../server/testing/fixtures.ts";
import { DescriptionTab } from "./DescriptionTab";

function renderDescription(drafts: Map<string, string>): string {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: { getItem: (key: string) => drafts.get(key) ?? null } },
  });
  try {
    return renderToStaticMarkup(<DescriptionTab
      ticket={makeTicket({ id: "answer-ticket", description: "Original\nAnswer: Blue" })}
      onSave={async () => undefined} />);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
}

test("reopening an untouched description displays the integrated answer", () => {
  const html = renderDescription(new Map());
  expect(html).toContain("Original\nAnswer: Blue</textarea>");
  expect(html).not.toContain('role="alert"');
});

test("legacy and conflicting drafts cannot be saved over integrated answers", () => {
  for (const drafts of [
    new Map([["draft:description:answer-ticket", "Original"]]),
    new Map([["draft:description-v2:answer-ticket", JSON.stringify({ base: "Original", text: "My edit" })]]),
  ]) {
    const html = renderDescription(drafts);
    expect(html).toContain('role="alert"');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Enregistrer<\/button>/);
    expect(html).toContain("Annuler");
  }
});
