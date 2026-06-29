import { existsSync, readFileSync, unlinkSync } from "node:fs";

import { z } from "zod";

import { AGENT_EFFORTS, CONFIG_MIGRATED_META_KEY } from "../shared/constants.ts";
import type { AgentModel } from "../shared/constants.ts";
import { getErrorMessage } from "../shared/errors.ts";
import { agentModelSchema } from "../shared/schemas.ts";
import type { UpdateAppSettingsInput } from "../shared/schemas.ts";

import { projectConfigSchema } from "./config.ts";
import type { Store } from "./db/store.ts";
import { createLogger } from "./logger.ts";

const log = createLogger("migration");

const MIGRATED_FLAG = "1";

const legacyConfigSchema = z.object({
  projects: z.record(z.string(), projectConfigSchema),
  models: z
    .object({
      implement: z.string().min(1).optional(),
      triage: z.string().min(1).optional(),
      implementEffort: z.enum(AGENT_EFFORTS).optional(),
      triageEffort: z.enum(AGENT_EFFORTS).optional(),
      implementerModel: z.string().optional(),
      implementerEffort: z.enum(AGENT_EFFORTS).optional(),
    })
    .optional(),
  slotsRoot: z.string().optional(),
});

type LegacyConfig = z.infer<typeof legacyConfigSchema>;
type LegacyModels = NonNullable<LegacyConfig["models"]>;

/** Validate a free-form legacy model string against the known AgentModel enum; warn + drop when invalid. */
function pickModel(value: string | undefined, label: string): AgentModel | undefined {
  if (value === undefined) return undefined;
  const parsed = agentModelSchema.safeParse(value);
  if (parsed.success) return parsed.data;
  log.warn("modèle legacy invalide ignoré", { label, value });
  return undefined;
}

/** Map legacy `config.models` to the app-settings patch; implementer models, efforts and slotsRoot are intentionally dropped. */
function buildAppSettingsPatch(models: LegacyModels): UpdateAppSettingsInput {
  const patch: UpdateAppSettingsInput = {};
  const implementModel = pickModel(models.implement, "implement");
  if (implementModel) patch.implementModel = implementModel;
  const triageModel = pickModel(models.triage, "triage");
  if (triageModel) patch.triageModel = triageModel;
  if (models.implementEffort !== undefined) patch.implementEffort = models.implementEffort;
  if (models.triageEffort !== undefined) patch.triageEffort = models.triageEffort;
  return patch;
}

function parseLegacyConfig(configPath: string, raw: string): LegacyConfig {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new Error(`[migration] config.json JSON invalide (${configPath}): ${getErrorMessage(error)}`);
  }
  const parsed = legacyConfigSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`[migration] config.json invalide (${configPath}): ${parsed.error.message}`);
  }
  return parsed.data;
}

/**
 * One-time migration of a legacy `config.json` into the SQLite Store. Idempotent via the
 * `config_migrated` meta flag: projects, app-settings and the flag are written in a single
 * transaction so a crash never leaves a half-migrated DB that re-runs into a duplicate-key boot loop.
 * The legacy file is removed only after the transaction commits. A fresh install (no file) just sets
 * the flag.
 */
export async function migrateConfigJsonIfPresent(store: Store, configPath: string): Promise<void> {
  if (store.getMeta(CONFIG_MIGRATED_META_KEY) === MIGRATED_FLAG) return;

  if (!existsSync(configPath)) {
    store.setMeta(CONFIG_MIGRATED_META_KEY, MIGRATED_FLAG);
    return;
  }

  const config = parseLegacyConfig(configPath, readFileSync(configPath, "utf-8"));

  store.transaction(() => {
    for (const [key, project] of Object.entries(config.projects)) {
      store.createProject(key, project);
    }
    if (config.models) store.updateAppSettings(buildAppSettingsPatch(config.models));
    store.setMeta(CONFIG_MIGRATED_META_KEY, MIGRATED_FLAG);
  });

  log.info("config.json migré vers le Store", { projects: Object.keys(config.projects).length });

  try {
    unlinkSync(configPath);
  } catch (error) {
    log.warn("suppression de config.json après migration échouée", { configPath, error: getErrorMessage(error) });
  }
}
