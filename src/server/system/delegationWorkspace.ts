import { createHash } from "node:crypto";
import { constants } from "node:fs";
import type { Stats } from "node:fs";
import { chmod, copyFile, cp, link, lstat, mkdir, mkdtemp, open, readFile, readdir, readlink, realpath, rename, rm, symlink } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";

import { z } from "zod";

import type { ImplementationLotOptions } from "./types.ts";

interface FileState {
  kind: "file" | "symlink" | "missing";
  signature: string;
  mode: number;
}

interface LotSnapshot {
  head: string;
  baseline: Map<string, FileState>;
  canonicalSlot: string;
  slotDevice: number;
  slotInode: number;
  workspaceDevice: number;
  workspaceInode: number;
  phase: "prepared" | "integrating" | "integrated";
  integratedStates: Map<string, FileState>;
}

const WORKSPACE_MARKER = "-implementation-";
const WORKSPACE_HASH_LENGTH = 16;
const GIT_ERROR_LENGTH = 400;
const EXECUTABLE_MASK = 0o111;
const FILE_MODE_MASK = 0o777;
const DEPENDENCIES_DIR = "node_modules";
const ACTIVE_CLEANUP_WAIT_MS = 30_000;
const ACTIVE_CLEANUP_POLL_MS = 50;
const JOURNAL_SUFFIX = ".journal.json";
const JOURNAL_VERSION = 1;
const JOURNAL_FILE_MODE = 0o600;

function isValidRelativePath(path: string): boolean {
  return Boolean(path) && !isAbsolute(path) && !path.includes("\\")
    && !path.split("/").some((part) => !part || part === "." || part === ".." || part === ".git");
}

const fileStateSchema = z.object({
  kind: z.enum(["file", "symlink", "missing"]),
  signature: z.string(),
  mode: z.number().int().min(0).max(FILE_MODE_MASK),
});
const journalStatesSchema = z.array(z.tuple([z.string().refine(isValidRelativePath), fileStateSchema]))
  .refine((entries) => new Set(entries.map(([path]) => path)).size === entries.length);
const lotJournalSchema = z.object({
  version: z.literal(JOURNAL_VERSION),
  ticketId: z.string(),
  label: z.string(),
  cycleId: z.string().min(1).optional(),
  files: z.array(z.string().refine(isValidRelativePath)),
  head: z.string().regex(/^[a-f0-9]{40,64}$/),
  canonicalSlot: z.string(),
  slotDevice: z.number().int().nonnegative(),
  slotInode: z.number().int().nonnegative(),
  workspaceDevice: z.number().int().nonnegative(),
  workspaceInode: z.number().int().nonnegative(),
  phase: z.enum(["prepared", "integrating", "integrated"]),
  baseline: journalStatesSchema,
  integratedStates: journalStatesSchema,
});

