import { z } from "zod";

export const providerVersionSchema = z.string().regex(/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/);
export const providerVersionsSchema = z.object({ claude: providerVersionSchema, codex: providerVersionSchema });
export type ProviderVersions = z.infer<typeof providerVersionsSchema>;
export const appUpdateTargetSchema = z.object({
  id: z.string().max(128),
  version: z.string().max(128),
  providers: providerVersionsSchema,
});
export type AppUpdateTarget = z.infer<typeof appUpdateTargetSchema>;
export const providerUpdatesSchema = z.object({
  simulated: z.boolean(),
  checkedAt: z.number(),
  rows: z.array(z.object({
    provider: z.enum(["claude", "codex"]),
    installed: providerVersionSchema.nullable(),
    nativeVersion: z.string().max(128).nullable(),
    nativeOrigin: z.enum(["package", "bundled", "configured", "provisioned", "user", "unknown", "simulated"]),
    nativeError: z.string().nullable(),
    latest: providerVersionSchema.nullable(),
    latestAt: z.number().nullable(),
    state: z.enum(["ready", "unknown", "offline", "error", "stale", "simulated"]),
    message: z.string().nullable(),
  })),
  host: z.enum(["source", "mac", "vps", "browser"]),
  target: appUpdateTargetSchema.nullable(),
  available: z.boolean(),
  message: z.string().nullable(),
  maintenance: z.boolean(),
});
export type ProviderUpdates = z.infer<typeof providerUpdatesSchema>;

export function lockedProviderVersions(lock: string): ProviderVersions {
  const claude = lock.match(/"@anthropic-ai\/claude-agent-sdk":\s*\["@anthropic-ai\/claude-agent-sdk@([^"\s]+)"/)?.[1];
  const codex = lock.match(/"@openai\/codex-sdk":\s*\["@openai\/codex-sdk@([^"\s]+)"/)?.[1];
  return providerVersionsSchema.parse({ claude, codex });
}
