/**
 * Admission of analyses of remote cards (created through the remote MCP listener): one remote
 * analysis at a time, the analysis engine, and the image copies placed in the run's isolated
 * workspace.
 */

import { copyFile, mkdir, realpath, stat } from "node:fs/promises";
import { basename, extname, isAbsolute, join, relative } from "node:path";

import type { Orchestrator } from "../../shared/constants.ts";
import type { Ticket } from "../../shared/schemas.ts";
import { isRemoteTicket } from "../../shared/startBlocker.ts";
import { PROJECT_ROOT } from "../config.ts";
import type { KeyedMutex } from "../mutex.ts";
import { ensureCodexConfinedSandbox } from "../remoteMcp/sandboxMonitor.ts";
import { UPLOADS_DIR } from "../uploads.ts";

import { prepareAnalysisWorkspace, releaseAnalysisWorkspace } from "./analysisWorkspace.ts";
import type { AnalysisSystem } from "./analysisWorkspace.ts";

const COPIED_IMAGES_DIR = ".kanban-remote-images";
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);
const IMAGE_REFERENCE_PATTERN = /\/[^\s"'<>()[\]]+\.(?:png|jpe?g|gif|webp)/gi;
const UPLOADS_URL_PREFIX = `/${UPLOADS_DIR}/`;
const MAX_COPIED_IMAGES = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** A refused remote analysis (failed sandbox probe): final for this attempt, never retried. */
export class RemoteAnalysisRefusedError extends Error {}

/** Remote cards reformulate and split on their analysis engine, never on a later-edited orchestrator. */
export function withRemoteAnalysisEngine(ticket: Ticket): Ticket {
  if (!isRemoteTicket(ticket)) return ticket;
  return { ...ticket, orchestrator: ticket.feasibilityEngine ?? ticket.orchestrator };
}

const waiters: Array<() => void> = [];
let busy = false;

/** FIFO lock: one remote analysis runs at a time across every analysis path. */
function acquireRemoteAnalysisSlot(): Promise<() => void> {
  return new Promise((resolve) => {
    const grant = (): void => {
      busy = true;
      let released = false;
      resolve(() => {
        if (released) return;
        released = true;
        busy = false;
        waiters.shift()?.();
      });
    };
    if (busy) waiters.push(grant);
    else grant();
  });
}

/**
 * Admit one real analysis attempt of a remote card: waits for the single remote slot, runs a Codex
 * attempt only once the confined sandbox probe passed (waiting for or running it). Returns the slot
 * release, to call when the attempt settles; throws a French message when refused.
 */
export async function admitRemoteAnalysis(provider: Orchestrator): Promise<() => void> {
  const release = await acquireRemoteAnalysisSlot();
  try {
    if (provider === "codex" && !(await ensureCodexConfinedSandbox())) {
      throw new RemoteAnalysisRefusedError("Analyse distante refusée : le bac à sable Codex confiné n'est pas vérifié (vérification échouée ou impossible).");
    }
    return release;
  } catch (error) {
    release();
    throw error;
  }
}

export interface RemoteAnalysisCopy {
  cwd: string;
  release(): void;
}

export interface RemoteAnalysisCopyInput {
  system: AnalysisSystem;
  repoMutex: KeyedMutex;
  provider: Orchestrator;
  repoPath: string;
  baseBranch: string;
  key: string;
}

/**
 * Admit a remote analysis, then prepare its own isolated copy of the repository (never the shared
 * snapshot or the main checkout). `release` frees the copy and the remote slot.
 */
export async function acquireRemoteAnalysisCopy(input: RemoteAnalysisCopyInput): Promise<RemoteAnalysisCopy> {
  const { system, repoMutex, provider, repoPath, baseBranch, key } = input;
  const releaseRemote = await admitRemoteAnalysis(provider);
  try {
    const workspace = await prepareAnalysisWorkspace(system, repoMutex, repoPath, baseBranch, key);
    return {
      cwd: workspace.cwd,
      release: () => {
        void releaseAnalysisWorkspace(system, repoMutex, workspace);
        releaseRemote();
      },
    };
  } catch (error) {
    releaseRemote();
    throw error;
  }
}

function remoteUploadsRoot(environment: Record<string, string | undefined> = process.env): string {
  const dataRoot = environment.KANBAN_DATA_ROOT?.trim();
  return join(dataRoot ? dataRoot : PROJECT_ROOT, UPLOADS_DIR);
}

function isInside(root: string, path: string): boolean {
  const offset = relative(root, path);
  return offset !== "" && !offset.startsWith("..") && !isAbsolute(offset);
}

async function copyUploadedImage(reference: string, uploadsRoot: string, target: string): Promise<string | null> {
  const requested = reference.startsWith(UPLOADS_URL_PREFIX) ? join(uploadsRoot, reference.slice(UPLOADS_URL_PREFIX.length)) : reference;
  if (!IMAGE_EXTENSIONS.has(extname(requested).toLowerCase())) return null;
  try {
    const [root, path] = await Promise.all([realpath(uploadsRoot), realpath(requested)]);
    if (!isInside(root, path)) return null;
    const info = await stat(path);
    if (!info.isFile() || info.size > MAX_IMAGE_BYTES) return null;
    const copy = join(target, basename(path));
    await copyFile(path, copy);
    return copy;
  } catch {
    return null;
  }
}

/**
 * Copy the uploaded images referenced by `texts` into the run's isolated workspace (only files of
 * the application's uploads folder are eligible) and return the prompt lines mapping each original
 * reference to its readable copy. Nothing is written outside `workspace`.
 */
export async function copyRemoteImages(texts: readonly string[], workspace: string): Promise<string[]> {
  const references = [...new Set(texts.flatMap((text) => text.match(IMAGE_REFERENCE_PATTERN) ?? []))].slice(0, MAX_COPIED_IMAGES);
  if (references.length === 0) return [];
  const target = join(workspace, COPIED_IMAGES_DIR);
  await mkdir(target, { recursive: true });
  const uploadsRoot = remoteUploadsRoot();
  const lines: string[] = [];
  for (const reference of references) {
    const copy = await copyUploadedImage(reference, uploadsRoot, target);
    if (copy !== null) lines.push(`- ${reference} → ${copy}`);
  }
  if (lines.length === 0) return [];
  return ["## Images copiées", "Lis la copie ; dans toute réponse, conserve le chemin d'origine.", ...lines];
}

export function appendPromptLines(prompt: string, lines: readonly string[]): string {
  return lines.length === 0 ? prompt : `${prompt}\n\n${lines.join("\n")}`;
}
