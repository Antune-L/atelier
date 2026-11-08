import { expect, test } from "bun:test";

import { MAX_GLOBAL_IMPLEMENTERS } from "../../shared/constants.ts";

import {
  IMPLEMENTER_CAPACITY_ENV,
  ImplementerCapacity,
  parseCgroupV2Path,
  parseInactiveFile,
  readCgroupMemory,
  resolveImplementerCapacityConfig,
} from "./implementerCapacity.ts";

const GIB = 1024 * 1024 * 1024;

function fakeReader(files: Record<string, string>): (path: string) => string {
  return (path) => {
    const content = files[path];
    if (content === undefined) throw new Error(`ENOENT ${path}`);
    return content;
  };
}

test("parseCgroupV2Path keeps the unified hierarchy entry only", () => {
  expect(parseCgroupV2Path("0::/system.slice/kanban.service\n")).toBe("/system.slice/kanban.service");
  expect(parseCgroupV2Path("12:memory:/user.slice\n0::/\n")).toBe("/");
  expect(parseCgroupV2Path("4:memory:/user.slice\n")).toBeNull();
});

test("parseInactiveFile reads the reclaimable page cache and defaults to zero", () => {
  expect(parseInactiveFile("anon 100\ninactive_file 4096\nactive_file 10\n")).toBe(4096);
  expect(parseInactiveFile("anon 100\n")).toBe(0);
});

test("readCgroupMemory keeps the tightest limited ancestor and subtracts inactive_file", () => {
  const read = fakeReader({
    "/proc/self/cgroup": "0::/system.slice/kanban.service\n",
    "/sys/fs/cgroup/system.slice/kanban.service/memory.max": `${String(6 * GIB)}\n`,
    "/sys/fs/cgroup/system.slice/kanban.service/memory.current": `${String(3 * GIB)}\n`,
    "/sys/fs/cgroup/system.slice/kanban.service/memory.stat": `inactive_file ${String(GIB)}\n`,
    "/sys/fs/cgroup/system.slice/memory.max": `${String(5 * GIB)}\n`,
    "/sys/fs/cgroup/system.slice/memory.current": `${String(4 * GIB)}\n`,
  });
  expect(readCgroupMemory(read)).toEqual({ limitBytes: 5 * GIB, usedBytes: 4 * GIB });
});

test("readCgroupMemory treats max as unlimited and returns null without any limit or cgroup v2", () => {
  const unlimited = fakeReader({
    "/proc/self/cgroup": "0::/user.slice\n",
    "/sys/fs/cgroup/user.slice/memory.max": "max\n",
    "/sys/fs/cgroup/user.slice/memory.current": "1000\n",
  });
  expect(readCgroupMemory(unlimited)).toBeNull();
  expect(readCgroupMemory(fakeReader({}))).toBeNull();
  const unreadableUsage = fakeReader({
    "/proc/self/cgroup": "0::/kanban.service\n",
    "/sys/fs/cgroup/kanban.service/memory.max": "1000\n",
  });
  expect(readCgroupMemory(unreadableUsage)).toBeNull();
});

test("an empty environment keeps the historical global cap", () => {
  const config = resolveImplementerCapacityConfig({});
  expect(config.ceiling).toBe(MAX_GLOBAL_IMPLEMENTERS);
  expect(config.invalid).toEqual([]);
});

test("invalid configuration values fall back to defaults and are reported", () => {
  const defaults = resolveImplementerCapacityConfig({});
  const config = resolveImplementerCapacityConfig({
    [IMPLEMENTER_CAPACITY_ENV.ceiling]: "eight",
    [IMPLEMENTER_CAPACITY_ENV.sessionMemory]: "0",
    [IMPLEMENTER_CAPACITY_ENV.memoryReserve]: "-1",
    [IMPLEMENTER_CAPACITY_ENV.minFreeDisk]: "512",
  });
  expect(config.ceiling).toBe(defaults.ceiling);
  expect(config.sessionMemoryBytes).toBe(defaults.sessionMemoryBytes);
  expect(config.memoryReserveBytes).toBe(defaults.memoryReserveBytes);
  expect(config.minFreeDiskBytes).toBe(512 * 1024 * 1024);
  expect(config.invalid).toEqual([IMPLEMENTER_CAPACITY_ENV.ceiling, IMPLEMENTER_CAPACITY_ENV.sessionMemory, IMPLEMENTER_CAPACITY_ENV.memoryReserve]);
  const state = new ImplementerCapacity(config, { readMemory: () => null, readFreeDiskBytes: () => null }).state([], 0);
  expect(state.invalidConfig).toEqual(config.invalid);
  expect(state.ceiling).toBe(MAX_GLOBAL_IMPLEMENTERS);
});
