import { z } from "zod";

/** Wire contract for the in-app `claude auth login` flow. Never carries the pasted code nor credentials. */

export const CLAUDE_LOGIN_STATES = ["idle", "starting", "awaiting_code", "submitting", "success", "failed", "expired", "cancelled"] as const;
export const claudeLoginStateSchema = z.enum(CLAUDE_LOGIN_STATES);
export type ClaudeLoginState = z.infer<typeof claudeLoginStateSchema>;

export const claudeLoginStatusSchema = z.object({
  state: claudeLoginStateSchema,
  /** Authorization URL to open in a browser, once printed by the CLI. */
  url: z.string().nullable(),
  /** Epoch ms after which the pending flow is abandoned. */
  expiresAt: z.number().int().nullable(),
  message: z.string().nullable(),
  /** CLAUDE_CODE_OAUTH_TOKEN is set in the service environment: it probably takes precedence over the login. */
  oauthTokenEnvSet: z.boolean(),
  /** Login succeeded but the env token still masks it: comment it out and restart the service. */
  restartRequired: z.boolean(),
});
export type ClaudeLoginStatus = z.infer<typeof claudeLoginStatusSchema>;

export const claudeLoginCodeSchema = z.object({ code: z.string().trim().min(1).max(2048) });
export type ClaudeLoginCode = z.infer<typeof claudeLoginCodeSchema>;

export const CLAUDE_LOGIN_TIMEOUT_MS = 10 * 60_000;

/** Whether the flow is running (a new start is refused until it ends). */
export function isClaudeLoginActive(state: ClaudeLoginState): boolean {
  return state === "starting" || state === "awaiting_code" || state === "submitting";
}
