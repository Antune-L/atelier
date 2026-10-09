import { readFile } from "node:fs/promises";
import { loadavg } from "node:os";

import type { HostMetrics } from "../../shared/types.ts";

export interface CpuSample {
  idle: number;
  total: number;
}

export interface MemSample {
  totalBytes: number;
  usedBytes: number;
}

export type ProcReader = (path: string) => Promise<string>;

const KIB = 1024;
// user nice system idle iowait irq softirq steal; guest/guest_nice are already counted in user/nice.
const CPU_COUNTED_FIELDS = 8;
const CPU_MIN_FIELDS = 4;
const IDLE_INDEX = 3;
const IOWAIT_INDEX = 4;

// Several clients may poll concurrently: the CPU baseline only advances once this window has elapsed,
// so every caller gets a percentage measured over a meaningful interval instead of the gap between two requests.
const MIN_CPU_WINDOW_MS = 2_000;

const defaultReader: ProcReader = (path) => readFile(path, "utf8");

let previousCpu: CpuSample | null = null;
let previousCpuAt = 0;
let lastCpuPercent: number | null = null;

export function parseProcStatCpu(text: string): CpuSample | null {
  const line = text.split("\n").find((candidate) => candidate.startsWith("cpu "));
  if (!line) return null;
  const counted = line.trim().split(/\s+/).slice(1, CPU_COUNTED_FIELDS + 1).map(Number);
  if (counted.length < CPU_MIN_FIELDS) return null;
  if (counted.some((value) => !Number.isFinite(value) || value < 0)) return null;
  const idle = (counted[IDLE_INDEX] ?? 0) + (counted[IOWAIT_INDEX] ?? 0);
  const total = counted.reduce((sum, value) => sum + value, 0);
  return { idle, total };
}

function meminfoKb(text: string, key: string): number | null {
  const value = new RegExp(`^${key}:\\s+(\\d+)`, "m").exec(text)?.[1];
  return value === undefined ? null : Number(value);
}

export function parseMeminfo(text: string): MemSample | null {
  const totalKb = meminfoKb(text, "MemTotal");
  const availableKb = meminfoKb(text, "MemAvailable");
  if (totalKb === null || availableKb === null) return null;
  const totalBytes = totalKb * KIB;
  return { totalBytes, usedBytes: Math.max(0, totalBytes - availableKb * KIB) };
}

export function cpuPercentBetween(prev: CpuSample, next: CpuSample): number | null {
  const deltaTotal = next.total - prev.total;
  if (deltaTotal <= 0) return null;
  const percent = (1 - (next.idle - prev.idle) / deltaTotal) * 100;
  return Math.min(100, Math.max(0, percent));
}

export function resetHostMetricsForTests(): void {
  previousCpu = null;
  previousCpuAt = 0;
  lastCpuPercent = null;
}

function sampleCpuPercent(cpu: CpuSample, now: number): number | null {
  if (!previousCpu) {
    previousCpu = cpu;
    previousCpuAt = now;
    return null;
  }
  if (now - previousCpuAt < MIN_CPU_WINDOW_MS) return lastCpuPercent;
  lastCpuPercent = cpuPercentBetween(previousCpu, cpu) ?? lastCpuPercent;
  previousCpu = cpu;
  previousCpuAt = now;
  return lastCpuPercent;
}

/** Samples /proc; never throws, returns null when the host metrics are unreadable. */
export async function readHostMetrics(read: ProcReader = defaultReader, now: () => number = Date.now): Promise<HostMetrics | null> {
  try {
    const [stat, meminfo] = await Promise.all([read("/proc/stat"), read("/proc/meminfo")]);
    const cpu = parseProcStatCpu(stat);
    const mem = parseMeminfo(meminfo);
    if (!cpu || !mem) return null;
    const sampledAt = now();
    return {
      cpuPercent: sampleCpuPercent(cpu, sampledAt),
      memUsedBytes: mem.usedBytes,
      memTotalBytes: mem.totalBytes,
      loadAvg1: loadavg()[0] ?? 0,
      sampledAt,
    };
  } catch {
    return null;
  }
}
