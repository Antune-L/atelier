/**
 * GitHub account and clone contracts shared by the server and the web client. A project can be
 * attached to one registered GitHub account (a `gh` config directory per account on the server);
 * no identifier other than the public login ever crosses this boundary.
 */

import { z } from "zod";

/** GitHub login: alphanumerics and single hyphens, 1 to 39 characters, never a leading hyphen. */
export const GITHUB_LOGIN_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
export const githubLoginSchema = z.string().trim().regex(GITHUB_LOGIN_PATTERN, "login GitHub invalide");

/** Hard cap of a server-side `git clone`, mirrored by the UI wording. */
export const GITHUB_CLONE_TIMEOUT_MS = 200_000;
/** Clone-root segment used when no account is chosen (the machine's default gh account). */
export const MACHINE_ACCOUNT_SEGMENT = "_machine";

export const githubAccountStatusSchema = z.object({
  login: z.string(),
  status: z.enum(["valid", "invalid"]),
  /** French reason shown next to an invalid account; never contains a token. */
  reason: z.string().nullable(),
});
export type GithubAccountStatus = z.infer<typeof githubAccountStatusSchema>;

/** An account as listed in the settings, with the labels of the projects attached to it. */
export const githubAccountSummarySchema = githubAccountStatusSchema.extend({
  projects: z.array(z.string()),
});
export type GithubAccountSummary = z.infer<typeof githubAccountSummarySchema>;

export const githubRepoSummarySchema = z.object({
  fullName: z.string(),
  owner: z.string(),
  name: z.string(),
  private: z.boolean(),
  htmlUrl: z.string(),
});
export type GithubRepoSummary = z.infer<typeof githubRepoSummarySchema>;

export const addGithubAccountRequestSchema = z.object({
  token: z.string().trim().min(1).max(512),
});
export const addGithubAccountResponseSchema = z.object({ login: z.string() });

export const cloneProjectRequestSchema = z.object({
  source: z.string().trim().min(1).max(512),
  account: githubLoginSchema.nullable(),
});
export type CloneProjectRequest = z.infer<typeof cloneProjectRequestSchema>;

export const cloneResultSchema = z.object({
  repoPath: z.string(),
  cloneUrl: z.string(),
  reused: z.boolean(),
});
export type CloneResult = z.infer<typeof cloneResultSchema>;
