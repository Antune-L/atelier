import { readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import { AGENT_EFFORTS } from "../shared/constants.ts";

/**
 * Single source of machine-specific configuration. Everything that used to be
 * hardcoded in `src/shared` (project repo paths, base branches, claude models,
 * slot root) lives in a gitignored `config.json`, validated here at boot.
 *
 * Infrastructure knobs (PORT, KANBAN_DB, BACKEND_*) stay in env (see index.ts);
 * this file owns the structured, user-specific config instead.
 */

export const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const projectConfigSchema = z.object({
  label: z.string().min(1),
  repoPath: z.string().min(1),
  /** Base branch and PR target. */
  baseBranch: z.string().min(1),
  /** Default state of the "auto-merge PR" toggle for new tickets in this project. */
  defaultAutoMerge: z.boolean().default(false),
  commitTimeoutMs: z.number().int().positive(),
  /** Optional overrides for test/lint/typecheck commands (default: read project package.json scripts). */
  scripts: z
    .object({
      typecheck: z.string().optional(),
      lint: z.string().optional(),
      test: z.string().optional(),
    })
    .optional(),
  /** Project-specific agent instructions injected into the ticket contract. */
  instructions: z.string().optional(),
});

export type ProjectConfig = z.infer<typeof projectConfigSchema>;

const DEFAULT_MODELS = { implement: "opus", triage: "sonnet", implementEffort: "xhigh" } as const;

const configSchema = z.object({
  projects: z.record(z.string(), projectConfigSchema),
  models: z
    .object({
      /** Model spawned for the implementation session. */
      implement: z.string().min(1),
      /** Model used for the read-only feasibility triage. */
      triage: z.string().min(1),
      /** Default reasoning effort of the orchestrator session (per-ticket override wins). */
      implementEffort: z.enum(AGENT_EFFORTS).default("xhigh"),
    })
    .default(DEFAULT_MODELS),
  /** Root holding the fixed per-slot worktrees (default: <repo>/slots). */
  slotsRoot: z.string().optional(),
});

export type AppConfig = z.infer<typeof configSchema>;

const CONFIG_PATH = process.env.KANBAN_CONFIG ?? join(PROJECT_ROOT, "config.json");

function loadConfig(): AppConfig {
  let raw: string;
  try {
    raw = readFileSync(CONFIG_PATH, "utf8");
  } catch {
    throw new Error(
      `[config] fichier introuvable: ${CONFIG_PATH}. Copie config.example.json vers config.json et adapte-le.`,
    );
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new Error(`[config] JSON invalide (${CONFIG_PATH}): ${error instanceof Error ? error.message : error}`);
  }
  const parsed = configSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`[config] config invalide (${CONFIG_PATH}): ${parsed.error.message}`);
  }
  if (Object.keys(parsed.data.projects).length === 0) {
    throw new Error(`[config] au moins un projet est requis dans ${CONFIG_PATH}`);
  }
  return parsed.data;
}

export const config = loadConfig();

export const PROJECTS = config.projects;
export const MODELS = config.models;

/** Absolute root of the per-slot worktrees. */
export const SLOTS_ROOT = resolveSlotsRoot(config.slotsRoot);

function resolveSlotsRoot(configured: string | undefined): string {
  if (!configured) return join(PROJECT_ROOT, "slots");
  return isAbsolute(configured) ? configured : join(PROJECT_ROOT, configured);
}

/** Project keys are runtime-defined, so this is a plain string narrowing guard. */
export type ProjectKey = string;

export function isProjectKey(value: string): value is ProjectKey {
  return Object.prototype.hasOwnProperty.call(PROJECTS, value);
}

export const PROJECT_KEYS: ProjectKey[] = Object.keys(PROJECTS);

export function getProject(key: string): ProjectConfig {
  const project = PROJECTS[key];
  if (!project) throw new Error(`projet inconnu: ${key}`);
  return project;
}
