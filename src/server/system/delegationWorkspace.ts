import { createHash } from "node:crypto";
import { constants } from "node:fs";
import type { Stats } from "node:fs";
import { chmod, copyFile, cp, link, lstat, mkdir, mkdtemp, open, readFile, readdir, readlink, realpath, rename, rm, symlink } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, resolve, sep } from "node:path";

import { z } from "zod";

import type { ImplementationLotOptions, ImplementationRecoveryArchive, ImplementationRecoveryOptions } from "./types.ts";

interface WorktreeIdentity {
  canonicalPath: string;
  device: number;
  inode: number;
  head: string | null;
}

export interface ImplementationFailureDiagnostic {
  phase: "preparation" | "integration";
  reason: string;
  ticketId: string;
  label: string;
  cycleId: string | null;
  slotPath: string;
  workspacePath: string;
  journalPhase: string | null;
  expected: WorktreeIdentity | null;
  observed: WorktreeIdentity | null;
  timestamp: number;
  buildRevision: string | null;
}

export class DelegationWorkspaceError extends Error {
  constructor(message: string, readonly diagnostic: ImplementationFailureDiagnostic) {
    super(message);
    this.name = "DelegationWorkspaceError";
  }
}

export function implementationFailureDiagnostic(error: unknown): ImplementationFailureDiagnostic | null {
  return error instanceof DelegationWorkspaceError ? error.diagnostic : null;
}

function workspaceFailure(
  opts: ImplementationLotOptions,
  lot: LotSnapshot | null,
  phase: ImplementationFailureDiagnostic["phase"],
  reason: string,
  message: string,
  expected: WorktreeIdentity | null = null,
  observed: WorktreeIdentity | null = null,
): DelegationWorkspaceError {
  return new DelegationWorkspaceError(message, {
    phase, reason, ticketId: opts.ticketId, label: opts.label, cycleId: opts.cycleId ?? null,
    slotPath: opts.slotPath, workspacePath: workspacePath(opts), journalPhase: lot?.phase ?? null,
    expected, observed, timestamp: Date.now(), buildRevision: process.env.KANBAN_BUILD_REVISION ?? null,
  });
}

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
const ARCHIVE_DIRECTORY = ".implementation-recovery";
const ARCHIVE_MANIFEST = "manifest.json";
const ARCHIVE_CONTENT = "worktree";
const ARCHIVE_BUNDLE = "repository.bundle";
const ARCHIVE_JOURNAL = "journal.json";
const ARCHIVE_DIRECTORY_MODE = 0o700;

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

async function readdirIfExists(path: string): Promise<string[]> {
  return readdir(path).catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
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

async function archiveFingerprint(root: string): Promise<string> {
  const hash = createHash("sha256");
  async function visit(directory: string, relative: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (!relative && entry.name === ".git") continue;
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      const info = await lstat(join(root, path));
      hash.update(JSON.stringify([path, info.mode & FILE_MODE_MASK]));
      if (entry.isDirectory()) {
        hash.update("directory");
        await visit(join(root, path), path);
      } else {
        hash.update(JSON.stringify(await fileState(root, path)));
      }
    }
  }
  await visit(root, "");
  return hash.digest("hex");
}

async function copyArchiveContents(source: string, target: string): Promise<void> {
  await mkdir(target, { recursive: true });
  for (const entry of await readdir(source)) {
    if (entry === ".git") continue;
    await cp(join(source, entry), join(target, entry), { recursive: true, verbatimSymlinks: true });
  }
}

async function syncArchive(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await syncArchive(path);
    else if (entry.isFile()) {
      const file = await open(path, "r");
      try { await file.sync(); } finally { await file.close(); }
    }
  }
  const handle = await open(directory, "r");
  try { await handle.sync(); } finally { await handle.close(); }
}

async function verifyArchiveBundle(archivePath: string, expectedHead: string): Promise<void> {
  const verification = await mkdtemp(join(dirname(archivePath), "verification-"));
  try {
    await git(verification, ["init", "--bare"]);
    await git(verification, ["bundle", "verify", join(archivePath, ARCHIVE_BUNDLE)]);
    await git(verification, ["fetch", join(archivePath, ARCHIVE_BUNDLE), "HEAD"]);
    if ((await git(verification, ["rev-parse", "FETCH_HEAD"])).trim() !== expectedHead) {
      throw new Error("Le bundle ne contient pas le commit attendu ; nettoyage refusé.");
    }
    await git(verification, ["fsck", "--full"]);
  } finally {
    await rm(verification, { force: true, recursive: true });
  }
}