async function writeJournal(opts: ImplementationLotOptions, lot: LotSnapshot): Promise<void> {
  const cwd = workspacePath(opts);
  const temporary = await mkdtemp(`${cwd}-journal-`);
  const temporaryPath = join(temporary, "journal.json");
  try {
    const file = await open(temporaryPath, "wx", JOURNAL_FILE_MODE);
    try {
      await file.writeFile(JSON.stringify({
        version: JOURNAL_VERSION,
        ticketId: opts.ticketId,
        label: opts.label,
        cycleId: opts.cycleId,
        files: opts.files,
        ...lot,
        baseline: [...lot.baseline],
        integratedStates: [...lot.integratedStates],
      }));
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temporaryPath, `${cwd}${JOURNAL_SUFFIX}`);
    const directory = await open(dirname(cwd), "r");
    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

async function readJournal(opts: ImplementationLotOptions): Promise<LotSnapshot | null> {
  const path = `${workspacePath(opts)}${JOURNAL_SUFFIX}`;
  const info = await lstatIfExists(path);
  if (!info) return null;
  if (!info.isFile() || info.isSymbolicLink()) throw new Error("Journal du lot invalide ; reprise refusée.");
  const journal = lotJournalSchema.parse(JSON.parse(await readFile(path, "utf8")));
  const scopes = [...opts.files].sort();
  if (journal.ticketId !== opts.ticketId || journal.label !== opts.label || journal.cycleId !== opts.cycleId
    || JSON.stringify([...journal.files].sort()) !== JSON.stringify(scopes)
    || journal.integratedStates.some(([path]) => !isWithinScope(path, opts.files))) {
    throw new Error("Le journal ne correspond pas au lot demandé ; reprise refusée.");
  }
  return {
    ...journal,
    baseline: new Map(journal.baseline),
    integratedStates: new Map(journal.integratedStates),
  };
}

function workspacePath(opts: ImplementationLotOptions): string {
  let key = `${opts.ticketId}\0${opts.label}`;
  if (opts.cycleId !== undefined) key += `\0${opts.cycleId}`;
  const identity = createHash("sha256").update(key).digest("hex").slice(0, WORKSPACE_HASH_LENGTH);
  return join(dirname(opts.slotPath), `${basename(opts.slotPath)}${WORKSPACE_MARKER}${identity}`);
}

function isWithinScope(path: string, scopes: string[]): boolean {
  return scopes.some((scope) => path === scope || path.startsWith(`${scope}/`));
}

function validateScope(scopes: string[]): void {
  if (scopes.length === 0 || scopes.some((scope) =>
    !isValidRelativePath(scope)
  )) {
    throw new Error("Périmètre de fichiers invalide pour la délégation isolée.");
  }
}

async function git(cwd: string, args: string[]): Promise<string> {
  const process = Bun.spawn(["git", "-C", cwd, ...args], { stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(`Git ${args[0] ?? ""} a échoué : ${(stderr || stdout).trim().slice(0, GIT_ERROR_LENGTH)}`);
  }
  return stdout;
}

async function listPaths(cwd: string): Promise<string[]> {
  const output = await git(cwd, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]);
  const paths = output.split("\0").filter(Boolean);
  for (const path of paths) {
    if (!isValidRelativePath(path)) {
      throw new Error(`Chemin Git invalide pour la délégation : ${path}`);
    }
  }
  return paths;
}

async function lstatIfExists(path: string): Promise<Stats | null> {
  return lstat(path).catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  });
}

async function fileState(root: string, path: string): Promise<FileState> {
  const absolutePath = join(root, path);
  const info = await lstatIfExists(absolutePath);
  if (!info) return { kind: "missing", signature: "", mode: 0 };
  if (info.isSymbolicLink()) {
    const target = await readlink(absolutePath);
    return { kind: "symlink", signature: target, mode: 0 };
  }
  if (!info.isFile()) throw new Error(`Chemin non pris en charge dans le lot : ${path}`);
  const content = await readFile(absolutePath);
  const executable = info.mode & EXECUTABLE_MASK ? 1 : 0;
  return {
    kind: "file",
    signature: `${createHash("sha256").update(content).digest("hex")}:${executable}`,
    mode: info.mode & FILE_MODE_MASK,
  };
}

function sameState(left: FileState, right: FileState): boolean {
  return left.kind === right.kind && left.signature === right.signature;
}

function sameSnapshot(left: Map<string, FileState>, right: Map<string, FileState>): boolean {
  if (left.size !== right.size) return false;
  for (const [path, state] of left) {
    const other = right.get(path);
    if (!other || !sameState(state, other)) return false;
  }
  return true;
}

async function snapshot(root: string, paths: Iterable<string>): Promise<Map<string, FileState>> {
  const states = new Map<string, FileState>();
  for (const path of paths) states.set(path, await fileState(root, path));
  return states;
}

async function ensureParentDirectory(root: string, path: string, create: boolean): Promise<void> {
  const segments = dirname(path).split(sep).filter((part) => part !== ".");
  let current = root;
  for (const segment of segments) {
    current = join(current, segment);
    const info = await lstatIfExists(current);
    if (info?.isSymbolicLink() || (info && !info.isDirectory())) {
      throw new Error(`Répertoire parent modifié pendant l'intégration : ${path}`);
    }
    if (!info && create) await mkdir(current);
  }
}

async function copyPath(sourceRoot: string, targetRoot: string, path: string, state: FileState): Promise<void> {
  const target = join(targetRoot, path);
  if (state.kind === "missing") {
    await ensureParentDirectory(targetRoot, path, false);
    await rm(target, { force: true, recursive: true });
    return;
  }
  await ensureParentDirectory(targetRoot, path, true);
  await rm(target, { force: true, recursive: true });
  if (state.kind === "symlink") {
    await symlink(state.signature, target);
    return;
  }
  await copyFile(join(sourceRoot, path), target);
  await chmod(target, state.mode);
}

