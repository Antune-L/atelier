import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

import { nvmNodeBinDir } from "./nvmNode.ts";

/** Escape a literal shell argument, including paths containing quotes and dollar signs. */
function shellLiteral(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

/** Preserve user startup files, then restore the project's Node after their PATH changes. */
export async function prepareProjectShell(cwd: string): Promise<string | null> {
  const nodeBin = nvmNodeBinDir(cwd);
  if (!nodeBin) return null;
  const original = process.env.ZDOTDIR ?? homedir();
  const directory = await mkdtemp(join(tmpdir(), "kanban-shell-"));
  try {
    for (const file of [".zshenv", ".zprofile", ".zshrc", ".zlogin", ".zlogout"]) {
      const source = shellLiteral(join(original, file));
      const contents = [
        `export ZDOTDIR=${shellLiteral(original)}`,
        `if [[ -r ${source} ]]; then source ${source}; fi`,
        `export ZDOTDIR=${shellLiteral(directory)}`,
        `export PATH=${shellLiteral(nodeBin)}:"$PATH"`,
        "",
      ].join("\n");
      await writeFile(join(directory, file), contents, { mode: 0o600 });
    }
    return directory;
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}
