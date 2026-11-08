import { afterEach, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startExternalValidationSchema } from "../shared/externalValidation.ts";
import { ExternalValidationManager } from "./externalValidation.ts";
import { PreviewConfig } from "./previewConfig.ts";
import { FakeSystemAdapter } from "./system/fake.ts";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "external-validation-")); roots.push(root);
  const previews = { list: () => [], get: () => { throw new Error("Unexpected preview access"); }, stop: async () => { throw new Error("Unexpected live cleanup"); }, projectSettings: () => { throw new Error("Unexpected settings access"); }, createExternal: async () => { throw new Error("Unexpected deployment"); } };
  const manager = new ExternalValidationManager(root, previews, new PreviewConfig(root, { dryRun: true }), new FakeSystemAdapter());
  return { root, manager, previews };
}
const input = startExternalValidationSchema.parse({ requestId: "request/../../one", missionId: "mission", project: "project", branch: "feature/test", headSha: "a".repeat(40), provider: "claude", scenarios: [{ id: "one", description: "Open page", expected: "Title visible", interaction: "display" }] });
for (const provider of ["claude", "codex"] satisfies Array<"claude" | "codex">) {
  test(`${provider}: dry-run is blocked, repeatable and restart-readable without live calls`, async () => {
    const { root, manager, previews } = fixture();
    await manager.start({ ...input, provider });
    await manager.shutdown();
    expect(await manager.get(input.requestId)).toMatchObject({ status: "cancelled", simulated: true, cleanupStatus: "complete" });
    expect(await manager.start({ ...input, provider })).toMatchObject({ requestId: input.requestId });
    await expect(manager.start({ ...input, provider, branch: "other" })).rejects.toThrow("different validation inputs");
    const restarted = new ExternalValidationManager(root, previews, new PreviewConfig(root), new FakeSystemAdapter());
    await restarted.recover();
    expect(await restarted.get(input.requestId)).toMatchObject({ simulated: true });
    expect(await restarted.get("unknown")).toBeNull();
    expect(await restarted.cancel("unknown")).toBeNull();
    await expect(restarted.artifact(input.requestId, "../../receipt.json")).rejects.toThrow("Artifact not found");
  });
}
test("restart keeps native cleanup uncertainty visible", async () => {
  const { root, manager } = fixture();
  await manager.start(input);
  await manager.shutdown();
  const directory = join(root, createHash("sha256").update(input.requestId).digest("hex"));
  mkdirSync(join(directory, "native-cleanup-obligations"));
  writeFileSync(join(directory, "native-cleanup-obligations", "session.json"), "{}");
  await manager.recover();
  expect(await manager.get(input.requestId)).toMatchObject({ cleanupStatus: "failed" });
});
test("rejects ambiguous scenarios and nonexact SHAs", () => {
  expect(startExternalValidationSchema.safeParse({ ...input, headSha: "abc" }).success).toBe(false);
  expect(startExternalValidationSchema.safeParse({ ...input, scenarios: [...input.scenarios, ...input.scenarios] }).success).toBe(false);
});

test("artifact reads verify digests and refuse oversized base64 without truncation", async () => {
  const { root, manager } = fixture();
  await manager.start(input); await manager.shutdown();
  const value = await manager.get(input.requestId);
  if (!value) throw new Error("Missing receipt");
  const directory = join(root, createHash("sha256").update(input.requestId).digest("hex"));
  const bytes = Buffer.alloc(384001);
  const id = createHash("sha256").update(bytes).digest("hex");
  value.artifacts = [{ id, name: "large.png", mimeType: "image/png", sha256: id }];
  writeFileSync(join(directory, id), bytes);
  writeFileSync(join(directory, "receipt.json"), JSON.stringify(value));
  await expect(manager.artifact(input.requestId, id)).rejects.toThrow("512000-character");
  const small = Buffer.from("retained evidence");
  const smallId = createHash("sha256").update(small).digest("hex");
  value.artifacts = [{ id: smallId, name: "observation.json", mimeType: "application/json", sha256: smallId }];
  writeFileSync(join(directory, smallId), small);
  writeFileSync(join(directory, "receipt.json"), JSON.stringify(value));
  expect((await manager.artifact(input.requestId, smallId)).artifact.contentBase64).toBe(small.toString("base64"));
  writeFileSync(join(directory, smallId), "corrupted");
  await expect(manager.artifact(input.requestId, smallId)).rejects.toThrow("digest mismatch");
});

test("simulated receipts never pass and incomplete cleanup prevents mission replacement", async () => {
  const { root, manager } = fixture();
  await manager.start(input); await manager.shutdown();
  const value = await manager.get(input.requestId);
  if (!value) throw new Error("Missing receipt");
  const directory = join(root, createHash("sha256").update(input.requestId).digest("hex"));
  value.status = "inconclusive"; value.error = null; value.sessionId = "independent"; value.deployedSha = value.headSha;
  value.results = [{ scenarioId: "one", status: "passed", summary: "Observed", actions: ["browser_snapshot"], observed: "Title visible", artifactIds: [] }];
  writeFileSync(join(directory, "receipt.json"), JSON.stringify(value));
  expect((await manager.get(input.requestId))?.status).toBe("inconclusive");
  value.cleanupStatus = "pending";
  writeFileSync(join(directory, "receipt.json"), JSON.stringify(value));
  await expect(manager.start({ ...input, requestId: "replacement" })).rejects.toThrow("finish cleanup");
});
