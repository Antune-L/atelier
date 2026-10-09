import { beforeEach, expect, test } from "bun:test";

import {
  cpuPercentBetween,
  parseMeminfo,
  parseProcStatCpu,
  readHostMetrics,
  resetHostMetricsForTests,
} from "./hostMetrics.ts";

const STAT = `cpu  100 10 50 800 40 0 0 0 30 5
cpu0 50 5 25 400 20 0 0 0 15 2
cpu1 50 5 25 400 20 0 0 0 15 3
intr 12345
ctxt 6789
`;

const MEMINFO = `MemTotal:        8000000 kB
MemFree:          500000 kB
MemAvailable:    5000000 kB
Buffers:          100000 kB
`;

beforeEach(() => resetHostMetricsForTests());

test("parseProcStatCpu reads the aggregated line, counts iowait as idle and skips guest fields", () => {
  expect(parseProcStatCpu(STAT)).toEqual({ idle: 840, total: 1000 });
});

test("parseProcStatCpu returns null on malformed input", () => {
  expect(parseProcStatCpu("cpu0 1 2 3 4\n")).toBeNull();
  expect(parseProcStatCpu("cpu  a b c d e\n")).toBeNull();
});

test("parseMeminfo uses MemAvailable rather than MemFree", () => {
  expect(parseMeminfo(MEMINFO)).toEqual({ totalBytes: 8000000 * 1024, usedBytes: 3000000 * 1024 });
  expect(parseMeminfo("MemTotal: 100 kB\nMemFree: 50 kB\n")).toBeNull();
});

test("cpuPercentBetween computes busy share and handles zero delta", () => {
  expect(cpuPercentBetween({ idle: 800, total: 1000 }, { idle: 860, total: 1100 })).toBeCloseTo(40);
  expect(cpuPercentBetween({ idle: 800, total: 1000 }, { idle: 800, total: 1000 })).toBeNull();
});

test("readHostMetrics returns null when the reader throws", async () => {
  expect(await readHostMetrics(() => Promise.reject(new Error("ENOENT")))).toBeNull();
});

test("readHostMetrics yields null cpu on first call and a number afterwards", async () => {
  let stat = STAT;
  let clock = 10_000;
  const reader = (path: string): Promise<string> => Promise.resolve(path === "/proc/stat" ? stat : MEMINFO);
  const first = await readHostMetrics(reader, () => clock);
  expect(first?.cpuPercent).toBeNull();
  expect(first?.memUsedBytes).toBe(3000000 * 1024);
  stat = "cpu  150 10 50 850 40 0 0 0 0 0\n";
  clock += 5_000;
  const second = await readHostMetrics(reader, () => clock);
  expect(second?.cpuPercent).toBeCloseTo(50);
});

test("readHostMetrics keeps the baseline for concurrent callers polling within the minimum window", async () => {
  let stat = STAT;
  let clock = 10_000;
  const reader = (path: string): Promise<string> => Promise.resolve(path === "/proc/stat" ? stat : MEMINFO);
  await readHostMetrics(reader, () => clock);
  stat = "cpu  150 10 50 850 40 0 0 0 0 0\n";
  clock += 5_000;
  expect((await readHostMetrics(reader, () => clock))?.cpuPercent).toBeCloseTo(50);
  // A second client a few ms later reuses the last percentage instead of measuring a tiny window.
  stat = "cpu  151 10 50 850 40 0 0 0 0 0\n";
  clock += 30;
  expect((await readHostMetrics(reader, () => clock))?.cpuPercent).toBeCloseTo(50);
  // The baseline was not advanced, so the next full window is measured from the 5 s sample.
  stat = "cpu  175 10 50 925 40 0 0 0 0 0\n";
  clock += 5_000;
  expect((await readHostMetrics(reader, () => clock))?.cpuPercent).toBeCloseTo(25);
});