async function validateDependencyLinks(root: string, directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      await validateDependencyLinks(root, absolutePath);
    } else if (entry.isSymbolicLink()) {
      const target = await readlink(absolutePath);
      const resolved = resolve(dirname(absolutePath), target);
      if (isAbsolute(target) || (resolved !== root && !resolved.startsWith(`${root}${sep}`))) {
        throw new Error(`Lien de dépendance sortant du worktree isolé : ${absolutePath}`);
      }
    }
  }
}

async function copyDependencies(source: string, destination: string): Promise<void> {
  const dependencies = join(source, DEPENDENCIES_DIR);
  const info = await lstatIfExists(dependencies);
  if (!info?.isDirectory()) return;
  const target = join(destination, DEPENDENCIES_DIR);
  try {
    await cp(dependencies, target, { recursive: true, mode: constants.COPYFILE_FICLONE_FORCE });
  } catch (error) {
    if (!(error instanceof Error && "code" in error && (
      error.code === "ENOTSUP" || error.code === "EOPNOTSUPP" || error.code === "EXDEV"
    ))) throw error;
    await rm(target, { recursive: true, force: true });
    await cp(dependencies, target, { recursive: true });
  }
  await validateDependencyLinks(destination, target);
}

async function validateScopePath(root: string, path: string): Promise<void> {
  let current = root;
  for (const segment of path.split("/")) {
    current = join(current, segment);
    const info = await lstatIfExists(current);
    if (info?.isSymbolicLink()) throw new Error(`Le périmètre traverse un lien symbolique : ${path}`);
  }
}

function validateScopedSymlink(root: string, path: string, state: FileState): void {
  if (state.kind !== "symlink") return;
  const target = resolve(dirname(join(root, path)), state.signature);
  if (isAbsolute(state.signature) || (target !== root && !target.startsWith(`${root}${sep}`))) {
    throw new Error(`Le périmètre contient un lien symbolique sortant du worktree : ${path}`);
  }
}

async function installStagedPath(stageRoot: string, targetRoot: string, path: string, state: FileState, replaceExisting: boolean): Promise<void> {
  if (state.kind === "missing") return;
  await ensureParentDirectory(targetRoot, path, true);
  const target = join(targetRoot, path);
  if (replaceExisting) {
    await rename(join(stageRoot, path), target);
    return;
  }
  if (state.kind === "symlink") {
    await symlink(state.signature, target);
  } else {
    await link(join(stageRoot, path), target);
  }
}

interface AppliedPath {
  path: string;
  state: FileState;
  previous: FileState;
}

async function integrateChanges(
  parent: string,
  childRoot: string,
  baseline: Map<string, FileState>,
  child: Map<string, FileState>,
  changed: string[],
  assertActive: () => Promise<void>,
): Promise<void> {
  const staging = await mkdtemp(join(dirname(parent), `${basename(parent)}-integration-`));
  const staged = join(staging, "new");
  const backups = join(staging, "old");
  const applied: AppliedPath[] = [];
  let preserveBackups = false;
  try {
    await mkdir(staged);
    await mkdir(backups);
    for (const path of changed) {
      const state = child.get(path);
      if (!state) throw new Error(`État du fichier ${path} introuvable.`);
      if (state.kind !== "missing") {
        await copyPath(childRoot, staged, path, state);
        if (!sameState(state, await fileState(staged, path))) {
          throw new Error(`Le fichier ${path} a changé pendant la préparation de l'intégration.`);
        }
      }
    }
    const removals = changed.filter((path) => child.get(path)?.kind === "missing").sort((a, b) => b.length - a.length);
    const additions = changed.filter((path) => child.get(path)?.kind !== "missing").sort((a, b) => a.length - b.length);
    for (const path of [...removals, ...additions]) {
      await assertActive();
      const previous = baseline.get(path) ?? { kind: "missing", signature: "", mode: 0 };
      const state = child.get(path);
      if (!state) throw new Error(`État du fichier ${path} introuvable.`);
      const current = await fileState(parent, path);
      if (sameState(current, state)) continue;
      if (!sameState(previous, current)) {
        throw new Error(`Le fichier ${path} a changé dans le worktree du ticket ; intégration refusée.`);
      }
      await ensureParentDirectory(parent, path, state.kind !== "missing");
      if (previous.kind !== "missing") {
        await ensureParentDirectory(backups, path, true);
        if (state.kind === "missing") {
          await rename(join(parent, path), join(backups, path));
        } else {
          await copyPath(parent, backups, path, previous);
        }
      }
      applied.push({ path, state, previous });
      await assertActive();
      if (state.kind !== "missing" && !sameState(previous, await fileState(parent, path))) {
        throw new Error(`Le fichier ${path} a changé dans le worktree du ticket ; intégration refusée.`);
      }
      await installStagedPath(staged, parent, path, state, previous.kind !== "missing");
      await assertActive();
    }
  } catch (error) {
    for (const item of applied.reverse()) {
      const current = await fileState(parent, item.path).catch(() => null);
      if (current && sameState(current, item.previous)) continue;
      if (!current || (current.kind !== "missing" && !sameState(current, item.state))) {
        preserveBackups = true;
        continue;
      }
      try {
        if (item.previous.kind !== "missing") {
          await ensureParentDirectory(parent, item.path, true);
          await rename(join(backups, item.path), join(parent, item.path));
        } else {
          await rm(join(parent, item.path), { force: true, recursive: true });
        }
      } catch {
        preserveBackups = true;
      }
    }
    if (preserveBackups) throw new Error(`Intégration interrompue ; sauvegarde conservée dans ${staging}. Cause : ${String(error)}`);
    throw error;
  } finally {
    if (!preserveBackups) await rm(staging, { force: true, recursive: true });
  }
}

