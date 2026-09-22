/**
 * Single source of truth for the "a review session must not publish to the PR host itself" guard:
 * the in-process Claude predicate and the POSIX ERE patterns the generated Codex shell hook uses.
 * Both providers are covered — `gh` for GitHub, `az` for Azure DevOps — from the same constant lists.
 *
 * Both sides evaluate ONE command segment at a time (the shell hook splits its input the same way),
 * so a read method in one segment can never suppress a write deny in another.
 */

const GH_PR_PUBLISH_SUBCOMMANDS = ["create", "comment", "review", "edit", "close", "merge", "ready", "reopen"] as const;
const GH_API_WRITE_METHODS = ["POST", "PUT", "PATCH", "DELETE"] as const;
const GH_API_READ_METHODS = ["GET", "HEAD"] as const;

const GH_BINARY = "gh";
const AZ_BINARY = "az";

/** `gh api`: `--method -X` for the HTTP method, `-f/-F/--field/--raw-field/--input` for a body. */
const GH_API_COMMAND = ["api"] as const;
const GH_API_METHOD_LONG_FLAGS = ["--method"] as const;
const GH_API_METHOD_SHORT_FLAGS = ["-X"] as const;
const GH_API_WRITE_INPUT_LONG_FLAGS = ["--field", "--raw-field", "--input"] as const;
const GH_API_WRITE_INPUT_SHORT_FLAGS = ["-f", "-F"] as const;

/** `az repos pr …` sub-command paths that mutate the pull request (one entry per token sequence). */
const AZ_PR_WRITE_SUBCOMMANDS = [
  ["create"],
  ["update"],
  ["set-vote"],
  ["reviewer", "add"],
  ["reviewer", "remove"],
  ["work-item", "add"],
  ["work-item", "remove"],
  ["policy", "queue"],
] as const;

/**
 * `az devops invoke`: `--http-method` has NO short alias and the request body is a file
 * (`--in-file`), both verified in `az devops invoke --help`.
 */
const AZ_INVOKE_COMMAND = ["devops", "invoke"] as const;
const AZ_INVOKE_METHOD_LONG_FLAGS = ["--http-method"] as const;
const AZ_INVOKE_WRITE_INPUT_LONG_FLAGS = ["--in-file"] as const;

/** `az rest`: `--method -m` and `--body -b`, both verified in `az rest --help`. */
const AZ_REST_COMMAND = ["rest"] as const;
const AZ_REST_METHOD_LONG_FLAGS = ["--method"] as const;
const AZ_REST_METHOD_SHORT_FLAGS = ["-m"] as const;
const AZ_REST_WRITE_INPUT_LONG_FLAGS = ["--body"] as const;
const AZ_REST_WRITE_INPUT_SHORT_FLAGS = ["-b"] as const;

/** A raw-API escape hatch has no short flag of that kind. */
const NO_SHORT_FLAGS: readonly string[] = [];

/**
 * How each flag family introduces its value: a long flag needs a separator (`--method GET`,
 * `--method=GET`), a short one may glue it on (`-XPOST`, `-mpost`).
 */
function flagAlternatives(long: readonly string[], short: readonly string[]): string {
  const alternatives: string[] = [];
  if (short.length > 0) alternatives.push(`(?:${short.join("|")})(?:=|\\s*)`);
  if (long.length > 0) alternatives.push(`(?:${long.join("|")})(?:=|\\s+)`);
  return alternatives.join("|");
}

function methodPattern(long: readonly string[], short: readonly string[]): RegExp {
  return new RegExp(`(?:^|\\s)(?:${flagAlternatives(long, short)})([a-z]+)`, "i");
}

function writeInputPattern(long: readonly string[], short: readonly string[]): RegExp {
  return new RegExp(`(?:^|\\s)(?:${flagAlternatives(long, short)})\\S`);
}

/** The command plus the rest of ITS segment (`; & |` and newlines end a segment). */
function commandSegmentPattern(binary: string, path: readonly string[]): RegExp {
  return new RegExp(`\\b${binary}\\s+${path.join("\\s+")}\\b([^;&|\\n]*)`, "g");
}

function subcommandPattern(binary: string, prefix: readonly string[], paths: readonly (readonly string[])[]): RegExp {
  const alternatives = paths.map((path) => path.join("\\s+")).join("|");
  return new RegExp(`\\b${binary}\\s+${prefix.join("\\s+")}\\s+(?:${alternatives})\\b`);
}

/** One raw-API escape hatch, as the in-process predicate matches it. */
interface ApiGuard {
  segment: RegExp;
  method: RegExp;
  writeInput: RegExp;
}

const GH_PR_PUBLISH_PATTERN = subcommandPattern(GH_BINARY, ["pr"], GH_PR_PUBLISH_SUBCOMMANDS.map((name) => [name]));
const AZ_PR_WRITE_PATTERN = subcommandPattern(AZ_BINARY, ["repos", "pr"], AZ_PR_WRITE_SUBCOMMANDS);
const API_READ_METHOD_SET = new Set<string>(GH_API_READ_METHODS);

