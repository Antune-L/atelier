import { z } from "zod";

export const DEFAULT_PREVIEW_RECIPE_PATH = ".coolify/preview.json";
export const DEFAULT_PREVIEW_ENVIRONMENT_NAME = "previews";
export const DEFAULT_PREVIEW_TTL_HOURS = 24;
export const MAX_PREVIEW_TTL_HOURS = 168;
export const MAX_PREVIEW_PORT = 65_535;
export const DEFAULT_PREVIEW_GENERATION = 1;
export const DEFAULT_PREVIEW_BUILD_CONTEXT = ".";
export const DEFAULT_PREVIEW_HEALTH_PATH = "/";
export const PREVIEW_RECIPE_VERSION = 1;
export const PREVIEW_PRIVATE_FILE_MODE = 0o600;
export const PREVIEW_PRIVATE_DIRECTORY_MODE = 0o700;
export const PREVIEW_AUTH_USERNAME_ENV = "KANBAN_PREVIEW_AUTH_USERNAME";
export const PREVIEW_AUTH_HASH_ENV = "KANBAN_PREVIEW_AUTH_HASH";
export const PREVIEW_AUTH_DISABLED_ENV = "KANBAN_PREVIEW_AUTH_DISABLED";
export const PREVIEW_AUTH_DISABLED_VALUE = "disabled";
export const PREVIEW_GATEWAY_AUTHENTICATION = "gateway";

const MAX_DNS_HOSTNAME_LENGTH = 253;
const MAX_DNS_LABEL_LENGTH = 63;
const MAX_PREVIEW_DOMAIN_BASE_LENGTH = MAX_DNS_HOSTNAME_LENGTH - MAX_DNS_LABEL_LENGTH - 1;
const MAX_PREVIEW_HEALTH_PATH_LENGTH = 2_048;
const COMPOSE_SERVICE_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,62}$/;
const DNS_LABEL_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
const RESERVED_PREVIEW_ENVIRONMENT_KEYS = [PREVIEW_AUTH_USERNAME_ENV, PREVIEW_AUTH_HASH_ENV, PREVIEW_AUTH_DISABLED_ENV];

