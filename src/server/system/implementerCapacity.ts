import { readFileSync, statfsSync } from "node:fs";
import { homedir } from "node:os";
import { posix } from "node:path";

import { MAX_GLOBAL_IMPLEMENTERS } from "../../shared/constants.ts";

import { SLOTS_ROOT } from "../config.ts";
import { createLogger } from "../logger.ts";

const log = createLogger("implementer-capacity");

const BYTES_PER_MIB = 1024 * 1024;
// NOTE(ali): One delegated lot runs an agent CLI (~0.5 GB) plus the installs, typechecks and tests it launches in its worktree.
const DEFAULT_IMPLEMENTER_MEMORY_MB = 1536;
const DEFAULT_MEMORY_RESERVE_MB = 1024;
const DEFAULT_MIN_FREE_DISK_MB = 2048;
// NOTE(ali): A just-started lot has not reached its footprint yet, so the cgroup reading does not show it.
const SESSION_WARMUP_MS = 60_000;
const CGROUP_ROOT = "/sys/fs/cgroup";
const PROC_SELF_CGROUP = "/proc/self/cgroup";
const CGROUP_V2_PREFIX = "0::";
const CGROUP_UNLIMITED = "max";

export const IMPLEMENTER_CAPACITY_ENV = {
  ceiling: "KANBAN_MAX_IMPLEMENTERS",
  sessionMemory: "KANBAN_IMPLEMENTER_MEMORY_MB",
  memoryReserve: "KANBAN_MEMORY_RESERVE_MB",
  minFreeDisk: "KANBAN_MIN_FREE_DISK_MB",
} as const;

export type CapacityBlock = "ceiling" | "memory" | "disk";

export interface ImplementerCapacityConfig {
  ceiling: number;
  sessionMemoryBytes: number;
  memoryReserveBytes: number;
  minFreeDiskBytes: number;
  invalid: string[];
}

export interface CgroupMemory {
  limitBytes: number;
  usedBytes: number;
}

export interface ImplementerCapacityProbe {
  readMemory(): CgroupMemory | null;
  readFreeDiskBytes(): number | null;
}

export interface ImplementerCapacityState {
  ceiling: number;
  floor: number;
  source: "cgroup" | "static";
  memory: { status: "measured"; limitBytes: number; usedBytes: number; availableBytes: number } | { status: "unavailable" };
  sessionMemoryBytes: number;
  memoryReserveBytes: number;
  freeDiskBytes: number | null;
  minFreeDiskBytes: number;
  active: number;
  queued: number;
  blockedReason: CapacityBlock | null;
  invalidConfig: string[];
}

type FileReader = (path: string) => string;
type Env = Record<string, string | undefined>;

function parseNumber(env: Env, name: string, fallback: number, min: number, invalid: string[]): number {
  const raw = env[name]?.trim();
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (Number.isSafeInteger(value) && value >= min) return value;
  invalid.push(name);
  return fallback;
}

export function resolveImplementerCapacityConfig(env: Env): ImplementerCapacityConfig {
  const invalid: string[] = [];
  const ceiling = parseNumber(env, IMPLEMENTER_CAPACITY_ENV.ceiling, MAX_GLOBAL_IMPLEMENTERS, 1, invalid);
  const sessionMemoryMb = parseNumber(env, IMPLEMENTER_CAPACITY_ENV.sessionMemory, DEFAULT_IMPLEMENTER_MEMORY_MB, 1, invalid);
  const memoryReserveMb = parseNumber(env, IMPLEMENTER_CAPACITY_ENV.memoryReserve, DEFAULT_MEMORY_RESERVE_MB, 0, invalid);
  const minFreeDiskMb = parseNumber(env, IMPLEMENTER_CAPACITY_ENV.minFreeDisk, DEFAULT_MIN_FREE_DISK_MB, 0, invalid);
  return {
    ceiling,
    sessionMemoryBytes: sessionMemoryMb * BYTES_PER_MIB,
    memoryReserveBytes: memoryReserveMb * BYTES_PER_MIB,
    minFreeDiskBytes: minFreeDiskMb * BYTES_PER_MIB,
    invalid,
  };
}

export function parseCgroupV2Path(text: string): string | null {
  const line = text.split("\n").find((candidate) => candidate.startsWith(CGROUP_V2_PREFIX));
  const path = line?.slice(CGROUP_V2_PREFIX.length).trim();
  return path?.startsWith("/") ? path : null;
}