const API_GUARDS: readonly ApiGuard[] = [
  {
    segment: commandSegmentPattern(GH_BINARY, GH_API_COMMAND),
    method: methodPattern(GH_API_METHOD_LONG_FLAGS, GH_API_METHOD_SHORT_FLAGS),
    writeInput: writeInputPattern(GH_API_WRITE_INPUT_LONG_FLAGS, GH_API_WRITE_INPUT_SHORT_FLAGS),
  },
  {
    segment: commandSegmentPattern(AZ_BINARY, AZ_INVOKE_COMMAND),
    method: methodPattern(AZ_INVOKE_METHOD_LONG_FLAGS, NO_SHORT_FLAGS),
    writeInput: writeInputPattern(AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, NO_SHORT_FLAGS),
  },
  {
    segment: commandSegmentPattern(AZ_BINARY, AZ_REST_COMMAND),
    method: methodPattern(AZ_REST_METHOD_LONG_FLAGS, AZ_REST_METHOD_SHORT_FLAGS),
    writeInput: writeInputPattern(AZ_REST_WRITE_INPUT_LONG_FLAGS, AZ_REST_WRITE_INPUT_SHORT_FLAGS),
  },
];

export const REVIEW_PUBLISHING_DENIAL_REASON = "La publication de cette review sur la PR passe par publish_review.";

/** An `az devops invoke`/`az rest` (or `gh api`) segment whose method or body makes it a write. */
function isWriteApiSegment(args: string, guard: ApiGuard): boolean {
  const method = guard.method.exec(args)?.[1]?.toUpperCase();
  if (method !== undefined) return !API_READ_METHOD_SET.has(method);
  return guard.writeInput.test(args);
}

export function isReviewPublishingCommand(command: string): boolean {
  if (GH_PR_PUBLISH_PATTERN.test(command)) return true;
  if (AZ_PR_WRITE_PATTERN.test(command)) return true;
  for (const guard of API_GUARDS) {
    for (const match of command.matchAll(guard.segment)) {
      const args = match[1];
      if (args === undefined) continue;
      if (isWriteApiSegment(args, guard)) return true;
    }
  }
  return false;
}

const ERE_WORD_END = "([^[:alnum:]_-]|$)";

function ereFlagAlternatives(long: readonly string[], short: readonly string[]): string {
  const alternatives: string[] = [];
  if (short.length > 0) alternatives.push(`(${short.join("|")})(=|[[:space:]])*`);
  if (long.length > 0) alternatives.push(`(${long.join("|")})(=|[[:space:]])+`);
  return alternatives.join("|");
}

function ereCommand(binary: string, path: readonly string[]): string {
  return `${binary}[[:space:]]+${path.join("[[:space:]]+")}`;
}

function ereMethod(long: readonly string[], short: readonly string[], methods: readonly string[]): string {
  return `(${ereFlagAlternatives(long, short)})(${methods.join("|")})${ERE_WORD_END}`;
}

function ereWriteInput(long: readonly string[], short: readonly string[]): string {
  return `[[:space:]](${ereFlagAlternatives(long, short)})`;
}

/** POSIX ERE translations of one raw-API escape hatch, built from the SAME constant lists. */
export interface ApiDenyPatterns {
  call: string;
  writeMethod: string;
  readMethod: string;
  writeInput: string;
}

function apiDenyPatterns(
  call: string,
  methodFlags: { long: readonly string[]; short: readonly string[] },
  writeInputFlags: { long: readonly string[]; short: readonly string[] },
): ApiDenyPatterns {
  return {
    call: `${call}${ERE_WORD_END}`,
    writeMethod: ereMethod(methodFlags.long, methodFlags.short, GH_API_WRITE_METHODS),
    readMethod: ereMethod(methodFlags.long, methodFlags.short, GH_API_READ_METHODS),
    writeInput: ereWriteInput(writeInputFlags.long, writeInputFlags.short),
  };
}

function ereSubcommands(
  binary: string,
  prefix: readonly string[],
  paths: readonly (readonly string[])[],
): string {
  const alternatives = paths.map((path) => path.join("[[:space:]]+")).join("|");
  return `${ereCommand(binary, prefix)}[[:space:]]+(${alternatives})${ERE_WORD_END}`;
}

/** POSIX ERE translations of the predicate above, built from the SAME constant lists. */
export const reviewPublishingDenyPatterns: {
  commands: readonly string[];
  apis: readonly ApiDenyPatterns[];
} = {
  commands: [
    ereSubcommands(GH_BINARY, ["pr"], GH_PR_PUBLISH_SUBCOMMANDS.map((name) => [name])),
    ereSubcommands(AZ_BINARY, ["repos", "pr"], AZ_PR_WRITE_SUBCOMMANDS),
  ],
  apis: [
    apiDenyPatterns(
      ereCommand(GH_BINARY, GH_API_COMMAND),
      { long: GH_API_METHOD_LONG_FLAGS, short: GH_API_METHOD_SHORT_FLAGS },
      { long: GH_API_WRITE_INPUT_LONG_FLAGS, short: GH_API_WRITE_INPUT_SHORT_FLAGS },
    ),
    apiDenyPatterns(
      ereCommand(AZ_BINARY, AZ_INVOKE_COMMAND),
      { long: AZ_INVOKE_METHOD_LONG_FLAGS, short: NO_SHORT_FLAGS },
      { long: AZ_INVOKE_WRITE_INPUT_LONG_FLAGS, short: NO_SHORT_FLAGS },
    ),
    apiDenyPatterns(
      ereCommand(AZ_BINARY, AZ_REST_COMMAND),
      { long: AZ_REST_METHOD_LONG_FLAGS, short: AZ_REST_METHOD_SHORT_FLAGS },
      { long: AZ_REST_WRITE_INPUT_LONG_FLAGS, short: AZ_REST_WRITE_INPUT_SHORT_FLAGS },
    ),
  ],
};
