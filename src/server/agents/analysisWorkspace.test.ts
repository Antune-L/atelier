import { describe, expect, test } from "bun:test";

import { KeyedMutex } from "../mutex.ts";
import { ANALYSIS_WORKSPACES_ROOT, prepareAnalysisWorkspace, releaseAnalysisWorkspace } from "./analysisWorkspace.ts";
import type { AnalysisSystem } from "./analysisWorkspace.ts";

class StubSystem implements AnalysisSystem {
  readonly prepared: string[] = [];
  readonly removed: string[] = [];
  constructor(private readonly failure: Error | null = null) {}

  async prepareAnalysisWorkspace(_repoPath: string, path: string): Promise<void> {
    this.prepared.push(path);
    if (this.failure) throw this.failure;
  }

  async removeAnalysisWorkspace(_repoPath: string, path: string): Promise<void> {
    this.removed.push(path);
  }
}

class RecordingMutex extends KeyedMutex {
  readonly keys: string[] = [];
  override run<T>(key: string, task: () => Promise<T>): Promise<T> {
    this.keys.push(key);
    return super.run(key, task);
  }
}

describe("analysis workspace", () => {
  test("prepares a worktree under the analysis root, through the repo mutex", async () => {
    const system = new StubSystem();
    const mutex = new RecordingMutex();
    const workspace = await prepareAnalysisWorkspace(system, mutex, "/repo", "main", "ticket_1");
    expect(workspace.cwd.startsWith(`${ANALYSIS_WORKSPACES_ROOT}/ticket_1-`)).toBe(true);
    expect(workspace.repoPath).toBe("/repo");
    expect(system.prepared).toEqual([workspace.cwd]);
    expect(mutex.keys).toEqual(["/repo"]);

    await releaseAnalysisWorkspace(system, mutex, workspace);
    expect(system.removed).toEqual([workspace.cwd]);
    expect(mutex.keys).toEqual(["/repo", "/repo"]);
  });

  test("fails loudly and cleans the partial dir instead of falling back to the main checkout", async () => {
    const system = new StubSystem(new Error("git fetch origin develop a échoué : no remote"));
    const mutex = new RecordingMutex();
    const error = await prepareAnalysisWorkspace(system, mutex, "/repo", "develop", "batch-1").then(() => null, (caught: unknown) => caught);
    expect(error).toBeInstanceOf(Error);
    expect(String(error)).toContain("origin/develop");
    expect(String(error)).toContain("no remote");
    expect(system.removed).toEqual(system.prepared);
    expect(system.removed).not.toContain("/repo");
    expect(mutex.keys).toEqual(["/repo", "/repo"]);
  });

  test("rejects a key that is not a safe path segment", async () => {
    const system = new StubSystem();
    await expect(prepareAnalysisWorkspace(system, new KeyedMutex(), "/repo", "main", "../escape")).rejects.toThrow("invalide");
    expect(system.prepared).toEqual([]);
  });
});
