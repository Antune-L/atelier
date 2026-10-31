import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  archiveFingerprint, copyArchiveContents, pruneImplementationRecoveryArchives, restoreImplementationRecoveryArchive,
} from "./delegationWorkspace.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

let root: string;

async function git(cwd: string, args: string[]): Promise<string> {
  const proc = Bun.spawn(["git", "-c", "user.name=test", "-c", "user.email=test@example.com", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  if (code !== 0) throw new Error(`git ${args.join(" ")} failed: ${stderr}`);
  return stdout;
}

async function createRepository(): Promise<{ repo: string; head: string }> {
  const repo = join(root, "repo");
  await mkdir(join(repo, "src", "node_modules", "dep"), { recursive: true });
  await git(repo, ["init", "-q"]);
  await writeFile(join(repo, "README.md"), "hello\n");
  await writeFile(join(repo, "src", "index.ts"), "export {};\n");
  await git(repo, ["add", "."]);
  await git(repo, ["commit", "-q", "-m", "init"]);
  await writeFile(join(repo, "src", "index.ts"), "export const changed = true;\n");
  await mkdir(join(repo, "node_modules", "pkg"), { recursive: true });
  await writeFile(join(repo, "node_modules", "pkg", "index.js"), "module.exports = 1;\n");
  await writeFile(join(repo, "src", "node_modules", "dep", "index.js"), "nested\n");
  await symlink("../README.md", join(repo, "src", "link"));
  return { repo, head: (await git(repo, ["rev-parse", "HEAD"])).trim() };
}

interface ArchiveSpec { ticketId: string; createdAt: number; head: string | null; validBundle?: boolean; slot?: string }

async function createArchive(archiveRoot: string, repo: string, slotPath: string, spec: ArchiveSpec, index: number): Promise<string> {
  const key = createHash("sha256").update(`${spec.ticketId}-${index}`).digest("hex");
  const path = join(archiveRoot, key);
  await mkdir(path, { recursive: true });
  if (spec.head) {
    if (spec.validBundle === false) await writeFile(join(path, "repository.bundle"), "corrupt");
    else await git(repo, ["bundle", "create", join(path, "repository.bundle"), "HEAD"]);
  }
  await writeFile(join(path, "manifest.json"), JSON.stringify({
    ticketId: spec.ticketId, label: "lot", originalWorkspace: join(root, "ws"), originalSlot: spec.slot ?? slotPath,
    journalHash: null, contentFingerprint: null, head: spec.head, createdAt: spec.createdAt,
  }));
  return path;
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "delegation-workspace-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("implementation recovery archive content", () => {
  test("excludes root and nested node_modules while keeping fingerprints consistent", async () => {
    const { repo } = await createRepository();
    const content = join(root, "content");
    await copyArchiveContents(repo, content);
    expect((await readdir(content)).sort()).toEqual(["README.md", "src"]);
    expect((await readdir(join(content, "src"))).sort()).toEqual(["index.ts", "link"]);
    expect(await archiveFingerprint(content)).toBe(await archiveFingerprint(repo));
  });

  test("restores an archive into a fresh destination without node_modules", async () => {
    const { repo, head } = await createRepository();
    const archive = join(root, "archive");
    await copyArchiveContents(repo, join(archive, "worktree"));
    await git(repo, ["bundle", "create", join(archive, "repository.bundle"), "HEAD"]);
    await writeFile(join(archive, "manifest.json"), JSON.stringify({
      ticketId: "t1", label: "lot", originalWorkspace: repo, originalSlot: join(root, "slot-1"),
      journalHash: null, contentFingerprint: await archiveFingerprint(repo), head, createdAt: Date.now(),
    }));
    const destination = join(root, "restored");
    await restoreImplementationRecoveryArchive(archive, destination);
    expect(await Bun.file(join(destination, "src", "index.ts")).text()).toBe("export const changed = true;\n");
    expect((await readdir(destination)).includes("node_modules")).toBe(false);
    expect((await git(destination, ["rev-parse", "HEAD"])).trim()).toBe(head);
  });
});

describe("pruneImplementationRecoveryArchives", () => {
  test("keeps the 3 most recent per ticket and deletes expired archives with verified bundles", async () => {
    const { repo, head } = await createRepository();
    const slotPath = join(root, "slot-1");
    const archiveRoot = join(root, ".implementation-recovery");
    const now = Date.now();
    const specs: ArchiveSpec[] = [
      { ticketId: "a", createdAt: now - 1000, head },
      { ticketId: "a", createdAt: now - 2000, head },
      { ticketId: "a", createdAt: now - 3000, head },
      { ticketId: "a", createdAt: now - 4000, head },
      { ticketId: "a", createdAt: now - 5000, head, validBundle: false },
      { ticketId: "a", createdAt: now - 6000, head: null },
      { ticketId: "b", createdAt: now - 15 * DAY_MS, head },
      { ticketId: "b", createdAt: now - 20 * DAY_MS, head: null },
      { ticketId: "c", createdAt: now - 30 * DAY_MS, head, slot: join(root, "slot-2") },
      { ticketId: "d", createdAt: now - 30 * DAY_MS, head },
    ];
    const paths = await Promise.all(specs.map((spec, index) => createArchive(archiveRoot, repo, slotPath, spec, index)));
    await mkdir(join(archiveRoot, "pending-xyz"));
    const keepPath = paths[9] ?? "";

    const removed = await pruneImplementationRecoveryArchives(archiveRoot, slotPath, keepPath, now);

    expect(removed.sort()).toEqual([paths[3] ?? "", paths[6] ?? ""].sort());
    const remaining = await readdir(archiveRoot);
    expect(remaining).toContain("pending-xyz");
    expect(remaining.length).toBe(specs.length - 2 + 1);
  });
});