const nonEmptyTextSchema = z.string().trim().min(1);
const timestampSchema = z.number().int().nonnegative();
const relativePathSchema = nonEmptyTextSchema.refine((value) => !value.startsWith("/") && !value.includes("\\") && !value.split("/").includes(".."), "A repository-relative path is required.");
const HTTP_PROTOCOLS = ["http:", "https:"];
const LOCAL_CONNECTION_HOSTS = ["localhost", "127.0.0.1", "[::1]"];
const COOLIFY_SHARED_ENVIRONMENT_REFERENCE_PATTERN = /\{\{\s*(environment|project|team)\./i;
const httpUrlSchema = z.url().refine((value) => {
  const url = new URL(value);
  return HTTP_PROTOCOLS.includes(url.protocol) && url.username.length === 0 && url.password.length === 0;
}, "An HTTP(S) URL without embedded credentials is required.");
const previewConnectionUrlSchema = httpUrlSchema.refine((value) => {
  const url = new URL(value);
  return url.search.length === 0 && url.hash.length === 0 && (url.protocol === "https:" || LOCAL_CONNECTION_HOSTS.includes(url.hostname));
}, "Use HTTPS for Coolify connections, except on localhost, without query parameters or fragments.");
const previewHealthPathSchema = z.string().max(MAX_PREVIEW_HEALTH_PATH_LENGTH).startsWith("/").refine((value) => !value.startsWith("//") && !value.includes("\\"), "A same-origin health path is required.");
const previewDomainBaseSchema = nonEmptyTextSchema.max(MAX_PREVIEW_DOMAIN_BASE_LENGTH).refine((value) => value.split(".").every((label) => label.length <= MAX_DNS_LABEL_LENGTH && DNS_LABEL_PATTERN.test(label)), "A DNS hostname without empty or oversized labels is required.");
const previewEnvironmentKeySchema = z.string().refine((value) => !RESERVED_PREVIEW_ENVIRONMENT_KEYS.includes(value.toUpperCase()), "Preview authentication variables are reserved for the backend.");

export const previewSettingsSchema = z.object({
  baseUrl: previewConnectionUrlSchema.nullable().default(null),
  serverUuid: nonEmptyTextSchema.nullable().default(null),
  projectUuid: nonEmptyTextSchema.nullable().default(null),
  githubAppUuid: nonEmptyTextSchema.nullable().default(null),
  sshHostAlias: nonEmptyTextSchema.nullable().default(null),
  environmentName: nonEmptyTextSchema.default(DEFAULT_PREVIEW_ENVIRONMENT_NAME),
  domainBase: previewDomainBaseSchema.nullable().default(null),
  tokenConfigured: z.boolean().default(false),
  previewAuthConfigured: z.boolean().default(false),
});
export type PreviewSettings = z.infer<typeof previewSettingsSchema>;

export const updatePreviewSettingsSchema = z.object({
  baseUrl: previewSettingsSchema.shape.baseUrl.removeDefault().optional(),
  serverUuid: previewSettingsSchema.shape.serverUuid.removeDefault().optional(),
  projectUuid: previewSettingsSchema.shape.projectUuid.removeDefault().optional(),
  githubAppUuid: previewSettingsSchema.shape.githubAppUuid.removeDefault().optional(),
  sshHostAlias: previewSettingsSchema.shape.sshHostAlias.removeDefault().optional(),
  environmentName: previewSettingsSchema.shape.environmentName.removeDefault().optional(),
  domainBase: previewSettingsSchema.shape.domainBase.removeDefault().optional(),
  token: nonEmptyTextSchema.nullable().optional(),
  previewAuthUsername: nonEmptyTextSchema.nullable().optional(),
  previewAuthPassword: nonEmptyTextSchema.nullable().optional(),
}).strict();
export type UpdatePreviewSettingsInput = z.infer<typeof updatePreviewSettingsSchema>;

const coolifyInventoryItemSchema = z.object({ uuid: nonEmptyTextSchema, name: z.string() });
export const coolifyPrivateKeySchema = coolifyInventoryItemSchema;
export type CoolifyPrivateKey = z.infer<typeof coolifyPrivateKeySchema>;
export const coolifyPrivateKeysResponseSchema = z.object({ privateKeys: z.array(coolifyPrivateKeySchema) });
export const coolifyInventorySchema = z.object({
  servers: z.array(coolifyInventoryItemSchema),
  projects: z.array(coolifyInventoryItemSchema),
  githubApps: z.array(coolifyInventoryItemSchema),
  environments: z.array(coolifyInventoryItemSchema),
});
export type CoolifyInventory = z.infer<typeof coolifyInventorySchema>;

export const previewProjectSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  privateKeyUuid: nonEmptyTextSchema.nullable().default(null),
  githubAppUuid: nonEmptyTextSchema.nullable().default(null),
  recipePath: relativePathSchema.default(DEFAULT_PREVIEW_RECIPE_PATH),
  ttlHours: z.number().positive().max(MAX_PREVIEW_TTL_HOURS).default(DEFAULT_PREVIEW_TTL_HOURS),
  preparationTicketId: nonEmptyTextSchema.nullable().default(null),
});
export type PreviewProjectSettings = z.infer<typeof previewProjectSettingsSchema>;
export const updatePreviewProjectSettingsSchema = z.object({
  enabled: previewProjectSettingsSchema.shape.enabled.removeDefault().optional(),
  privateKeyUuid: previewProjectSettingsSchema.shape.privateKeyUuid.removeDefault().optional(),
  githubAppUuid: previewProjectSettingsSchema.shape.githubAppUuid.removeDefault().optional(),
  recipePath: previewProjectSettingsSchema.shape.recipePath.removeDefault().optional(),
  ttlHours: previewProjectSettingsSchema.shape.ttlHours.removeDefault().optional(),
  preparationTicketId: previewProjectSettingsSchema.shape.preparationTicketId.removeDefault().optional(),
}).strict();
export type UpdatePreviewProjectSettingsInput = z.infer<typeof updatePreviewProjectSettingsSchema>;

export const previewGithubRepositorySchema = z.object({
  repository: nonEmptyTextSchema,
  host: nonEmptyTextSchema,
  visibility: z.enum(["public", "private"]),
});
export type PreviewGithubRepository = z.infer<typeof previewGithubRepositorySchema>;

export const previewGithubSourceResolutionSchema = z.object({
  status: z.enum(["resolved", "choice_required", "no_match", "incomplete", "unsupported"]),
  repository: nonEmptyTextSchema.nullable(),
  host: nonEmptyTextSchema.nullable(),
  visibility: previewGithubRepositorySchema.shape.visibility.nullable(),
  source: z.enum(["public", "github_app", "deploy_key"]).nullable(),
  privateKeyUuid: nonEmptyTextSchema.nullable().default(null),
  githubAppUuid: nonEmptyTextSchema.nullable(),
  candidates: z.array(coolifyInventoryItemSchema),
  message: z.string().nullable(),
});
export type PreviewGithubSourceResolution = z.infer<typeof previewGithubSourceResolutionSchema>;

const previewGithubSourceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("public") }),
  z.object({ type: z.literal("github_app"), uuid: nonEmptyTextSchema }),
  z.object({ type: z.literal("deploy_key"), uuid: nonEmptyTextSchema }),
]);

const previewRecipeBaseSchema = z.object({
  version: z.literal(PREVIEW_RECIPE_VERSION),
  buildContext: relativePathSchema.default(DEFAULT_PREVIEW_BUILD_CONTEXT),
  port: z.number().int().positive().max(MAX_PREVIEW_PORT),
  healthPath: previewHealthPathSchema.default(DEFAULT_PREVIEW_HEALTH_PATH),
  environment: z.record(previewEnvironmentKeySchema, z.string().refine((value) => !COOLIFY_SHARED_ENVIRONMENT_REFERENCE_PATTERN.test(value), "Shared Coolify environment references are not allowed in previews.")).default({}),
  websocketPaths: z.array(z.string().startsWith("/")).optional(),
});
export const previewRecipeSchema = z.discriminatedUnion("buildPack", [
  previewRecipeBaseSchema.extend({ buildPack: z.literal("dockerfile"), dockerfile: relativePathSchema }).strict(),
  previewRecipeBaseSchema.extend({ buildPack: z.literal("dockercompose"), composeFile: relativePathSchema, serviceName: nonEmptyTextSchema.regex(COMPOSE_SERVICE_NAME_PATTERN), authentication: z.literal(PREVIEW_GATEWAY_AUTHENTICATION) }).strict(),
]);
export type PreviewRecipe = z.infer<typeof previewRecipeSchema>;

export const previewStatusSchema = z.enum(["queued", "provisioning", "building", "deploying", "ready", "stopping", "stopped", "failed", "interrupted"]);
export const previewDesiredStateSchema = z.enum(["running", "stopped"]);
export const previewCleanupStatusSchema = z.enum(["pending", "complete", "failed"]);