const archiveManifestSchema = z.object({
  ticketId: z.string(), label: z.string(), cycleId: z.string().optional(),
  originalWorkspace: z.string(), originalSlot: z.string(),
  journalHash: z.string().nullable(), contentFingerprint: z.string().nullable(),
  head: z.string().nullable(), createdAt: z.number(),
});

export async function restoreImplementationRecoveryArchive(archivePath: string, destination: string): Promise<void> {
  if (await lstatIfExists(destination)) throw new Error("La destination de restauration existe déjà.");
  const manifest = archiveManifestSchema.parse(JSON.parse(await readFile(join(archivePath, ARCHIVE_MANIFEST), "utf8")));
  if (!manifest.contentFingerprint || !manifest.head) throw new Error("Cette archive ne contient qu'un journal.");
  if (await archiveFingerprint(join(archivePath, ARCHIVE_CONTENT)) !== manifest.contentFingerprint) {
    throw new Error("Le contenu de l'archive a changé ; restauration refusée.");
  }
  await verifyArchiveBundle(archivePath, manifest.head);
  await git(dirname(destination), ["clone", "--no-checkout", join(archivePath, ARCHIVE_BUNDLE), destination]);
  await git(destination, ["checkout", "--detach", manifest.head]);
  for (const entry of await readdir(destination)) {
    if (entry !== ".git") await rm(join(destination, entry), { recursive: true, force: true });
  }
  await copyArchiveContents(join(archivePath, ARCHIVE_CONTENT), destination);
  if (await archiveFingerprint(destination) !== manifest.contentFingerprint) {
    throw new Error("La restauration ne correspond pas au contenu préservé.");
  }
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
    return this.withSlotLock(opts.slotPath, async () => {
      try {
        return await this.prepareUnlocked(opts);
      } catch (error) {
        if (error instanceof DelegationWorkspaceError) throw error;
        const phase = opts.recoveryOnly ? "integration" : "preparation";
        throw workspaceFailure(opts, null, phase, `${phase}_failed`, String(error));
      }
    });
  }

  private async prepareUnlocked(opts: ImplementationLotOptions): Promise<{ cwd: string; integrated?: boolean }> {
    validateScope(opts.files);
    const canonicalSlot = await realpath(opts.slotPath);
    const repoRoot = (await git(canonicalSlot, ["rev-parse", "--show-toplevel"])).trim();
    if (await realpath(repoRoot) !== canonicalSlot) throw new Error("Le lot doit partir de la racine du worktree du ticket.");
    const cwd = workspacePath(opts);
    if (this.lots.has(cwd)) throw new Error("Ce lot possède déjà un espace de travail actif.");
    const saved = await readJournal(opts);
    const phase = opts.recoveryOnly ? "integration" : "preparation";
    if (opts.recoveryOnly && !saved) {
      throw workspaceFailure(opts, null, phase, "recovery_journal_missing", "Journal du lot introuvable ; reprise de l'intégration refusée sans recréer le lot.");
    }
    this.cancelled.delete(cwd);
    if (saved) {
      await this.assertParent(opts, saved, phase);
      if (saved.phase !== "prepared") {
        await this.finishUnlocked(opts);
        return { cwd, integrated: true };
      }
      await this.assertWorkspace(opts, saved, phase);
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
    return this.withSlotLock(opts.slotPath, async () => {
      try {
        await this.finishUnlocked(opts);
      } catch (error) {
        if (error instanceof DelegationWorkspaceError) throw error;
        const lot = await readJournal(opts).catch(() => null);
        throw workspaceFailure(opts, lot, "integration", "integration_failed", String(error));
      }
    });
  }

  private async assertParent(opts: ImplementationLotOptions, lot: LotSnapshot, phase: ImplementationFailureDiagnostic["phase"] = "integration"): Promise<void> {
    const cwd = workspacePath(opts);
    if (this.cancelled.has(cwd)) throw new Error("Lot annulé pendant son intégration.");
    const canonicalSlot = await realpath(opts.slotPath);
    const info = await lstat(canonicalSlot);
    const head = await git(canonicalSlot, ["rev-parse", "HEAD"]).then((value) => value.trim()).catch(() => null);
    const expected = { canonicalPath: lot.canonicalSlot, device: lot.slotDevice, inode: lot.slotInode, head: lot.head };
    const observed = { canonicalPath: canonicalSlot, device: info.dev, inode: info.ino, head };
    if (canonicalSlot !== lot.canonicalSlot || info.dev !== lot.slotDevice || info.ino !== lot.slotInode) {
      throw workspaceFailure(opts, lot, phase, "parent_identity_mismatch", "Le worktree du ticket a été remplacé ; intégration refusée.", expected, observed);
    }
    if (head !== lot.head) throw workspaceFailure(opts, lot, phase, "parent_revision_mismatch", "Le commit du ticket a changé ; intégration refusée.", expected, observed);
  }

  private async assertWorkspace(opts: ImplementationLotOptions, lot: LotSnapshot, phase: ImplementationFailureDiagnostic["phase"] = "integration"): Promise<void> {
    const cwd = workspacePath(opts);
    const info = await lstat(cwd);
    const canonicalPath = await realpath(cwd);
    const childHead = await git(cwd, ["rev-parse", "HEAD"]).then((value) => value.trim()).catch(() => null);
    const expected = { canonicalPath: resolve(cwd), device: lot.workspaceDevice, inode: lot.workspaceInode, head: lot.head };
    const observed = { canonicalPath, device: info.dev, inode: info.ino, head: childHead };
    if (!info.isDirectory() || canonicalPath !== resolve(cwd)
      || info.dev !== lot.workspaceDevice || info.ino !== lot.workspaceInode) {
      throw workspaceFailure(opts, lot, phase, "child_identity_mismatch", "Le worktree du lot a été remplacé ; reprise refusée.", expected, observed);
    }
    if (childHead !== lot.head) {
      throw workspaceFailure(opts, lot, phase, "child_revision_mismatch", "Le commit de base a changé pendant le lot ; intégration refusée.", expected, observed);
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
      if (outside) throw workspaceFailure(opts, lot, "integration", "scope_violation", `Le lot a modifié un fichier hors de son périmètre : ${outside}`);
      const intended = new Map<string, FileState>();
      for (const path of changed) {
        const state = child.get(path);
        if (!state) throw new Error(`État du fichier ${path} introuvable.`);
        validateScopedSymlink(cwd, path, state);
        intended.set(path, state);
      }
      const recovering = lot.phase === "integrating";
      if (recovering && !sameSnapshot(intended, lot.integratedStates)) {
        throw workspaceFailure(opts, lot, "integration", "child_changed_during_integration", "Le lot a changé depuis le début de son intégration ; reprise refusée.");
      }
      for (const [path, state] of intended) {
        const previous = lot.baseline.get(path) ?? { kind: "missing", signature: "", mode: 0 };
        await ensureParentDirectory(opts.slotPath, path, false);
        const current = await fileState(opts.slotPath, path);
        if (!sameState(previous, current) && !(recovering && sameState(state, current))) {
          throw workspaceFailure(opts, lot, "integration", "parent_file_conflict", `Le fichier ${path} a changé dans le worktree du ticket ; intégration refusée.`);
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
    await this.preserveUnlocked({ slotPath, repoPath });
    const prefix = `${basename(slotPath)}${WORKSPACE_MARKER}`;
    const entries = await readdirIfExists(dirname(slotPath));
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
    await this.archiveWorkspace(cwd, opts.slotPath);
    await this.removeWorktree(opts.slotPath, cwd);
    await rm(`${cwd}${JOURNAL_SUFFIX}`, { force: true });
  }

  async preserve(opts: ImplementationRecoveryOptions): Promise<ImplementationRecoveryArchive[]> {
    return this.withSlotLock(opts.slotPath, () => this.preserveUnlocked(opts));
  }

  private async preserveUnlocked(opts: ImplementationRecoveryOptions): Promise<ImplementationRecoveryArchive[]> {
    const prefix = `${basename(opts.slotPath)}${WORKSPACE_MARKER}`;
    const identities = new Set<string>();
    for (const entry of await readdirIfExists(dirname(opts.slotPath))) {
      if (!entry.startsWith(prefix)) continue;
      const suffix = entry.slice(prefix.length);
      const identity = suffix.endsWith(JOURNAL_SUFFIX) ? suffix.slice(0, -JOURNAL_SUFFIX.length) : suffix;
      if (new RegExp(`^[a-f0-9]{${WORKSPACE_HASH_LENGTH}}$`).test(identity)) identities.add(identity);
    }
    const archives: ImplementationRecoveryArchive[] = [];
    for (const identity of identities) {
      const cwd = join(dirname(opts.slotPath), `${prefix}${identity}`);
      if (this.lots.has(cwd)) throw new Error("Un lot possède encore son espace de travail ; préservation refusée.");
      const archive = await this.archiveWorkspace(cwd, opts.slotPath);
      if (archive) archives.push(archive);
    }
    return archives;
  }

  private async archiveWorkspace(cwd: string, slotPath: string): Promise<ImplementationRecoveryArchive | null> {
    const workspaceInfo = await lstatIfExists(cwd);
    const journalInfo = await lstatIfExists(`${cwd}${JOURNAL_SUFFIX}`);
    if (!workspaceInfo && !journalInfo) return null;
    if (workspaceInfo && (!workspaceInfo.isDirectory() || workspaceInfo.isSymbolicLink())) {
      throw new Error("Espace de travail invalide ; nettoyage refusé pour préserver ses données.");
    }
    if (journalInfo && (!journalInfo.isFile() || journalInfo.isSymbolicLink())) {
      throw new Error("Journal invalide ; nettoyage refusé pour préserver ses données.");
    }
    const journal = journalInfo ? await readFile(`${cwd}${JOURNAL_SUFFIX}`) : null;
    const parsed = journal ? lotJournalSchema.safeParse(JSON.parse(journal.toString())) : null;
    if (parsed && !parsed.success) throw new Error("Journal illisible ; nettoyage refusé.");
    const identity = parsed?.success ? parsed.data : null;
    const contentFingerprint = workspaceInfo ? await archiveFingerprint(cwd) : null;
    const journalHash = journal ? createHash("sha256").update(journal).digest("hex") : null;
    const head = workspaceInfo ? (await git(cwd, ["rev-parse", "HEAD"])).trim() : null;
    const archiveKey = createHash("sha256").update(JSON.stringify([cwd, contentFingerprint, journalHash, head])).digest("hex");
    const root = join(dirname(slotPath), ARCHIVE_DIRECTORY);
    await mkdir(root, { recursive: true, mode: ARCHIVE_DIRECTORY_MODE });
    const rootInfo = await lstat(root);
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error("Répertoire d'archive invalide ; nettoyage refusé.");
    const archivePath = join(root, archiveKey);
    const manifest = {
      ticketId: identity?.ticketId ?? "unknown", label: identity?.label ?? basename(cwd), cycleId: identity?.cycleId,
      originalWorkspace: cwd, originalSlot: slotPath, journalHash, contentFingerprint, head, createdAt: Date.now(),
    };
    if (!await lstatIfExists(archivePath)) {
      const temporary = await mkdtemp(join(root, "pending-"));
      try {
        if (workspaceInfo) {
          await copyArchiveContents(cwd, join(temporary, ARCHIVE_CONTENT));
          await git(cwd, ["bundle", "create", join(temporary, ARCHIVE_BUNDLE), "HEAD"]);
          if (!head) throw new Error("Commit du lot introuvable ; nettoyage refusé.");
          await verifyArchiveBundle(temporary, head);
          if (await archiveFingerprint(join(temporary, ARCHIVE_CONTENT)) !== contentFingerprint
            || await archiveFingerprint(cwd) !== contentFingerprint
            || (await git(cwd, ["rev-parse", "HEAD"])).trim() !== head) {
            throw new Error("Le lot a changé pendant sa préservation ; nettoyage refusé.");
          }
        }
        if (journal) await Bun.write(join(temporary, ARCHIVE_JOURNAL), journal);
        await Bun.write(join(temporary, ARCHIVE_MANIFEST), JSON.stringify(manifest));
        await syncArchive(temporary);
        await rename(temporary, archivePath);
        const directory = await open(root, "r");
        try { await directory.sync(); } finally { await directory.close(); }
      } catch (error) {
        await rm(temporary, { force: true, recursive: true });
        throw error;
      }
    }
    const saved = archiveManifestSchema.parse(JSON.parse(await readFile(join(archivePath, ARCHIVE_MANIFEST), "utf8")));
    if (saved.contentFingerprint !== contentFingerprint || saved.journalHash !== journalHash
      || saved.originalWorkspace !== cwd || saved.originalSlot !== slotPath || saved.head !== head
      || (contentFingerprint && await archiveFingerprint(join(archivePath, ARCHIVE_CONTENT)) !== contentFingerprint)
      || (journalHash && createHash("sha256").update(await readFile(join(archivePath, ARCHIVE_JOURNAL))).digest("hex") !== journalHash)) {
      throw new Error("Archive non vérifiée ; nettoyage refusé.");
    }
    if (head) await verifyArchiveBundle(archivePath, head);
    if ((contentFingerprint && await archiveFingerprint(cwd) !== contentFingerprint)
      || (journalHash && createHash("sha256").update(await readFile(`${cwd}${JOURNAL_SUFFIX}`)).digest("hex") !== journalHash)) {
      throw new Error("Le lot a changé après sa préservation ; nettoyage refusé.");
    }
    return {
      ticketId: manifest.ticketId, label: manifest.label, cycleId: manifest.cycleId,
      archivePath, journalPath: journal ? join(archivePath, ARCHIVE_JOURNAL) : null, verified: true, unchanged: false,
    };
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