export class DelegationWorkspace {
  private readonly lots = new Map<string, LotSnapshot>();
  private readonly locks = new Map<string, Promise<void>>();
  private readonly cancelled = new Set<string>();

  private async withSlotLock<T>(slotPath: string, action: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(slotPath) ?? Promise.resolve();
    let release = (): void => {};
    const current = new Promise<void>((resolveCurrent) => { release = resolveCurrent; });
    const tail = previous.then(() => current);
    this.locks.set(slotPath, tail);
    await previous;
    try {
      return await action();
    } finally {
      release();
      if (this.locks.get(slotPath) === tail) this.locks.delete(slotPath);
    }
  }

  async prepare(opts: ImplementationLotOptions): Promise<{ cwd: string; integrated?: boolean }> {
    return this.withSlotLock(opts.slotPath, () => this.prepareUnlocked(opts));
  }

  private async prepareUnlocked(opts: ImplementationLotOptions): Promise<{ cwd: string; integrated?: boolean }> {
    validateScope(opts.files);
    this.cancelled.delete(workspacePath(opts));
    const canonicalSlot = await realpath(opts.slotPath);
    const repoRoot = (await git(canonicalSlot, ["rev-parse", "--show-toplevel"])).trim();
    if (await realpath(repoRoot) !== canonicalSlot) throw new Error("Le lot doit partir de la racine du worktree du ticket.");
    const cwd = workspacePath(opts);
    if (this.lots.has(cwd)) throw new Error("Ce lot possède déjà un espace de travail actif.");
    const saved = await readJournal(opts);
    if (saved) {
      await this.assertParent(opts, saved);
      if (saved.phase !== "prepared") {
        await this.finishUnlocked(opts);
        return { cwd, integrated: true };
      }
      await this.assertWorkspace(opts, saved);
      this.lots.set(cwd, saved);
      return { cwd };
    }
    if (await lstatIfExists(cwd)) {
      throw new Error("Un espace de travail sans journal existe pour ce lot ; reprise refusée pour préserver ses modifications.");
    }
    const head = (await git(canonicalSlot, ["rev-parse", "HEAD"])).trim();
    const slotInfo = await lstat(canonicalSlot);
    try {
      await git(canonicalSlot, ["worktree", "add", "--detach", cwd, head]);
      const parentPaths = await listPaths(canonicalSlot);
      const childPaths = await listPaths(cwd);
      const paths = new Set([...parentPaths, ...childPaths]);
      const baseline = await snapshot(canonicalSlot, paths);
      const childBaseline = await snapshot(cwd, paths);
      for (const path of paths) {
        const source = baseline.get(path);
        const target = childBaseline.get(path);
        if (source && target && !sameState(source, target)) await copyPath(canonicalSlot, cwd, path, source);
      }
      for (const scope of opts.files) await validateScopePath(canonicalSlot, scope);
      for (const [path, state] of baseline) {
        if (isWithinScope(path, opts.files)) validateScopedSymlink(canonicalSlot, path, state);
      }
      await copyDependencies(canonicalSlot, cwd);
      const currentParentPaths = new Set(await listPaths(canonicalSlot));
      if (currentParentPaths.size !== parentPaths.length || parentPaths.some((path) => !currentParentPaths.has(path))) {
        throw new Error("Le worktree du ticket a changé pendant la préparation du lot.");
      }
      const currentParent = await snapshot(canonicalSlot, paths);
      const currentChild = await snapshot(cwd, paths);
      if (!sameSnapshot(baseline, currentParent) || !sameSnapshot(baseline, currentChild)) {
        throw new Error("Le code a changé pendant la préparation du lot.");
      }
      if (this.cancelled.has(cwd)) throw new Error("Lot annulé pendant sa préparation.");
      const workspaceInfo = await lstat(cwd);
      const lot: LotSnapshot = {
        head, baseline, canonicalSlot, slotDevice: slotInfo.dev, slotInode: slotInfo.ino,
        workspaceDevice: workspaceInfo.dev, workspaceInode: workspaceInfo.ino,
        phase: "prepared", integratedStates: new Map(),
      };
      await writeJournal(opts, lot);
      this.lots.set(cwd, lot);
      return { cwd };
    } catch (error) {
      await this.cleanup(opts);
      throw error;
    }
  }

