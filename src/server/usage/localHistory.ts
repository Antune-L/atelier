import { dirname, join } from "node:path";

import { z } from "zod";

import { isCodexFastServiceTier } from "../../shared/codexCapabilities.ts";
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
  codexArchivedSessions?: string;
}

const count = z.number().nonnegative().catch(0);
const MAX_HISTORY_FILES = 25_000;
const MAX_HISTORY_DIRECTORIES = 25_000;
const MAX_HISTORY_FILE_BYTES = 128 * 1024 * 1024;
const MAX_HISTORY_READ_BYTES = 4 * 1024 * 1024 * 1024;
const HISTORY_READ_CONCURRENCY = 4;
const NOT_PROCESSED = new Error("not processed");
// NOTE(ali): a line can only yield an entry (Claude) or change parser state (Codex) when it contains one of these literals.
const CLAUDE_LINE_KEYWORDS = ['"usage"'];
const CODEX_LINE_KEYWORDS = ['"session_meta"', '"turn_context"', '"token_count"'];

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

function* linesOf(text: string, keywords: readonly string[]): Generator<unknown> {
  for (const line of text.split("\n")) {
    if (keywords.some((keyword) => line.includes(keyword))) yield parseJson(line);
  }
}

/** Claude assistant lines with usage; `dedupKey` lets the merge drop calls repeated across files. */
export function parseClaudeHistory(text: string): LocalUsageEntry[] {
  const entries: LocalUsageEntry[] = [];
  for (const raw of linesOf(text, CLAUDE_LINE_KEYWORDS)) {
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
  let eventIndex = 0;
  for (const raw of linesOf(text, CODEX_LINE_KEYWORDS)) {
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
      // Same FAST rule as DB executions; any other non-default tier stays visible through `speed`.
      const fast = isCodexFastServiceTier(serviceTier);
      eventIndex += 1;
      entries.push({
        provider: "codex",
        sessionId,
        timestamp,
        model: model ?? metaModel ?? "unknown",
        speed: serviceTier === null || serviceTier === "default" ? "standard" : serviceTier,
        fast,
        // Codex convention: input includes cached and written tokens; reasoning is part of output.
        tokens: {
          input: usage.input_tokens ?? 0,
          output: usage.output_tokens ?? 0,
          cacheRead: usage.cached_input_tokens ?? 0,
          cacheCreate: usage.cache_write_input_tokens ?? 0,
        },
        dedupKey: total === null ? `${sessionId}\u0000event:${eventIndex}` : `${sessionId}\u0000${total}`,
      });
    }
  }
  return entries;
}

interface FileStats {
  size: number;
  mtimeMs: number;
}

interface CachedFile extends FileStats {
  entries: LocalUsageEntry[];
}

export interface LocalUsageReadResult {
  entries: LocalUsageEntry[];
  files: number;
  failedFiles: number;
  failedRoots: number;
}

/** Local history reader caching parsed entries per file (keyed by path, invalidated by size + mtime). */
export class LocalUsageHistory {
  private readonly cache = new Map<string, CachedFile>();

  constructor(private readonly fs: LocalHistoryFs, private readonly roots: LocalHistoryRoots) {}

