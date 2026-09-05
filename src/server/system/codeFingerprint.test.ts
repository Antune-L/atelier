import { $ } from "bun";
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { WorkerMcpManager } from "../workerMcp.ts";

import { RealSystemAdapter } from "./real.ts";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("RealSystemAdapter.codeFingerprint", () => {
  test("tracks worktree contents while ignoring a commit-only metadata change", async () => {
    const directory = await mkdtemp(join(tmpdir(), "kanban-fingerprint-"));
    directories.push(directory);
    await $`git init ${directory}`.quiet();
    await $`git -C ${directory} config user.email test@example.com`.quiet();
    await $`git -C ${directory} config user.name Test`.quiet();
    const sourcePath = join(directory, "source.ts");
    await writeFile(sourcePath, "export const value = 1;\n");
    await $`git -C ${directory} add source.ts`.quiet();
    await $`git -C ${directory} commit -m initial`.quiet();
    const system = new RealSystemAdapter(new WorkerMcpManager());

    const initial = await system.codeFingerprint(directory);
    await writeFile(sourcePath, "export const value = 2;\n");
    const changed = await system.codeFingerprint(directory);
    expect(changed).not.toBe(initial);

    await $`git -C ${directory} add source.ts`.quiet();
    await $`git -C ${directory} commit -m changed`.quiet();
    expect(await system.codeFingerprint(directory)).toBe(changed);

    await writeFile(join(directory, "new file.ts"), "export const added = true;\n");
    expect(await system.codeFingerprint(directory)).not.toBe(changed);
  });
});
