import { QUALITY_HISTORY_ACTION_REFERENCE_LIMIT, QUALITY_HISTORY_ARTIFACT_LIMIT, QUALITY_HISTORY_SUMMARY_LIMIT } from "../../shared/qualityHistory.ts";
import type { QualityActionInput } from "../../shared/qualityHistory.ts";

/**
 * The single secret masker of the server: logs, surfaced errors, transcripts and quality artifacts
 * all pass through it. GitHub tokens get dedicated patterns because a pasted account token or a
 * failing `gh`/`git` call is the most likely way one would leak.
 */

const REDACTED = "[redacted]";

const SECRET_PATTERNS: { pattern: RegExp; replacement: string }[] = [
  // Classic, OAuth, user-to-server, server-to-server and refresh GitHub tokens.
  { pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}/g, replacement: REDACTED },
  // Fine-grained personal access tokens.
  { pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}/g, replacement: REDACTED },
  { pattern: /Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, replacement: `Bearer ${REDACTED}` },
  { pattern: /\bsk-[A-Za-z0-9_-]+\b/g, replacement: REDACTED },
  {
    // The value stops before a backslash-escaped quote, so JSON (`password=\"x\"`) stays parseable,
    // while a backslash inside the secret itself (`ab\cd`) is still masked.
    pattern: /((?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|authorization)\\?["']?\s*[:=]\s*\\?["']?)(?:\\(?!["'])|[^"',\s}\\])+/gi,
    replacement: `$1${REDACTED}`,
  },
  // Any userinfo in an http(s) URL: `https://user:secret@host` and `https://token@host`.
  { pattern: /(https?:\/\/)[^/\s@]+@/gi, replacement: `$1${REDACTED}@` },
];

/**
 * Mask every known secret pattern, plus each literal in `extraSecrets` (e.g. a token the user just
 * pasted, whose shape may not match any pattern).
 */
export function redactSecrets(text: string, extraSecrets: readonly string[] = []): string {
  let redacted = text;
  for (const secret of extraSecrets) {
    if (secret.length > 0) redacted = redacted.split(secret).join(REDACTED);
  }
  for (const { pattern, replacement } of SECRET_PATTERNS) redacted = redacted.replace(pattern, replacement);
  return redacted;
}

export function minimizeQualityAction<T extends QualityActionInput>(input: T, secrets: readonly string[] = []) {
  const bounded = (value: string) => value.slice(0, QUALITY_HISTORY_SUMMARY_LIMIT);
  return {
    ...input,
    summary: bounded(redactSecrets(input.summary, secrets)),
    truncated: input.truncated === true || Object.values(input).some((value) => typeof value === "string" && value.length > QUALITY_HISTORY_SUMMARY_LIMIT) || (input.artifactPaths?.length ?? 0) > QUALITY_HISTORY_ARTIFACT_LIMIT || (input.actionIds?.length ?? 0) > QUALITY_HISTORY_ACTION_REFERENCE_LIMIT,
    sourceId: input.sourceId ? bounded(input.sourceId) : null,
    nativeId: input.nativeId ? bounded(input.nativeId) : null,
    sessionId: input.sessionId ? bounded(input.sessionId) : null,
    toolName: input.toolName ? bounded(input.toolName) : null,
    phase: bounded(input.phase ?? "unknown"),
    criterionId: input.criterionId ? bounded(input.criterionId) : null,
    artifactPaths: (input.artifactPaths ?? []).slice(0, QUALITY_HISTORY_ARTIFACT_LIMIT).map(bounded),
    actionIds: (input.actionIds ?? []).slice(0, QUALITY_HISTORY_ACTION_REFERENCE_LIMIT).map(bounded),
  };
}
