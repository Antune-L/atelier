import { expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { envWithProjectNode } from "./nvmNode.ts";
import { prepareProjectShell } from "./projectShell.ts";

test("project Node survives shell startup, and missing versions/aliases fail explicitly", async () => {
  const directory = await mkdtemp(join(tmpdir(), "kanban-node-test-"));
  const oldNvm = process.env.NVM_DIR;
  const oldZdot = process.env.ZDOTDIR;
  let startup: string | null = null;
  try {
    const nvm = join(directory, "nvm with spaces");
    const bin = join(nvm, "versions/node/v22.1.0/bin");
    await mkdir(bin, { recursive: true });
    await writeFile(join(bin, "node"), "#!/bin/sh\necho v22.1.0\n", { mode: 0o755 });
    await writeFile(join(directory, ".nvmrc"), "22\n");
    await writeFile(join(directory, ".zshrc"), 'export PATH="/usr/bin:/bin"\n');
    process.env.NVM_DIR = nvm;
    process.env.ZDOTDIR = directory;
    expect(envWithProjectNode(directory).PATH?.startsWith(`${bin}:`)).toBe(true);
    startup = await prepareProjectShell(directory);
    if (!startup) throw new Error("Missing project shell startup files");
    const shell = Bun.spawn(["zsh", "-lic", "node --version"], {
      cwd: directory, env: { ...process.env, ZDOTDIR: startup }, stdout: "pipe", stderr: "pipe",
    });
    const [output, , code] = await Promise.all([new Response(shell.stdout).text(), new Response(shell.stderr).text(), shell.exited]);
    expect(code).toBe(0);
    expect(output.trim()).toBe("v22.1.0");
    await writeFile(join(directory, ".nvmrc"), "24");
    expect(() => envWithProjectNode(directory)).toThrow("installer cette version");
    await writeFile(join(directory, ".nvmrc"), "lts/*");
    expect(() => envWithProjectNode(directory)).toThrow("Alias .nvmrc");
  } finally {
    if (oldNvm === undefined) delete process.env.NVM_DIR;
    else process.env.NVM_DIR = oldNvm;
    if (oldZdot === undefined) delete process.env.ZDOTDIR;
    else process.env.ZDOTDIR = oldZdot;
    if (startup) await rm(startup, { recursive: true, force: true });
    await rm(directory, { recursive: true, force: true });
  }
});