  async read(providerFilter?: Orchestrator, since?: number): Promise<LocalUsageReadResult> {
    const seen = new Set<string>();
    const entries: LocalUsageEntry[] = [];
    let failedFiles = 0;
    let failedRoots = 0;
    const bytesByProvider: Record<Orchestrator, number> = { claude: 0, codex: 0 };
    const roots: { provider: Orchestrator; root: string; keep: (path: string) => boolean }[] = [
      { provider: "claude", root: this.roots.claudeProjects, keep: (path) => path.endsWith(".jsonl") },
      { provider: "codex", root: this.roots.codexSessions, keep: (path) => /(^|\/)rollout-[^/]*\.jsonl$/.test(path) },
    ];
    if (this.roots.codexArchivedSessions) roots.push({ provider: "codex", root: this.roots.codexArchivedSessions, keep: (path) => /(^|\/)rollout-[^/]*\.jsonl$/.test(path) });
    for (const { provider, root, keep } of roots) {
      if (providerFilter && providerFilter !== provider) continue;
      let files: string[];
      try {
        files = (await this.fs.listFiles(root)).filter(keep).sort();
      } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") continue;
        failedRoots += 1;
        continue;
      }
      const statted = await mapInOrder(files, (path) => this.fs.stat(path));
      // NOTE(ali): skip and budget decisions stay in sorted path order so caps and dedup are deterministic.
      const selected: { path: string; stats: FileStats }[] = [];
      for (const { item: path, result: stats } of statted) {
        seen.add(path);
        if (stats instanceof Error) {
          failedFiles += 1;
          this.cache.delete(path);
          continue;
        }
        if (since !== undefined && stats.mtimeMs < since) continue;
        if (seen.size > MAX_HISTORY_FILES || stats.size > MAX_HISTORY_FILE_BYTES || bytesByProvider[provider] + stats.size > MAX_HISTORY_READ_BYTES) {
          failedFiles += 1;
          continue;
        }
        bytesByProvider[provider] += stats.size;
        selected.push({ path, stats });
      }
      const parsedFiles = await mapInOrder(selected, ({ path, stats }) => this.entriesOf(provider, path, stats));
      for (const { item, result: parsed } of parsedFiles) {
        if (parsed instanceof Error) {
          failedFiles += 1;
          this.cache.delete(item.path);
          continue;
        }
        // Append one by one: spreading a huge file's entries into push() overflows the argument limit.
        for (const entry of parsed) {
          if (since === undefined || entry.timestamp >= since) entries.push(entry);
        }
      }
    }
    for (const path of this.cache.keys()) {
      if (!seen.has(path)) this.cache.delete(path);
    }
    return { entries, files: seen.size, failedFiles, failedRoots };
  }

  private async entriesOf(provider: Orchestrator, path: string, { size, mtimeMs }: FileStats): Promise<LocalUsageEntry[]> {
    const cached = this.cache.get(path);
    if (cached && cached.size === size && cached.mtimeMs === mtimeMs) return cached.entries;
    const text = await this.fs.readText(path);
    const parsed = provider === "claude" ? parseClaudeHistory(text) : parseCodexHistory(text, path);
    this.cache.set(path, { size, mtimeMs, entries: parsed });
    return parsed;
  }
}

async function mapInOrder<T, R>(items: readonly T[], task: (item: T) => Promise<R>): Promise<{ item: T; result: R | Error }[]> {
  const settled: { item: T; result: R | Error }[] = items.map((item) => ({ item, result: NOT_PROCESSED }));
  const queue = settled.values();
  const worker = async (): Promise<void> => {
    for (const slot of queue) {
      try {
        slot.result = await task(slot.item);
      } catch (error) {
        slot.result = error instanceof Error ? error : new Error(String(error));
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(HISTORY_READ_CONCURRENCY, items.length) }, worker));
  return settled;
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
      const directories = [root];
      const files: string[] = [];
      let visited = 0;
      while (directories.length > 0) {
        const directory = directories.pop();
        if (directory === undefined) break;
        visited += 1;
        if (visited > MAX_HISTORY_DIRECTORIES) throw new Error("History directory limit exceeded");
        const dirents = await readdir(directory, { withFileTypes: true });
        for (const entry of dirents) {
          const path = `${directory}/${entry.name}`;
          if (entry.isDirectory()) directories.push(path);
          if (entry.isFile() && entry.name.endsWith(".jsonl")) files.push(path);
          if (files.length > MAX_HISTORY_FILES || directories.length > MAX_HISTORY_DIRECTORIES) throw new Error("History file limit exceeded");
        }
      }
      return files;
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
  const roots = localHistoryRoots(env, homedir);
  return new LocalUsageHistory(nodeLocalHistoryFs(), { ...roots, codexArchivedSessions: join(dirname(roots.codexSessions), "archived_sessions") });
}