const previewRecordBaseSchema = z.object({
  id: nonEmptyTextSchema,
  ticketId: nonEmptyTextSchema.nullable(),
  project: nonEmptyTextSchema,
  prUrl: httpUrlSchema.nullable(),
  repository: nonEmptyTextSchema.nullable().default(null),
  repositoryHost: nonEmptyTextSchema.nullable().default(null),
  replacesPreviewId: nonEmptyTextSchema.nullable().default(null),
  revision: nonEmptyTextSchema,
  deployedRevision: nonEmptyTextSchema.nullable().default(null),
  branch: nonEmptyTextSchema,
  appUuid: nonEmptyTextSchema.nullable().default(null),
  deploymentUuid: nonEmptyTextSchema.nullable().default(null),
  deploymentUuids: z.array(nonEmptyTextSchema).default([]),
  url: httpUrlSchema.nullable().default(null),
  status: previewStatusSchema.default("queued"),
  desiredState: previewDesiredStateSchema.default("running"),
  generation: z.number().int().positive().default(DEFAULT_PREVIEW_GENERATION),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  expiresAt: timestampSchema.nullable().default(null),
  error: z.string().nullable().default(null),
  qualityRunId: nonEmptyTextSchema.nullable().default(null),
  cleanupStatus: previewCleanupStatusSchema.default("pending"),
  cleanupWatch: z.boolean().default(false),
  deploymentTimeoutSeconds: z.number().int().positive().nullable().default(null),
  cleanupWatchUntil: timestampSchema.nullable().default(null),
  cleanupAuditAt: timestampSchema.nullable().default(null),
  cleanupEmptyAuditCount: z.number().int().nonnegative().default(0),
  coolifyBaseUrl: httpUrlSchema.nullable().default(null),
  coolifyProjectUuid: nonEmptyTextSchema.nullable().default(null),
  githubSource: previewGithubSourceSchema.nullable().default(null),
  ownershipMarker: nonEmptyTextSchema.nullable().default(null),
  serverUuid: nonEmptyTextSchema.nullable().default(null),
  environmentUuid: nonEmptyTextSchema.nullable().default(null),
  buildServerUuid: nonEmptyTextSchema.nullable().default(null),
  createRequestedAt: timestampSchema.nullable().default(null),
  deployRequestedAt: timestampSchema.nullable().default(null),
  stopRequestedAt: timestampSchema.nullable().default(null),
  deleteRequestedAt: timestampSchema.nullable().default(null),
  cleanupRequestedAt: timestampSchema.nullable().default(null),
  recipe: previewRecipeSchema.nullable().default(null),
});
const hasPairedPreviewOwnership = (preview: { ticketId: string | null; prUrl: string | null }) => (preview.ticketId === null) === (preview.prUrl === null);
export const previewRecordSchema = previewRecordBaseSchema.refine(hasPairedPreviewOwnership, "Ticket and pull request ownership must be present together.");
export type PreviewRecord = z.infer<typeof previewRecordSchema>;
export const createPreviewSchema = previewRecordBaseSchema.omit({ id: true, createdAt: true, updatedAt: true }).refine(hasPairedPreviewOwnership, "Ticket and pull request ownership must be present together.");
export type CreatePreviewInput = z.input<typeof createPreviewSchema>;
export const updatePreviewSchema = z.object({
  prUrl: previewRecordSchema.shape.prUrl.optional(),
  revision: previewRecordSchema.shape.revision.optional(),
  branch: previewRecordSchema.shape.branch.optional(),
  deployedRevision: previewRecordSchema.shape.deployedRevision.removeDefault().optional(),
  appUuid: previewRecordSchema.shape.appUuid.removeDefault().optional(),
  deploymentUuid: previewRecordSchema.shape.deploymentUuid.removeDefault().optional(),
  deploymentUuids: previewRecordSchema.shape.deploymentUuids.removeDefault().optional(),
  url: previewRecordSchema.shape.url.removeDefault().optional(),
  status: previewRecordSchema.shape.status.removeDefault().optional(),
  desiredState: previewRecordSchema.shape.desiredState.removeDefault().optional(),
  generation: previewRecordSchema.shape.generation.removeDefault().optional(),
  expiresAt: previewRecordSchema.shape.expiresAt.removeDefault().optional(),
  error: previewRecordSchema.shape.error.removeDefault().optional(),
  qualityRunId: previewRecordSchema.shape.qualityRunId.removeDefault().optional(),
  cleanupStatus: previewRecordSchema.shape.cleanupStatus.removeDefault().optional(),
  cleanupWatch: previewRecordSchema.shape.cleanupWatch.removeDefault().optional(),
  deploymentTimeoutSeconds: previewRecordSchema.shape.deploymentTimeoutSeconds.removeDefault().optional(),
  cleanupWatchUntil: previewRecordSchema.shape.cleanupWatchUntil.removeDefault().optional(),
  cleanupAuditAt: previewRecordSchema.shape.cleanupAuditAt.removeDefault().optional(),
  cleanupEmptyAuditCount: previewRecordSchema.shape.cleanupEmptyAuditCount.removeDefault().optional(),
  coolifyBaseUrl: previewRecordSchema.shape.coolifyBaseUrl.removeDefault().optional(),
  ownershipMarker: previewRecordSchema.shape.ownershipMarker.removeDefault().optional(),
  serverUuid: previewRecordSchema.shape.serverUuid.removeDefault().optional(),
  environmentUuid: previewRecordSchema.shape.environmentUuid.removeDefault().optional(),
  buildServerUuid: previewRecordSchema.shape.buildServerUuid.removeDefault().optional(),
  createRequestedAt: previewRecordSchema.shape.createRequestedAt.removeDefault().optional(),
  deployRequestedAt: previewRecordSchema.shape.deployRequestedAt.removeDefault().optional(),
  stopRequestedAt: previewRecordSchema.shape.stopRequestedAt.removeDefault().optional(),
  deleteRequestedAt: previewRecordSchema.shape.deleteRequestedAt.removeDefault().optional(),
  cleanupRequestedAt: previewRecordSchema.shape.cleanupRequestedAt.removeDefault().optional(),
  recipe: previewRecordSchema.shape.recipe.removeDefault().optional(),
}).strict();
export type UpdatePreviewInput = z.infer<typeof updatePreviewSchema>;

export const previewBranchSchema = nonEmptyTextSchema.refine((branch) => !branch.startsWith("-") && !branch.startsWith("refs/") && !/[\s~^:?*[\\]/.test(branch) && !branch.includes("..") && !branch.includes("@{") && !branch.endsWith("/") && !branch.endsWith(".") && !branch.endsWith(".lock") && branch.split("/").every((part) => part.length > 0 && !part.startsWith(".") && !part.endsWith(".lock")) && branch !== "@", "A remote branch name is required.");
export const createBranchPreviewSchema = z.object({ branch: previewBranchSchema }).strict();
export const preparePreviewSchema = z.object({ branch: previewBranchSchema.optional(), retry: z.boolean().optional() }).strict();
export const previewReadinessSchema = z.object({
  status: z.enum(["ready", "not_ready", "check_error"]),
  branch: previewBranchSchema,
  revision: nonEmptyTextSchema.nullable(),
  diagnostics: z.array(z.string()),
  preparationTicketId: nonEmptyTextSchema.nullable(),
  preparationRetryAvailable: z.boolean().default(false),
});
export type PreviewReadiness = z.infer<typeof previewReadinessSchema>;
