import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const VPS_DIR = join(import.meta.dir, "../../../deploy/vps");
const RELEASE = join(VPS_DIR, "kanban-release.sh");
const UPGRADE = join(VPS_DIR, "kanban-upgrade.sh");
const SCRIPTS = [RELEASE, UPGRADE];
const SHA = "0123456789abcdef0123456789abcdef01234567";
const EXIT_USAGE = 64;

async function runBash(args: string[]): Promise<{ code: number; stderr: string }> {
  const child = Bun.spawn(["bash", ...args], { stdout: "pipe", stderr: "pipe" });
  const [, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  return { code, stderr };
}

describe("VPS deploy scripts", () => {
  test.each(SCRIPTS)("%s parses with bash -n", async (script) => {
    expect(await runBash(["-n", script])).toEqual({ code: 0, stderr: "" });
  });

  test.skipIf(Bun.which("shellcheck") === null).each(SCRIPTS)("%s passes shellcheck", async (script) => {
    const child = Bun.spawn(["shellcheck", script], { stdout: "pipe", stderr: "pipe" });
    const [output, , code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    expect(output).toBe("");
    expect(code).toBe(0);
  });

  test.each([
    [RELEASE, []],
    [RELEASE, ["abc"]],
    [RELEASE, ["--build-only"]],
    [RELEASE, ["--build-only", SHA, "extra"]],
    [UPGRADE, ["--sha"]],
    [UPGRADE, ["--sha", "abc"]],
    [UPGRADE, ["--unknown"]],
  ])("%s %p is refused as bad usage", async (script, args) => {
    expect((await runBash([script, ...args])).code).toBe(EXIT_USAGE);
  });

  test.skipIf(process.getuid?.() === 0).each([
    [RELEASE, [SHA]],
    [RELEASE, ["--build-only", SHA]],
    [UPGRADE, ["--sha", SHA, "--force"]],
  ])("%s %p refuses to run without root", async (script, args) => {
    const result = await runBash([script, ...args]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("run as root");
  });
});
