/**
 * Single source of truth for the "a review session must not publish to GitHub itself" guard:
 * the in-process Claude predicate and the POSIX ERE patterns the generated Codex shell hook uses.
 */

const GH_PR_PUBLISH_SUBCOMMANDS = ["create", "comment", "review", "edit", "close", "merge", "ready", "reopen"] as const;
const GH_API_WRITE_METHODS = ["POST", "PUT", "PATCH", "DELETE"] as const;
const GH_API_READ_METHODS = ["GET", "HEAD"] as const;
const GH_API_WRITE_SHORT_FLAGS = ["-f", "-F"] as const;
const GH_API_WRITE_LONG_FLAGS = ["--field", "--raw-field", "--input"] as const;

const GH_PR_PUBLISH_PATTERN = new RegExp(`\\bgh\\s+pr\\s+(?:${GH_PR_PUBLISH_SUBCOMMANDS.join("|")})\\b`);
const GH_API_SEGMENT_PATTERN = /\bgh\s+api\b([^;&|\n]*)/g;
const GH_API_METHOD_PATTERN = /(?:^|\s)(?:-X(?:=|\s*)|--method(?:=|\s+))([a-z]+)/i;
const GH_API_WRITE_INPUT_PATTERN = new RegExp(
  `(?:^|\\s)(?:${GH_API_WRITE_SHORT_FLAGS.join("|")})(?:=|\\s*)\\S` +
    `|(?:^|\\s)(?:${GH_API_WRITE_LONG_FLAGS.join("|")})(?:=|\\s+)\\S`,
);
const GH_API_READ_METHOD_SET = new Set<string>(GH_API_READ_METHODS);

const ERE_WORD_END = "([^[:alnum:]_-]|$)";
const ERE_METHOD_FLAG = "(-X(=|[[:space:]])*|--method(=|[[:space:]])+)";

export const REVIEW_PUBLISHING_DENIAL_REASON = "La publication GitHub de cette review passe par publish_review.";

export function isReviewPublishingCommand(command: string): boolean {
  if (GH_PR_PUBLISH_PATTERN.test(command)) return true;
  for (const match of command.matchAll(GH_API_SEGMENT_PATTERN)) {
    const args = match[1];
    if (args === undefined) continue;
    const method = GH_API_METHOD_PATTERN.exec(args)?.[1]?.toUpperCase();
    if (method !== undefined) {
      if (!GH_API_READ_METHOD_SET.has(method)) return true;
      continue;
    }
    if (GH_API_WRITE_INPUT_PATTERN.test(args)) return true;
  }
  return false;
}

/** POSIX ERE translations of the predicate above, built from the SAME constant lists. */
export const reviewPublishingDenyPatterns = {
  prPublish: `gh[[:space:]]+pr[[:space:]]+(${GH_PR_PUBLISH_SUBCOMMANDS.join("|")})${ERE_WORD_END}`,
  apiCall: `gh[[:space:]]+api${ERE_WORD_END}`,
  apiWriteMethod: `${ERE_METHOD_FLAG}(${GH_API_WRITE_METHODS.join("|")})${ERE_WORD_END}`,
  apiReadMethod: `${ERE_METHOD_FLAG}(${GH_API_READ_METHODS.join("|")})${ERE_WORD_END}`,
  apiWriteInput:
    `([[:space:]](${GH_API_WRITE_SHORT_FLAGS.join("|")})[^[:space:]"]*` +
    `|[[:space:]](${GH_API_WRITE_LONG_FLAGS.join("|")})(=|[[:space:]]))`,
} as const;
