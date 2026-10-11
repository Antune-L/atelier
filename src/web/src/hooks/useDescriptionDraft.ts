import { z } from "zod";
import { useLocalDraft, useLocalJsonDraft } from "./useLocalDraft";

const descriptionDraftSchema = z.object({
  base: z.string().nullable(),
  text: z.string(),
});
type DescriptionDraft = z.infer<typeof descriptionDraftSchema>;

/** Old drafts have no recorded base, so require reconciliation before saving them. */
export function resolveDescriptionDraft(current: string, draft: DescriptionDraft | null, legacy: string) {
  const saved = draft ?? (legacy !== "" ? { base: null, text: legacy } : null);
  return {
    text: saved?.text ?? current,
    conflict: saved !== null && saved.base !== current && saved.text !== current,
    base: saved?.base ?? (saved === null ? current : null),
  };
}

/** Persist actual edits with their source description; remote updates cannot silently erase them. */
export function useDescriptionDraft(ticketId: string, current: string) {
  const [legacy, , clearLegacy] = useLocalDraft(`description:${ticketId}`);
  const [draft, setDraft, clearDraft] = useLocalJsonDraft(`description-v2:${ticketId}`, descriptionDraftSchema.nullable(), null);
  const state = resolveDescriptionDraft(current, draft, legacy);
  const setText = (text: string): void => setDraft({ base: state.base, text });
  const reset = (): void => { clearLegacy(); clearDraft(); };
  return { ...state, setText, reset };
}
