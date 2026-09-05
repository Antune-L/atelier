/** Read-only Codex auth and model-catalog probe. It never starts a model turn. */

import { z } from "zod";

import {
  codexRuntimeModelSchema,
  codexRuntimeStatusSchema,
  type CodexRuntimeModel,
  type CodexRuntimeStatus,
} from "../../shared/codexCapabilities.ts";
import { CODEX_EFFORTS, CODEX_MODELS } from "../../shared/constants.ts";

import {
  CodexAppServerInitializationError,
  CodexAppServerProtocolError,
  CodexAppServerRpcError,
  connectCodexAppServer,
} from "./codexAppServer.ts";
import type { CodexAppServerConnection, CodexAppServerOptions } from "./codexAppServer.ts";
import { CodexBinaryVersionError, CODEX_SDK_VERSION, resolveCodexBinary } from "./codexBinary.ts";

const accountResponseSchema = z.object({
  account: z.unknown().nullable(),
  requiresOpenaiAuth: z.boolean(),
});
const modelSchema = z.object({
  id: z.string(),
  model: z.string(),
  hidden: z.boolean(),
  defaultReasoningEffort: z.string(),
  supportedReasoningEfforts: z.array(z.object({ reasoningEffort: z.string() })),
  serviceTiers: z.array(z.object({ id: z.string(), name: z.string(), description: z.string() })),
  defaultServiceTier: z.string().nullable(),
});
const modelListResponseSchema = z.object({
  data: z.array(modelSchema),
  nextCursor: z.string().nullable(),
});

interface CodexRuntimeDependencies {
  connect?(options: CodexAppServerOptions): Promise<CodexAppServerConnection>;
  resolveBinary?(): string;
  environment?: Record<string, string | undefined>;
}

export function hasExplicitCodexApiKey(environment: Record<string, string | undefined>): boolean {
  return Boolean(environment.CODEX_API_KEY);
}

function status(
  state: CodexRuntimeStatus["status"],
  models: CodexRuntimeModel[],
  message: string | null,
): CodexRuntimeStatus {
  return codexRuntimeStatusSchema.parse({ status: state, models, checkedAt: Date.now(), message });
}

function isProtocolIncompatibility(error: unknown): boolean {
  if (
    error instanceof z.ZodError ||
    error instanceof CodexAppServerProtocolError ||
    error instanceof CodexBinaryVersionError
  ) return true;
  if (error instanceof CodexAppServerRpcError) return error.code === -32601;
  if (error instanceof CodexAppServerInitializationError) return isProtocolIncompatibility(error.reason);
  return false;
}

export function toCodexRuntimeModels(rawModels: z.infer<typeof modelSchema>[]): CodexRuntimeModel[] {
  const models: CodexRuntimeModel[] = [];
  for (const raw of rawModels) {
    const model = CODEX_MODELS.find((candidate) => candidate === raw.model);
    if (raw.hidden || !model) continue;
    const efforts = raw.supportedReasoningEfforts
      .map((entry) => CODEX_EFFORTS.find((effort) => effort === entry.reasoningEffort))
      .filter((effort) => effort !== undefined);
    const defaultEffort = CODEX_EFFORTS.find((effort) => effort === raw.defaultReasoningEffort);
    if (!defaultEffort || !efforts.includes(defaultEffort)) continue;
    const parsed = codexRuntimeModelSchema.safeParse({
      model,
      efforts,
      defaultEffort,
      serviceTiers: raw.serviceTiers,
      defaultServiceTier: raw.defaultServiceTier,
    });
    if (parsed.success) models.push(parsed.data);
  }
  return models;
}

async function listRuntimeModels(connection: CodexAppServerConnection): Promise<CodexRuntimeModel[]> {
  const rawModels: z.infer<typeof modelSchema>[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | null = null;
  do {
    const catalog: z.infer<typeof modelListResponseSchema> = await connection.request(
      "model/list",
      { cursor, limit: 100, includeHidden: false },
      modelListResponseSchema,
    );
    rawModels.push(...catalog.data);
    cursor = catalog.nextCursor;
    if (cursor && seenCursors.has(cursor)) throw new Error("Pagination cyclique du catalogue Codex");
    if (cursor) seenCursors.add(cursor);
  } while (cursor);
  return toCodexRuntimeModels(rawModels);
}

/** Refresh auth and list visible models through App Server without consuming a model turn. */
export async function probeCodexRuntime(
  dependencies: CodexRuntimeDependencies = {},
): Promise<CodexRuntimeStatus> {
  const environment = dependencies.environment ?? process.env;
  let binaryPath: string;
  try {
    binaryPath = (dependencies.resolveBinary ?? resolveCodexBinary)();
  } catch (error) {
    return status("unavailable", [], error instanceof Error ? error.message : String(error));
  }

  let lastStderr = "";
  let connection: Awaited<ReturnType<typeof connectCodexAppServer>> | null = null;
  try {
    connection = await (dependencies.connect ?? connectCodexAppServer)({
      binaryPath,
      env: environment,
      onStderr: (line) => {
        lastStderr = line;
      },
    });
    if (!hasExplicitCodexApiKey(environment)) {
      const account = await connection.request("account/read", { refreshToken: true }, accountResponseSchema);
      if (account.requiresOpenaiAuth && account.account === null) {
        return status("unauthenticated", [], "Connexion Codex requise");
      }
    }
    const models = await listRuntimeModels(connection);
    if (models.length === 0) {
      return status("model_unavailable", [], "Aucun modèle GPT pris en charge dans le catalogue Codex de ce compte");
    }
    return status("ready", models, null);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const message = lastStderr ? `${detail} — ${lastStderr}` : detail;
    if (isProtocolIncompatibility(error)) {
      return status(
        "unavailable",
        [],
        `Runtime Codex incompatible avec le protocole App Server ${CODEX_SDK_VERSION} : ${message}`,
      );
    }
    return status("temporarily_unavailable", [], message);
  } finally {
    await connection?.close();
  }
}
