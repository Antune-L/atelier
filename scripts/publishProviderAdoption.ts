import { createPrivateKey, sign } from "node:crypto";
import { readdir } from "node:fs/promises";

import { z } from "zod";

import { adoptionReceiptSchema, adoptionShaSchema } from "../src/shared/providerAdoption.ts";
import { compareAppVersions } from "../src/shared/desktopUpdate.ts";
import { lockedProviderVersions, providerVersionSchema } from "../src/shared/providerUpdates.ts";
import { AdoptionRequestError, adoptionApi } from "../src/server/system/providerAdoptionTransport.ts";

async function command(args: string[]): Promise<string> {
  const child = Bun.spawn(args, { stdout: "pipe", stderr: "inherit" });
  const output = await new Response(child.stdout).text();
  if (await child.exited !== 0) throw new Error(`Publication failed: ${args[0]}`);
  return output.trim();
}
const runId = z.coerce.number().int().positive().parse(process.env.GITHUB_RUN_ID);
const base = adoptionShaSchema.parse(process.env.ADOPTION_BASE);
const revision = adoptionShaSchema.parse(await command(["git", "rev-parse", "HEAD"]));
const providers = lockedProviderVersions(await Bun.file("bun.lock").text());
if (providers.claude !== process.env.CLAUDE_VERSION || providers.codex !== process.env.CODEX_VERSION) throw new Error("Publication graph mismatch.");
const lockSha256 = new Bun.CryptoHasher("sha256").update(await Bun.file("bun.lock").arrayBuffer()).digest("hex");
const qualificationEvidence = await Promise.all(["ubuntu-latest", "macos-15"].map(async (platform) => {
  const file = Bun.file(`qualification/qualification-${platform}/qualification.json`);
  const result = z.object({ revision: z.literal(revision), lockSha256: z.literal(lockSha256), adoptionContracts: z.literal("passed"), claudeRecovery: z.literal("passed"), codexRecovery: z.literal("passed"), nativeHashes: z.object({ claude: z.string().regex(/^[a-f0-9]{64}$/), codex: z.string().regex(/^[a-f0-9]{64}$/) }), cleanup: z.literal("closed"), claude: z.object({ status: z.literal("passed") }), codex: z.object({ status: z.literal("passed") }) }).parse(await file.json());
  return { evidenceSha256: new Bun.CryptoHasher("sha256").update(await file.arrayBuffer()).digest("hex"), nativeHashes: result.nativeHashes };
}));
const qualifications = { linux: qualificationEvidence[0], mac: qualificationEvidence[1] };
const names = await readdir("release");
const required = [`Atelier-v0.1.${runId}-arm64.app.zip`, `Atelier-v0.1.${runId}-arm64.dmg`, "atelier-macos-arm64.json"];
if (required.some((name) => !names.includes(name))) throw new Error("Required Mac artifact missing.");
const artifacts = await Promise.all(names.filter((name) => !name.endsWith(".sha256")).map(async (name) => ({ name, sha256: new Bun.CryptoHasher("sha256").update(await Bun.file(`release/${name}`).arrayBuffer()).digest("hex") })));
const receipt = adoptionReceiptSchema.parse({ protocol: 1, requestId: process.env.ADOPTION_REQUEST_ID, runId, base, revision, version: `0.1.${runId}`, providers, lockSha256, qualifications, gates: { linux: "passed", mac: "passed", static: "passed" }, artifacts });
const key = createPrivateKey(z.string().min(1).parse(process.env.ATELIER_UPDATE_SIGNING_KEY));
if (key.asymmetricKeyType !== "ed25519") throw new Error("Publisher key must be Ed25519.");
const payload = JSON.stringify(receipt);
await Bun.write("release/provider-adoption.json", JSON.stringify({ payload, signature: sign(null, Buffer.from(payload), key).toString("base64") }));
try {
  const latest = z.object({ tag_name: z.string() }).parse(await adoptionApi("releases/latest", z.string().min(1).parse(process.env.GH_TOKEN)));
  if (!latest.tag_name.startsWith("v") || compareAppVersions(receipt.version, providerVersionSchema.parse(latest.tag_name.slice(1))) <= 0) throw new Error("Candidate version does not advance the published application. Review the adoption release version policy before promotion.");
} catch (error) {
  if (!(error instanceof AdoptionRequestError && error.status === 404)) throw error;
}
await command(["git", "fetch", "origin", "main"]);
if (await command(["git", "rev-parse", "origin/main"]) !== base) throw new Error("Main advanced; candidate cannot be promoted.");
await command(["git", "push", "origin", `${revision}:refs/heads/main`]);
await command(["gh", "release", "create", `v${receipt.version}`, "--target", revision, "--title", `Atelier v${receipt.version}`, "--notes-file", "release/provider-adoption.json", "--latest", ...names.map((name) => `release/${name}`), "release/provider-adoption.json"]);
