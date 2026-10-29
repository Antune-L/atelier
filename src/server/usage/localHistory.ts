import { z } from "zod";

import type { Orchestrator } from "../../shared/constants.ts";
import type { HistoryUsageEntry } from "../../shared/providerUsage.ts";

/**
 * Reads token usage from the local Claude and Codex histories of this machine. Only usage fields are
 * parsed; conversation content is never kept nor logged.
 */

export type LocalUsageEntry = HistoryUsageEntry;

export interface LocalHistoryFs {
  /** Every file path under `root`, recursively; empty when the root is missing. */
  listFiles(root: string): Promise<string[]>;
  stat(path: string): Promise<{ size: number; mtimeMs: number }>;
  readText(path: string): Promise<string>;
}

export interface LocalHistoryRoots {
  /** `${CLAUDE_CONFIG_DIR}/projects`. */
  claudeProjects: string;
  /** `${CODEX_HOME}/sessions`. */
  codexSessions: string;
}

const count = z.number().nonnegative().catch(0);

const claudeLineSchema = z.object({
  type: z.literal("assistant"),
  sessionId: z.string().min(1),
  timestamp: z.string(),
  requestId: z.string().optional(),
  message: z.object({
    id: z.string().optional(),
    model: z.string().min(1),
    usage: z.object({
      input_tokens: count.optional(),
      output_tokens: count.optional(),
      cache_read_input_tokens: count.optional(),
      cache_creation_input_tokens: count.optional(),
      speed: z.string().optional(),
    }),
  }),
});

