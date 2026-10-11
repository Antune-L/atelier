import { expect, test } from "bun:test";
import { resolveDescriptionDraft } from "./useDescriptionDraft";

test("an untouched description follows integrated answers instead of storing a stale copy", () => {
  expect(resolveDescriptionDraft("Original", null, "")).toMatchObject({ text: "Original", conflict: false });
  expect(resolveDescriptionDraft("Original\nAnswer: Blue", null, "")).toMatchObject({ text: "Original\nAnswer: Blue", conflict: false });
});

test("real edits survive while a changed source blocks overwriting an integrated answer", () => {
  const draft = { base: "Original", text: "My unsaved edit" };
  expect(resolveDescriptionDraft("Original", draft, "")).toMatchObject({ text: "My unsaved edit", conflict: false, base: "Original" });
  expect(resolveDescriptionDraft("Original\nAnswer: Blue", draft, "")).toMatchObject({ text: "My unsaved edit", conflict: true, base: "Original" });
});

test("legacy drafts retain their text but cannot overwrite an unknown newer description", () => {
  expect(resolveDescriptionDraft("Original\nAnswer: Blue", null, "Original")).toMatchObject({ text: "Original", conflict: true, base: null });
  expect(resolveDescriptionDraft("Original", null, "Original")).toMatchObject({ text: "Original", conflict: false });
});

test("empty edits are preserved and clearing a draft reloads the latest description", () => {
  expect(resolveDescriptionDraft("Original", { base: "Original", text: "" }, "")).toMatchObject({ text: "", conflict: false });
  expect(resolveDescriptionDraft("Original\nAnswer: Blue", null, "")).toMatchObject({ text: "Original\nAnswer: Blue", conflict: false });
});
