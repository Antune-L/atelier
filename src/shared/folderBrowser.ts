import { z } from "zod";

export const folderListingSchema = z.object({
  path: z.string(),
  parent: z.string().nullable(),
  entries: z.array(z.object({ name: z.string(), path: z.string() })),
});

export type FolderListing = z.infer<typeof folderListingSchema>;