  async finish(opts: ImplementationLotOptions): Promise<void> {
    return this.withSlotLock(opts.slotPath, () => this.finishUnlocked(opts));
  }

  private async assertParent(opts: ImplementationLotOptions, lot: LotSnapshot): Promise<void> {
    const cwd = workspacePath(opts);
    if (this.cancelled.has(cwd)) throw new Error("Lot annulé pendant son intégration.");
    const canonicalSlot = await realpath(opts.slotPath);
    const info = await lstat(canonicalSlot);
    if (canonicalSlot !== lot.canonicalSlot || info.dev !== lot.slotDevice || info.ino !== lot.slotInode) {
      throw new Error("Le worktree du ticket a été remplacé ; intégration refusée.");
    }
    const head = (await git(canonicalSlot, ["rev-parse", "HEAD"])).trim();
    if (head !== lot.head) throw new Error("Le commit du ticket a changé ; intégration refusée.");
  }

  private async assertWorkspace(opts: ImplementationLotOptions, lot: LotSnapshot): Promise<void> {
    const cwd = workspacePath(opts);
    const info = await lstat(cwd);
    if (!info.isDirectory() || await realpath(cwd) !== resolve(cwd)
      || info.dev !== lot.workspaceDevice || info.ino !== lot.workspaceInode) {
      throw new Error("Le worktree du lot a été remplacé ; reprise refusée.");
    }
    const childHead = (await git(cwd, ["rev-parse", "HEAD"])).trim();
    if (childHead !== lot.head) {
      throw new Error("Le commit de base a changé pendant le lot ; intégration refusée.");
    }
  }

  private async finishUnlocked(opts: ImplementationLotOptions): Promise<void> {
    validateScope(opts.files);
    const cwd = workspacePath(opts);
    const lot = await readJournal(opts);
    if (!lot) throw new Error("Espace de travail du lot introuvable.");
    let completed = false;
    try {
      await this.assertParent(opts, lot);
      if (lot.phase === "integrated") {
        if (await lstatIfExists(cwd)) await this.assertWorkspace(opts, lot);
        for (const [path, state] of lot.integratedStates) {
          await ensureParentDirectory(opts.slotPath, path, false);
          if (!sameState(state, await fileState(opts.slotPath, path))) {
            throw new Error(`Le fichier ${path} a changé après l'intégration du lot ; reprise refusée.`);
          }
        }
        completed = true;
        return;
      }
      await this.assertWorkspace(opts, lot);
      const paths = new Set([...lot.baseline.keys(), ...await listPaths(cwd)]);
      const child = await snapshot(cwd, paths);
      const changed = [...paths].filter((path) => {
        const previous = lot.baseline.get(path) ?? { kind: "missing", signature: "", mode: 0 };
        const current = child.get(path);
        return current !== undefined && !sameState(previous, current);
      });
      const outside = changed.find((path) => !isWithinScope(path, opts.files));
      if (outside) throw new Error(`Le lot a modifié un fichier hors de son périmètre : ${outside}`);
      const intended = new Map<string, FileState>();
      for (const path of changed) {
        const state = child.get(path);
        if (!state) throw new Error(`État du fichier ${path} introuvable.`);
        validateScopedSymlink(cwd, path, state);
        intended.set(path, state);
      }
      const recovering = lot.phase === "integrating";
      if (recovering && !sameSnapshot(intended, lot.integratedStates)) {
        throw new Error("Le lot a changé depuis le début de son intégration ; reprise refusée.");
      }
      for (const [path, state] of intended) {
        const previous = lot.baseline.get(path) ?? { kind: "missing", signature: "", mode: 0 };
        await ensureParentDirectory(opts.slotPath, path, false);
        const current = await fileState(opts.slotPath, path);
        if (!sameState(previous, current) && !(recovering && sameState(state, current))) {
          throw new Error(`Le fichier ${path} a changé dans le worktree du ticket ; intégration refusée.`);
        }
      }
      lot.phase = "integrating";
      lot.integratedStates = intended;
      await writeJournal(opts, lot);
      if (changed.length > 0) {
        await integrateChanges(opts.slotPath, cwd, lot.baseline, child, changed, () => this.assertParent(opts, lot));
      }
      lot.phase = "integrated";
      await writeJournal(opts, lot);
      completed = true;
    } finally {
      this.lots.delete(cwd);
      if (completed) await this.removeWorktree(opts.slotPath, cwd);
    }
  }

