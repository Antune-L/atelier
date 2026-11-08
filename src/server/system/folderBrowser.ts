import { readdir, realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";

import type { FolderListing } from "../../shared/folderBrowser.ts";

const HOME_PREFIX = "~/";
const GIT_DIRECTORY = ".git";

export async function browseFolders(input: string): Promise<FolderListing> {
  let target = input.trim();
  if (target === "" || target === "~") target = homedir();
  else if (target.startsWith(HOME_PREFIX)) target = join(homedir(), target.slice(HOME_PREFIX.length));
  if (!isAbsolute(target)) throw new Error("Le chemin doit être absolu.");
  const path = await realpath(target);
  const children = await readdir(path, { withFileTypes: true });
  const entries = await Promise.all(children.map(async (entry) => {
    if (entry.name === GIT_DIRECTORY) return null;
    const childPath = join(path, entry.name);
    if (entry.isDirectory()) return { name: entry.name, path: childPath };
    if (entry.isSymbolicLink() && await stat(childPath).then((value) => value.isDirectory(), () => false)) {
      return { name: entry.name, path: childPath };
    }
    return null;
  }));
  const parent = dirname(path);
  return {
    path,
    parent: parent === path ? null : parent,
    entries: entries.filter((entry) => entry !== null).sort((left, right) => left.name.localeCompare(right.name)),
  };
}
