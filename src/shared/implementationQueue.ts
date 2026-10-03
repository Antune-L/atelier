import { z } from "zod";

import { LOT_LABEL_MAX_LENGTH } from "./constants.ts";

export const implementationQueueLotSchema = z.object({
  label: z.string().trim().min(1).max(LOT_LABEL_MAX_LENGTH),
  plan: z.string().min(1),
  files: z.array(z.string().min(1)),
  slotId: z.number().int().nonnegative(),
  started: z.boolean().default(false),
  executionRunId: z.string().min(1).nullable().default(null),
});
export type ImplementationQueueLot = z.infer<typeof implementationQueueLotSchema>;

export const implementationQueueSchema = z.array(implementationQueueLotSchema);