function parseBytes(text: string): number | null {
  const value = Number(text.trim());
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

export function parseInactiveFile(text: string): number {
  const value = /^inactive_file\s+(\d+)$/m.exec(text)?.[1];
  return value === undefined ? 0 : Number(value);
}

function readOptional(read: FileReader, path: string): string | null {
  try {
    return read(path);
  } catch {
    return null;
  }
}

// NOTE(ali): The tightest limited ancestor wins; reclaimable inactive_file does not count as used; null = no cgroup v2 or no limit.
export function readCgroupMemory(read: FileReader, root = CGROUP_ROOT): CgroupMemory | null {
  const selfCgroup = readOptional(read, PROC_SELF_CGROUP);
  const leaf = selfCgroup === null ? null : parseCgroupV2Path(selfCgroup);
  if (leaf === null) return null;
  let tightest: CgroupMemory | null = null;
  for (let current = leaf; ; current = posix.dirname(current)) {
    const directory = posix.join(root, current);
    const max = readOptional(read, `${directory}/memory.max`)?.trim();
    if (max !== undefined && max !== CGROUP_UNLIMITED) {
      const limitBytes = parseBytes(max);
      const currentText = readOptional(read, `${directory}/memory.current`);
      const usage = currentText === null ? null : parseBytes(currentText);
      if (limitBytes === null || usage === null) return null;
      const inactive = parseInactiveFile(readOptional(read, `${directory}/memory.stat`) ?? "");
      const usedBytes = Math.max(0, usage - inactive);
      if (!tightest || limitBytes - usedBytes < tightest.limitBytes - tightest.usedBytes) tightest = { limitBytes, usedBytes };
    }
    if (current === "/") return tightest;
  }
}

function freeDiskBytes(paths: readonly string[]): number | null {
  for (const path of paths) {
    try {
      const stats = statfsSync(path);
      return stats.bavail * stats.bsize;
    } catch {
      continue;
    }
  }
  return null;
}

const systemProbe: ImplementerCapacityProbe = {
  readMemory: () => readCgroupMemory((path) => readFileSync(path, "utf8")),
  readFreeDiskBytes: () => freeDiskBytes([SLOTS_ROOT, homedir()]),
};

export class ImplementerCapacity {
  readonly floor: number;

  constructor(
    readonly config: ImplementerCapacityConfig,
    private readonly probe: ImplementerCapacityProbe = systemProbe,
    private readonly now: () => number = Date.now,
  ) {
    // NOTE(ali): Below the historical global cap no memory check applies, so the default behaviour is unchanged.
    this.floor = Math.min(config.ceiling, MAX_GLOBAL_IMPLEMENTERS);
  }

  blockedReason(startedAt: readonly number[]): CapacityBlock | null {
    return this.evaluate(startedAt).blockedReason;
  }

  state(startedAt: readonly number[], queued: number): ImplementerCapacityState {
    const { blockedReason, memory, freeDisk } = this.evaluate(startedAt, true);
    return {
      ceiling: this.config.ceiling,
      floor: this.floor,
      source: memory ? "cgroup" : "static",
      memory: memory
        ? { status: "measured", ...memory, availableBytes: Math.max(0, memory.limitBytes - memory.usedBytes) }
        : { status: "unavailable" },
      sessionMemoryBytes: this.config.sessionMemoryBytes,
      memoryReserveBytes: this.config.memoryReserveBytes,
      freeDiskBytes: freeDisk,
      minFreeDiskBytes: this.config.minFreeDiskBytes,
      active: startedAt.length,
      queued,
      blockedReason,
      invalidConfig: this.config.invalid,
    };
  }

  private evaluate(startedAt: readonly number[], measureAll = false): { blockedReason: CapacityBlock | null; memory: CgroupMemory | null; freeDisk: number | null } {
    const active = startedAt.length;
    const freeDisk = this.probe.readFreeDiskBytes();
    const needsMemory = measureAll || (active < this.config.ceiling && active >= this.floor);
    const memory = needsMemory ? this.probe.readMemory() : null;
    let blockedReason: CapacityBlock | null = null;
    if (active >= this.config.ceiling) blockedReason = "ceiling";
    else if (freeDisk !== null && freeDisk < this.config.minFreeDiskBytes) blockedReason = "disk";
    else if (active >= this.floor && memory && !this.memoryCovers(memory, startedAt)) blockedReason = "memory";
    return { blockedReason, memory, freeDisk };
  }

  private memoryCovers(memory: CgroupMemory, startedAt: readonly number[]): boolean {
    const now = this.now();
    const warming = startedAt.filter((started) => now - started < SESSION_WARMUP_MS).length;
    const needed = (warming + 1) * this.config.sessionMemoryBytes + this.config.memoryReserveBytes;
    return memory.limitBytes - memory.usedBytes >= needed;
  }
}

export function createImplementerCapacity(env: Env = process.env): ImplementerCapacity {
  const config = resolveImplementerCapacityConfig(env);
  if (config.invalid.length > 0) {
    log.warn("invalid implementer capacity configuration, defaults applied", { invalid: config.invalid });
  }
  return new ImplementerCapacity(config);
}
