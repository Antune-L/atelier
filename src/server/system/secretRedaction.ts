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
    // The value stops at a backslash too, so a JSON-escaped quote (`password=\"x\"`) stays intact.
    pattern: /((?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|authorization)\\?["']?\s*[:=]\s*\\?["']?)[^"',\s}\\]+/gi,
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