  async discard(opts: ImplementationLotOptions): Promise<void> {
    const cwd = workspacePath(opts);
    this.cancelled.add(cwd);
    await this.withSlotLock(opts.slotPath, async () => {
      this.lots.delete(cwd);
      await this.cleanup(opts);
    });
  }

  cancel(opts: ImplementationLotOptions): void {
    const cwd = workspacePath(opts);
    this.cancelled.add(cwd);
    this.lots.delete(cwd);
  }

  async cleanupForSlot(slotPath: string, repoPath: string): Promise<void> {
    const deadline = Date.now() + ACTIVE_CLEANUP_WAIT_MS;
    while ([...this.lots.keys()].some((cwd) => cwd.startsWith(`${slotPath}${WORKSPACE_MARKER}`))) {
      if (Date.now() >= deadline) throw new Error(`Des lots d'implémentation sont encore actifs dans ${slotPath}.`);
      await new Promise<void>((resolveWait) => setTimeout(resolveWait, ACTIVE_CLEANUP_POLL_MS));
    }
    await this.withSlotLock(slotPath, async () => {
      if ([...this.lots.keys()].some((cwd) => cwd.startsWith(`${slotPath}${WORKSPACE_MARKER}`))) {
        throw new Error(`Des lots d'implémentation sont encore actifs dans ${slotPath}.`);
      }
      await this.cleanupSlotWorktrees(slotPath, repoPath);
    });
  }

  private async cleanupSlotWorktrees(slotPath: string, repoPath: string): Promise<void> {
    const prefix = `${basename(slotPath)}${WORKSPACE_MARKER}`;
    const entries = await readdir(dirname(slotPath));
    const visited = new Set<string>();
    for (const entry of entries) {
      if (!entry.startsWith(prefix)) continue;
      const hash = entry.slice(prefix.length);
      const identity = hash.endsWith(JOURNAL_SUFFIX) ? hash.slice(0, -JOURNAL_SUFFIX.length) : hash;
      if (!new RegExp(`^[a-f0-9]{${WORKSPACE_HASH_LENGTH}}$`).test(identity)) continue;
      if (visited.has(identity)) continue;
      visited.add(identity);
      const cwd = join(dirname(slotPath), `${prefix}${identity}`);
      this.lots.delete(cwd);
      await this.removeWorktree(slotPath, cwd, repoPath);
      await rm(`${cwd}${JOURNAL_SUFFIX}`, { force: true });
    }
  }

  private async cleanup(opts: ImplementationLotOptions): Promise<void> {
    const cwd = workspacePath(opts);
    await this.removeWorktree(opts.slotPath, cwd);
    await rm(`${cwd}${JOURNAL_SUFFIX}`, { force: true });
  }

  private async removeWorktree(slotPath: string, cwd: string, repoPath = slotPath): Promise<void> {
    try {
      await git(slotPath, ["worktree", "remove", "--force", cwd]);
    } catch {
      await rm(cwd, { force: true, recursive: true });
      await git(repoPath, ["worktree", "prune"]);
    }
  }
}
