import { z } from "zod";

import { adoptionShaSchema } from "../src/shared/providerAdoption.ts";
import { lockedProviderVersions, providerVersionsSchema } from "../src/shared/providerUpdates.ts";

const stable = z.string().regex(/^\d+\.\d+\.\d+$/);
const providers = providerVersionsSchema.parse({ claude: stable.parse(process.env.CLAUDE_VERSION), codex: stable.parse(process.env.CODEX_VERSION) });
const base = adoptionShaSchema.parse(process.env.ADOPTION_BASE);
async function command(args: string[]): Promise<string> {
  const child = Bun.spawn(args, { stdout: "pipe", stderr: "inherit" });
  const output = await new Response(child.stdout).text();
  if (await child.exited !== 0) throw new Error(`Candidate preparation failed: ${args[0]}`);
  return output.trim();
}
if (await command(["git", "rev-parse", "HEAD"]) !== base) throw new Error("Preparation base moved.");
const old = lockedProviderVersions(await Bun.file("bun.lock").text());
if (old.claude === providers.claude && old.codex === providers.codex) throw new Error("Unchanged graph is not adoption.");
const manifest = z.object({ dependencies: z.record(z.string(), z.string()) }).passthrough().parse(await Bun.file("package.json").json());
manifest.dependencies["@anthropic-ai/claude-agent-sdk"] = providers.claude;
manifest.dependencies["@openai/codex-sdk"] = providers.codex;
await Bun.write("package.json", `${JSON.stringify(manifest, null, 2)}\n`);
for (const [path, constant, version] of [
  ["src/server/system/claudeBinary.ts", "CLAUDE_SDK_VERSION", providers.claude],
  ["src/server/system/codexBinary.ts", "CODEX_SDK_VERSION", providers.codex],
]) {
  if (!path || !constant || !version) throw new Error("Incomplete provider pin.");
  const text = await Bun.file(path).text();
  const pattern = new RegExp(`export const ${constant} = "[^"\\n]+";`);
  if (!pattern.test(text)) throw new Error("Native pin declaration missing.");
  await Bun.write(path, text.replace(pattern, `export const ${constant} = "${version}";`));
}
await command(["bun", "install"]);
const locked = lockedProviderVersions(await Bun.file("bun.lock").text());
if (JSON.stringify(locked) !== JSON.stringify(providers)) throw new Error("Candidate lock mismatch.");
const allowed = new Set(["package.json", "bun.lock", "src/server/system/claudeBinary.ts", "src/server/system/codexBinary.ts"]);
const changes = (await command(["git", "diff", "--name-only"])).split("\n");
if (changes.some((path) => !allowed.has(path))) throw new Error("Candidate escaped its dependency scope.");
await command(["bun", "test", "src/shared/pricing.test.ts"]);
console.log("Known-model pricing regression checked; upstream tariff freshness was not asserted.");
