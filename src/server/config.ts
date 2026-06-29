import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import type { AgentEffort } from "../shared/constants.ts";
import type { AppSettings } from "../shared/schemas.ts";

import type { Store } from "./db/store.ts";

/**
 * Single source of machine-specific configuration. Project repo paths, base
 * branches and claude models now live in the SQLite Store (projects table +
 * meta-backed app settings); this module delegates project lookups there.
 *
 * Infrastructure knobs (PORT, KANBAN_DB, BACKEND_*) stay in env (see index.ts).
 */

export const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const projectConfigSchema = z.object({
  label: z.string().min(1),
  repoPath: z.string().min(1),
  /** Base branch and PR target. */
  baseBranch: z.string().min(1),
  /** Default state of the "auto-merge PR" toggle for new tickets in this project. */
  defaultAutoMerge: z.boolean().default(false),
  /** Default state of the "add screenshots to PR" toggle for new tickets in this project. */
  defaultAddScreenshots: z.boolean().default(false),
  commitTimeoutMs: z.number().int().positive(),
  /** Optional overrides for test/lint/typecheck commands (default: read project package.json scripts). */
  scripts: z
    .object({
      typecheck: z.string().optional(),
      lint: z.string().optional(),
      test: z.string().optional(),
    })
    .optional(),
  /**
   * Optional command run in the freshly-created slot worktree to configure it (e.g. produce .env).
   * Runs with cwd=worktree and env WORKTREE_PATH/REPO_PATH/BRANCH/BASE_BRANCH. If absent, a
   * conventional script file in the repo is auto-detected (scripts/setup-worktree.sh, …). The script
   * must write only gitignored paths — any tracked change it leaves would fail the done() clean-tree gate.
   */
  worktreeScript: z.string().optional(),
  /**
   * Command auto-run in the interactive test shell to launch the app (e.g. "pnpm dev"). When absent,
   * "Tester la feature" drops into a plain shell with no auto-launch.
   */
  runScript: z.string().optional(),
  /**
   * Command run in the worktree when a test session stops, BEFORE the worktree is removed (e.g.
   * `docker compose down`). Symmetric to `worktreeScript`. If absent, a conventional
   * `teardown-worktree.sh` is auto-detected. Best-effort: a failure never blocks the worktree removal.
   */
  worktreeTeardownScript: z.string().optional(),
  /** Project-specific agent instructions injected into the ticket contract. */
  instructions: z.string().optional(),
  /** Optional CSS color value used as the background of the project badge on ticket cards. */
  color: z.string().optional(),
  /**
   * Per-worktree app/service ports, displayed in the worktree session detail. Each address URL is
   * `http://localhost:${base + offset}` where `offset` is read from `<slot>/.wt-offset` (written by
   * the project's setup-worktree.sh). Lets the user open the running frontend/backend/etc. of an
   * isolated worktree session.
   */
  worktreePorts: z.array(z.object({ label: z.string().min(1), base: z.number().int().positive() })).optional(),
});

export type ProjectConfig = z.infer<typeof projectConfigSchema>;

export const DEFAULT_MODELS = {
  implement: "opus",
  triage: "sonnet",
  implementEffort: "medium",
  triageEffort: "low",
  implementerModel: "opus",
  implementerEffort: "low",
} as const;

export const MODELS: {
  implement: string;
  triage: string;
  implementEffort: AgentEffort;
  triageEffort: AgentEffort;
  implementerModel: string;
  implementerEffort: AgentEffort;
} = { ...DEFAULT_MODELS };

/**
 * Sync the mutable MODELS registry with the persisted app settings.
 * NOTE: AppSettings carries no implementerModel/implementerEffort, so those two MODELS keys keep
 * their DEFAULT_MODELS values (per-ticket overrides still apply at the call sites).
 */
export function applyAppSettingsToModels(settings: AppSettings): void {
  MODELS.implement = settings.implementModel;
  MODELS.triage = settings.triageModel;
  MODELS.implementEffort = settings.implementEffort;
  MODELS.triageEffort = settings.triageEffort;
}

let _store: Store | undefined;

/** Wire the project/app-settings registry to the Store at boot. */
export function initProjectRegistry(store: Store): void {
  _store = store;
  applyAppSettingsToModels(store.getAppSettings());
}

function requireStore(): Store {
  if (!_store) throw new Error("[config] project registry non initialisé (appelle initProjectRegistry au boot)");
  return _store;
}

// Desktop dev: PROJECT_ROOT resolves inside the bundled launcher (under build/), which
// `electrobun dev` wipes on every relaunch — a relaunch would delete the slot worktrees out
// from under live agents. KANBAN_REPO_ROOT (the real checkout, exported by the dev:desktop
// script and the relauncher) anchors slots at <repoRoot>/slots, outside build/, like `bun run dev`.
const repoRoot = process.env.KANBAN_REPO_ROOT;

/** Absolute root of the per-slot worktrees. */
export const SLOTS_ROOT = join(repoRoot ?? PROJECT_ROOT, "slots");

/** Project keys are runtime-defined, so this is a plain string narrowing guard. */
export type ProjectKey = string;

export function isProjectKey(value: string): value is ProjectKey {
  return requireStore().getProjectRow(value) !== undefined;
}

export function getProject(key: string): ProjectConfig {
  const project = requireStore().getProjectRow(key);
  if (!project) throw new Error(`projet inconnu: ${key}`);
  return project;
}

export function listProjectKeys(): string[] {
  return requireStore().listProjectKeys();
}
