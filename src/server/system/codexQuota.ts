/** Read-only Codex subscription quota read through App Server. It never starts a model turn. */

import { z } from "zod";

import { normalizeEpochMs, providerQuotaSchema, QUOTA_READ_TIMEOUT_MS } from "../../shared/providerQuota.ts";
import type { ProviderQuota, ProviderQuotaState, QuotaWindow } from "../../shared/providerQuota.ts";

import { CodexAppServerInitializationError, CodexAppServerRpcError, connectCodexAppServer } from "./codexAppServer.ts";
import type { CodexAppServerConnection, CodexAppServerOptions } from "./codexAppServer.ts";
import { CODEX_SDK_VERSION, resolveCodexBinary } from "./codexBinary.ts";
import { hasExplicitCodexApiKey } from "./codexRuntime.ts";

/** Only the type and plan are kept: email and account ids are stripped by the schema. */
const accountResponseSchema = z.object({
  account: z.object({ type: z.string(), planType: z.string().nullish() }).nullable(),
  requiresOpenaiAuth: z.boolean(),
});

const rateLimitWindowSchema = z.object({
  usedPercent: z.number(),
  windowDurationMins: z.number().nullish(),
  resetsAt: z.number().nullish(),
});

const rateLimitSnapshotSchema = z.object({
  limitId: z.string().nullish(),
  limitName: z.string().nullish(),
  normalModelSlug: z.string().nullish(),
  primary: rateLimitWindowSchema.nullish(),
  secondary: rateLimitWindowSchema.nullish(),
  individualLimit: z.unknown().optional(),
  planType: z.string().nullish(),
});
type RateLimitSnapshot = z.infer<typeof rateLimitSnapshotSchema>;
type RateLimitWindow = z.infer<typeof rateLimitWindowSchema>;

const rateLimitsResponseSchema = z.object({
  rateLimits: rateLimitSnapshotSchema,
  rateLimitsByLimitId: z.record(z.string(), rateLimitSnapshotSchema).nullish(),
});

export interface CodexQuotaDependencies {
  connect?(options: CodexAppServerOptions): Promise<CodexAppServerConnection>;
  resolveBinary?(): string;
  environment?: Record<string, string | undefined>;
  now?: () => number;
}

const SESSION_MAX_MINS = 1440;

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function toWindow(
  id: string,
  kind: QuotaWindow["kind"],
  model: string | null,
  raw: RateLimitWindow,
): QuotaWindow {
  const duration = raw.windowDurationMins ?? null;
  return {
    id,
    kind,
    model,
    usedPercent: clampPercent(raw.usedPercent),
    windowDurationMins: duration !== null && duration > 0 ? duration : null,
    resetsAt: raw.resetsAt === null || raw.resetsAt === undefined ? null : Math.round(normalizeEpochMs(raw.resetsAt)),
  };
}

function kindOf(raw: RateLimitWindow, fallback: "session" | "weekly"): "session" | "weekly" {
  const duration = raw.windowDurationMins;
  if (duration === null || duration === undefined) return fallback;
  return duration <= SESSION_MAX_MINS ? "session" : "weekly";
}

/** Map a rate-limit snapshot to quota windows (exported for tests). */
export function codexQuotaWindows(response: z.infer<typeof rateLimitsResponseSchema>): QuotaWindow[] {
  const main = response.rateLimits;
  const windows: QuotaWindow[] = [];
  if (main.primary) windows.push(toWindow("codex:primary", kindOf(main.primary, "session"), null, main.primary));
  if (main.secondary) windows.push(toWindow("codex:secondary", kindOf(main.secondary, "weekly"), null, main.secondary));
  if (!main.primary && !main.secondary) {
    const credit = rateLimitWindowSchema.safeParse(main.individualLimit);
    if (credit.success) windows.push(toWindow("codex:credit", "credit", null, credit.data));
  }
  const seenModels = new Set<string>();
  for (const [limitId, snapshot] of Object.entries(response.rateLimitsByLimitId ?? {})) {
    if (limitId === main.limitId || (snapshot.limitId && snapshot.limitId === main.limitId)) continue;
    const model = snapshot.limitName ?? snapshot.normalModelSlug ?? limitId;
    if (seenModels.has(model)) continue;
    const raw = pickModelWindow(snapshot);
    if (!raw) continue;
    seenModels.add(model);
    windows.push(toWindow(`codex:model:${limitId}`, "weekly_model", model, raw));
  }
  return windows;
}

function pickModelWindow(snapshot: RateLimitSnapshot): RateLimitWindow | null {
  return snapshot.secondary ?? snapshot.primary ?? null;
}

function quota(
  state: ProviderQuotaState,
  observedAt: number,
  fields: { planType?: string | null; windows?: QuotaWindow[]; message?: string | null } = {},
): ProviderQuota {
  return providerQuotaSchema.parse({
    provider: "codex",
    state,
    source: state === "ok" ? "live" : null,
    observedAt,
    planType: fields.planType ?? null,
    windows: fields.windows ?? [],
    message: fields.message ?? null,
  });
}

function isMethodUnavailable(error: unknown): boolean {
  if (error instanceof CodexAppServerRpcError) return error.code === -32601;
  if (error instanceof CodexAppServerInitializationError) return isMethodUnavailable(error.reason);
  return false;
}

/** Read the ChatGPT-account quota windows of Codex; never throws. */
export async function readCodexQuota(dependencies: CodexQuotaDependencies = {}): Promise<ProviderQuota> {
  const environment = dependencies.environment ?? process.env;
  const now = dependencies.now ?? Date.now;
  let binaryPath: string;
  try {
    binaryPath = (dependencies.resolveBinary ?? resolveCodexBinary)();
  } catch (error) {
    return quota("error", now(), { message: error instanceof Error ? error.message : String(error) });
  }
  if (hasExplicitCodexApiKey(environment)) {
    return quota("not_applicable", now(), { message: "Clé API Codex : pas de quota d'abonnement" });
  }

  let connection: CodexAppServerConnection | null = null;
  try {
    // Each request ends by the service deadline so a timed-out read never leaves App Server running.
    connection = await (dependencies.connect ?? connectCodexAppServer)({ binaryPath, env: environment, requestTimeoutMs: QUOTA_READ_TIMEOUT_MS });
    const account = await connection.request("account/read", { refreshToken: false }, accountResponseSchema);
    if (account.account === null) {
      if (account.requiresOpenaiAuth) return quota("unauthenticated", now(), { message: "Connexion Codex requise" });
      return quota("not_applicable", now(), { message: "Aucun compte ChatGPT : pas de quota d'abonnement" });
    }
    if (account.account.type !== "chatgpt") {
      return quota("not_applicable", now(), { planType: account.account.planType ?? null, message: "Compte Codex sans quota d'abonnement" });
    }
    const response = await connection.request("account/rateLimits/read", undefined, rateLimitsResponseSchema);
    const windows = codexQuotaWindows(response);
    const planType = response.rateLimits.planType ?? account.account.planType ?? null;
    if (windows.length === 0) return quota("no_data", now(), { planType, message: "Aucune donnée de quota reçue" });
    return quota("ok", now(), { planType, windows });
  } catch (error) {
    if (isMethodUnavailable(error)) {
      return quota("error", now(), { message: `Lecture des quotas indisponible dans Codex ${CODEX_SDK_VERSION}` });
    }
    const detail = error instanceof z.ZodError ? "Réponse de quota Codex invalide" : error instanceof Error ? error.message : String(error);
    return quota("error", now(), { message: detail });
  } finally {
    await connection?.close().catch(() => undefined);
  }
}