function parseTimestamp(value: string): number | null {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function parseJson(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function linesOf(text: string): unknown[] {
  return text.split("\n").filter((line) => line.trim() !== "").map(parseJson);
}

/** Claude assistant lines with usage; `dedupKey` lets the merge drop calls repeated across files. */
export function parseClaudeHistory(text: string): LocalUsageEntry[] {
  const entries: LocalUsageEntry[] = [];
  for (const raw of linesOf(text)) {
    const parsed = claudeLineSchema.safeParse(raw);
    if (!parsed.success) continue;
    const line = parsed.data;
    if (line.message.model === "<synthetic>") continue;
    const timestamp = parseTimestamp(line.timestamp);
    if (timestamp === null) continue;
    const usage = line.message.usage;
    const speed = usage.speed ?? "standard";
    entries.push({
      provider: "claude",
      sessionId: line.sessionId,
      timestamp,
      model: line.message.model,
      speed,
      fast: speed !== "standard",
      tokens: {
        input: usage.input_tokens ?? 0,
        output: usage.output_tokens ?? 0,
        cacheRead: usage.cache_read_input_tokens ?? 0,
        cacheCreate: usage.cache_creation_input_tokens ?? 0,
      },
      dedupKey: line.message.id !== undefined || line.requestId !== undefined
        ? `${line.message.id ?? ""}\u0000${line.requestId ?? ""}`
        : null,
    });
  }
  return entries;
}

const codexLineSchema = z.object({ timestamp: z.string(), type: z.string(), payload: z.unknown() });
const codexSessionMetaSchema = z.object({ session_id: z.string().min(1).optional(), id: z.string().min(1).optional(), model: z.string().min(1).optional() });
const codexTurnContextSchema = z.object({ model: z.string().min(1).optional(), service_tier: z.string().nullable().optional() });
const codexTokenCountSchema = z.object({
  type: z.literal("token_count"),
  info: z.object({
    last_token_usage: z.object({
      input_tokens: count.optional(),
      cached_input_tokens: count.optional(),
      cache_write_input_tokens: count.optional(),
      output_tokens: count.optional(),
    }),
    total_token_usage: z.object({ total_tokens: count.optional() }).optional(),
  }),
});

const ROLLOUT_ID = /rollout-.*?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i;

/** Session id carried by a Codex rollout file name (fallback when `session_meta` lacks one). */
export function codexSessionIdFromPath(path: string): string {
  const match = ROLLOUT_ID.exec(path);
  return match?.[1] ?? path.split("/").at(-1)?.replace(/\.jsonl$/, "") ?? path;
}

/** Codex rollout: each `token_count` contributes its `last_token_usage` to the current turn context. */
export function parseCodexHistory(text: string, path: string): LocalUsageEntry[] {
  const entries: LocalUsageEntry[] = [];
  let sessionId = codexSessionIdFromPath(path);
  let metaModel: string | null = null;
  let model: string | null = null;
  let serviceTier: string | null = null;
  let lastTotal: number | null = null;
  for (const raw of linesOf(text)) {
    const parsed = codexLineSchema.safeParse(raw);
    if (!parsed.success) continue;
    const line = parsed.data;
    if (line.type === "session_meta") {
      const meta = codexSessionMetaSchema.safeParse(line.payload);
      if (!meta.success) continue;
      sessionId = meta.data.session_id ?? meta.data.id ?? sessionId;
      metaModel = meta.data.model ?? metaModel;
    } else if (line.type === "turn_context") {
      const context = codexTurnContextSchema.safeParse(line.payload);
      if (!context.success) continue;
      model = context.data.model ?? model;
      serviceTier = context.data.service_tier ?? null;
    } else if (line.type === "event_msg") {
      const tokenCount = codexTokenCountSchema.safeParse(line.payload);
      if (!tokenCount.success) continue;
      const timestamp = parseTimestamp(line.timestamp);
      if (timestamp === null) continue;
      // Codex re-emits token_count (e.g. on rate-limit updates) without new usage: an unchanged
      // cumulative total means the same call, which must not be counted again.
      const total = tokenCount.data.info.total_token_usage?.total_tokens ?? null;
      if (total !== null && total === lastTotal) continue;
      lastTotal = total;
      const usage = tokenCount.data.info.last_token_usage;
      const fast = serviceTier !== null && serviceTier !== "default";
      entries.push({
        provider: "codex",
        sessionId,
        timestamp,
        model: model ?? metaModel ?? "unknown",
        speed: fast && serviceTier !== null ? serviceTier : "standard",
        fast,
        // Codex convention: input includes cached and written tokens; reasoning is part of output.
        tokens: {
          input: usage.input_tokens ?? 0,
          output: usage.output_tokens ?? 0,
          cacheRead: usage.cached_input_tokens ?? 0,
          cacheCreate: usage.cache_write_input_tokens ?? 0,
        },
        dedupKey: null,
      });
    }
  }
  return entries;
}

interface CachedFile {
  size: number;
  mtimeMs: number;
  entries: LocalUsageEntry[];
}

export interface LocalUsageReadResult {
  entries: LocalUsageEntry[];
  files: number;
  failedFiles: number;
}

/** Local history reader caching parsed entries per file (keyed by path, invalidated by size + mtime). */
export class LocalUsageHistory {
  private readonly cache = new Map<string, CachedFile>();

  constructor(private readonly fs: LocalHistoryFs, private readonly roots: LocalHistoryRoots) {}

  async read(): Promise<LocalUsageReadResult> {
    const seen = new Set<string>();
    const entries: LocalUsageEntry[] = [];
    let failedFiles = 0;
    const sources: { provider: Orchestrator; files: string[] }[] = [
      { provider: "claude", files: await this.list(this.roots.claudeProjects, (path) => path.endsWith(".jsonl")) },
      { provider: "codex", files: await this.list(this.roots.codexSessions, (path) => /(^|\/)rollout-[^/]*\.jsonl$/.test(path)) },
    ];
    for (const { provider, files } of sources) {
      for (const path of files) {
        seen.add(path);
        try {
          entries.push(...await this.entriesOf(provider, path));
        } catch {
          failedFiles += 1;
          this.cache.delete(path);
        }
      }
    }
    for (const path of this.cache.keys()) {
      if (!seen.has(path)) this.cache.delete(path);
    }
    return { entries, files: seen.size, failedFiles };
  }

  private async list(root: string, keep: (path: string) => boolean): Promise<string[]> {
    try {
      return (await this.fs.listFiles(root)).filter(keep).sort();
    } catch {
      return [];
    }
  }

  private async entriesOf(provider: Orchestrator, path: string): Promise<LocalUsageEntry[]> {
    const { size, mtimeMs } = await this.fs.stat(path);
    const cached = this.cache.get(path);
    if (cached && cached.size === size && cached.mtimeMs === mtimeMs) return cached.entries;
    const text = await this.fs.readText(path);
    const parsed = provider === "claude" ? parseClaudeHistory(text) : parseCodexHistory(text, path);
    this.cache.set(path, { size, mtimeMs, entries: parsed });
    return parsed;
  }
}

/** History roots from the environment, following each CLI's own overrides. */
export function localHistoryRoots(env: Record<string, string | undefined>, homedir: string): LocalHistoryRoots {
  const claudeDir = env.CLAUDE_CONFIG_DIR || `${homedir}/.claude`;
  const codexDir = env.CODEX_HOME || `${homedir}/.codex`;
  return { claudeProjects: `${claudeDir}/projects`, codexSessions: `${codexDir}/sessions` };
}

/** Filesystem access backed by node:fs/promises, loaded on first use. */
export function nodeLocalHistoryFs(): LocalHistoryFs {
  return {
    async listFiles(root) {
      const { readdir } = await import("node:fs/promises");
      const dirents = await readdir(root, { recursive: true, withFileTypes: true });
      return dirents.filter((dirent) => dirent.isFile()).map((dirent) => `${dirent.parentPath}/${dirent.name}`);
    },
    async stat(path) {
      const { stat } = await import("node:fs/promises");
      const stats = await stat(path);
      return { size: stats.size, mtimeMs: stats.mtimeMs };
    },
    async readText(path) {
      const { readFile } = await import("node:fs/promises");
      return readFile(path, "utf8");
    },
  };
}

/** Real reader for this machine; build it lazily (never at import time). */
export function createLocalUsageHistory(env: Record<string, string | undefined>, homedir: string): LocalUsageHistory {
  return new LocalUsageHistory(nodeLocalHistoryFs(), localHistoryRoots(env, homedir));
}
