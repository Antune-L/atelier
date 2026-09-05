import { z } from "zod";

export const transcriptUpdateSchema = z.object({
  generation: z.string(),
  version: z.number().int().nonnegative(),
  firstId: z.number().int().nonnegative(),
  reset: z.boolean(),
  truncated: z.boolean(),
  blocks: z.array(z.object({ id: z.number().int().nonnegative(), text: z.string() })),
});

export type TranscriptUpdate = z.infer<typeof transcriptUpdateSchema>;

export interface TranscriptState {
  generation: string;
  version: number;
  blocks: Map<number, string>;
  truncated: boolean;
}

/** Apply a versioned update without allowing a late response to roll back the same generation. */
export function applyTranscriptUpdate(state: TranscriptState | null, update: TranscriptUpdate): TranscriptState {
  if (state?.generation === update.generation && state.version >= update.version) return state;
  const blocks = update.reset || state?.generation !== update.generation ? new Map<number, string>() : new Map(state.blocks);
  for (const id of blocks.keys()) if (id < update.firstId) blocks.delete(id);
  for (const block of update.blocks) blocks.set(block.id, block.text);
  return { generation: update.generation, version: update.version, blocks, truncated: update.truncated };
}

export function transcriptText(state: TranscriptState): string {
  return (state.truncated ? "… Historique ancien tronqué …\n" : "") + [...state.blocks.entries()].sort(([a], [b]) => a - b).map(([, text]) => text).join("");
}
