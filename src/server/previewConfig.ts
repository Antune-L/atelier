import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

import { PREVIEW_PRIVATE_DIRECTORY_MODE, PREVIEW_PRIVATE_FILE_MODE, previewSettingsSchema, updatePreviewSettingsSchema } from "../shared/preview.ts";
import type { PreviewSettings, UpdatePreviewSettingsInput } from "../shared/preview.ts";

import { previewBrokerSocket } from "./system/previewBroker.ts";

const PREVIEW_CONFIG_FILE = "preview-settings.json";
const PRIVATE_CONFIG_ERROR = "Preview connection configuration is invalid.";
const privatePreviewConfigSchema = previewSettingsSchema.omit({ tokenConfigured: true, previewAuthConfigured: true }).extend({
  token: z.string().min(1).nullable().default(null),
  previewAuthUsername: z.string().min(1).nullable().default(null),
  previewAuthPassword: z.string().min(1).nullable().default(null),
}).strict();

type PrivatePreviewConfig = z.infer<typeof privatePreviewConfigSchema>;

export interface PreviewCredentials {
  baseUrl: string;
  token: string;
}

export interface PreviewAuth {
  username: string;
  password: string;
}

export interface PreviewConfigOptions {
  dryRun?: boolean;
}

export class PreviewConfig {
  private readonly path: string;
  private readonly dryRun: boolean;
  private config: PrivatePreviewConfig;

  constructor(private readonly dataRoot: string, options: PreviewConfigOptions = {}) {
    this.path = join(dataRoot, PREVIEW_CONFIG_FILE);
    this.dryRun = options.dryRun ?? false;
    this.config = this.load();
  }

  getSettings(): PreviewSettings {
    return previewSettingsSchema.parse({
      baseUrl: this.config.baseUrl,
      serverUuid: this.config.serverUuid,
      projectUuid: this.config.projectUuid,
      githubAppUuid: this.config.githubAppUuid,
      sshHostAlias: this.config.sshHostAlias,
      environmentName: this.config.environmentName,
      domainBase: this.config.domainBase,
      tokenConfigured: this.config.token !== null,
      previewAuthConfigured: this.config.previewAuthUsername !== null && this.config.previewAuthPassword !== null,
    });
  }

  updateSettings(input: UpdatePreviewSettingsInput): PreviewSettings {
    const patch = updatePreviewSettingsSchema.parse(input);
    const next = privatePreviewConfigSchema.parse({ ...this.config, ...patch });
    if (patch.baseUrl !== undefined && patch.baseUrl !== this.config.baseUrl && patch.token === undefined) next.token = null;
    if ((next.previewAuthUsername === null) !== (next.previewAuthPassword === null)) throw new Error("Preview authentication requires both a username and a password.");
    if (!this.dryRun) this.persist(next);
    this.config = next;
    return this.getSettings();
  }

  getCredentials(): PreviewCredentials | null {
    if (this.config.baseUrl !== null && previewBrokerSocket() !== null) return { baseUrl: this.config.baseUrl, token: "" };
    if (this.config.baseUrl === null || this.config.token === null) return null;
    return { baseUrl: this.config.baseUrl, token: this.config.token };
  }

  getPreviewAuth(): PreviewAuth | null {
    if (this.config.previewAuthUsername === null || this.config.previewAuthPassword === null) return null;
    return { username: this.config.previewAuthUsername, password: this.config.previewAuthPassword };
  }

  redactError(value: string): string {
    let sanitized = value;
    for (const secret of [this.config.token, this.config.previewAuthPassword]) {
      if (secret !== null) sanitized = sanitized.replaceAll(secret, "[redacted]");
    }
    return sanitized;
  }

  private load(): PrivatePreviewConfig {
    if (this.dryRun) return privatePreviewConfigSchema.parse({});
    let raw: string;
    try {
      raw = readFileSync(this.path, "utf8");
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return privatePreviewConfigSchema.parse({});
      throw new Error(PRIVATE_CONFIG_ERROR);
    }
    try {
      return privatePreviewConfigSchema.parse(JSON.parse(raw));
    } catch {
      throw new Error(PRIVATE_CONFIG_ERROR);
    }
  }

  private persist(config: PrivatePreviewConfig): void {
    const temporaryPath = `${this.path}.${randomUUID()}.tmp`;
    mkdirSync(this.dataRoot, { recursive: true, mode: PREVIEW_PRIVATE_DIRECTORY_MODE });
    try {
      writeFileSync(temporaryPath, JSON.stringify(config), { encoding: "utf8", flag: "wx", mode: PREVIEW_PRIVATE_FILE_MODE });
      renameSync(temporaryPath, this.path);
    } finally {
      rmSync(temporaryPath, { force: true });
    }
  }
}
