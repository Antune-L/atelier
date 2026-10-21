import { randomBytes } from "node:crypto";

import { AUDIT_LENS_CLASSES, AUDIT_MAX_CHUNK_CHARS, stripHtmlComments } from "../../../shared/audit.ts";
import type { AuditAgentFinding, AuditFinding, AuditLens, AuditProvider } from "../../../shared/audit.ts";
import { truncateAuditDiff } from "../../system/auditRange.ts";
import type { AuditRangeChunk } from "../../system/auditRange.ts";

import ANALYST_TEMPLATE from "./prompts/analyst.md" with { type: "text" };
import ARBITER_TEMPLATE from "./prompts/arbiter.md" with { type: "text" };
import LENS_INTEGRITY from "./prompts/lensIntegrity.md" with { type: "text" };
import LENS_LOGIC from "./prompts/lensLogic.md" with { type: "text" };
import LENS_REGRESSION from "./prompts/lensRegression.md" with { type: "text" };
import LENS_SECURITY from "./prompts/lensSecurity.md" with { type: "text" };
import READ_CLAUDE from "./prompts/readClaude.md" with { type: "text" };
import READ_CODEX from "./prompts/readCodex.md" with { type: "text" };
import RUBRIC from "./prompts/rubric.md" with { type: "text" };
import VERIFIER_TEMPLATE from "./prompts/verifier.md" with { type: "text" };

import type { AuditKnownFinding } from "./engine.ts";

const PROVENANCE_NOTE_PREFIX = "<!-- NOTE(ali)";
const PLACEHOLDER = /\{\{([A-Z_]+)\}\}/g;
const SHORT_SHA_LENGTH = 12;
const KNOWN_FINDINGS_PROMPT_LIMIT = 100;
const JSON_INDENT = 2;
const NONE = "(none)";
const NONCE_BYTES = 12;
const SECOND_VERIFIER_NOTE = "You are the second, independent verifier of the critical candidates; another verifier reviews them separately.";
export const REVIEW_FINDING_PROMPT_ID = "finding";

const LENS_PROMPT_LABELS: Record<AuditLens, string> = {
  security: "security and personal data",
  logic: "business logic",
  regression: "regressions and contracts",
  integrity: "data integrity, availability and cost",
};

const LENS_METHODS: Record<AuditLens, string> = {
  security: LENS_SECURITY,
  logic: LENS_LOGIC,
  regression: LENS_REGRESSION,
  integrity: LENS_INTEGRITY,
};

const READ_ACCESS: Record<AuditProvider, string> = { claude: READ_CLAUDE, codex: READ_CODEX };

const REVIEW_MODES = {
  recheck: {
    role: "re-checker",
    instructions: "The code may have changed since the finding was reported: decide whether the defect is still present, and still a defect, at this revision.",
  },
  arbiter: {
    role: "arbiter",
    instructions: "Independent verifiers disagreed on it: weigh their arguments against the code yourself and settle the disagreement.",
  },
} as const;

export type AuditReviewMode = keyof typeof REVIEW_MODES;

export interface AuditPromptContext {
  provider: AuditProvider;
  worktree: string;
  nonce: string;
  prBodies: ReadonlyMap<number, string | null>;
}

export function auditPromptNonce(): string {
  return randomBytes(NONCE_BYTES).toString("hex");
}

function untrusted(nonce: string, label: string, content: string): string {
  const body = content.replaceAll(nonce, "");
  return [`<untrusted-data id="${nonce}" kind="${label}">`, body, `</untrusted-data id="${nonce}">`].join("\n");
}

export interface AuditPromptCandidate {
  id: string;
  finding: AuditAgentFinding;
}

function promptText(source: string): string {
  const [first, ...rest] = source.split("\n");
  return first?.startsWith(PROVENANCE_NOTE_PREFIX) ? rest.join("\n").trim() : source.trim();
}

function render(template: string, values: Record<string, string>): string {
  return promptText(template).replaceAll(PLACEHOLDER, (placeholder, key: string) => values[key] ?? placeholder);
}

function readAccess(provider: AuditProvider, worktree: string): string {
  return render(READ_ACCESS[provider], { WORKTREE: worktree });
}

function rangeLabel(chunk: AuditRangeChunk): string {
  return `${chunk.baseSha.slice(0, SHORT_SHA_LENGTH)}..${chunk.headSha.slice(0, SHORT_SHA_LENGTH)}`;
}

function changedFiles(nonce: string, chunk: AuditRangeChunk): string {
  return chunk.files.length > 0 ? untrusted(nonce, "changed-files", chunk.files.map((file) => `- ${file}`).join("\n")) : NONE;
}

function commitsSection(nonce: string, chunks: readonly AuditRangeChunk[], prBodies: ReadonlyMap<number, string | null>): string {
  const sections = chunks.flatMap((chunk) => chunk.commits.map((commit) => {
    const lines = [`### ${commit.sha}`, untrusted(nonce, "commit-message", [commit.subject, "", stripHtmlComments(commit.body).trim() || NONE].join("\n"))];
    if (commit.prNumber !== null) {
      const body = stripHtmlComments(prBodies.get(commit.prNumber) ?? "").trim();
      lines.push("", `#### Pull request #${commit.prNumber}`, body === "" ? "(description not readable or empty)" : untrusted(nonce, "pull-request-description", body));
    }
    return lines.join("\n");
  }));
  return sections.length > 0 ? sections.join("\n\n") : NONE;
}

function knownFindingsSection(nonce: string, chunk: AuditRangeChunk, known: readonly AuditKnownFinding[]): string {
  const changed = new Set(chunk.files);
  const relevant = known.filter((entry) => changed.has(entry.file)).slice(0, KNOWN_FINDINGS_PROMPT_LIMIT);
  if (relevant.length === 0) return NONE;
  return untrusted(nonce, "known-findings", relevant.map((entry) => JSON.stringify({ file: entry.file, symbol: entry.symbol, title: entry.title })).join("\n"));
}

function diffSection(nonce: string, chunks: readonly AuditRangeChunk[]): string {
  const share = Math.floor(AUDIT_MAX_CHUNK_CHARS / Math.max(chunks.length, 1));
  return untrusted(nonce, "diff", chunks.map((chunk) => chunks.length === 1 ? chunk.diff : truncateAuditDiff(chunk.diff, share)).join("\n"));
}

export function analystPrompt(context: AuditPromptContext, lens: AuditLens, chunk: AuditRangeChunk, known: readonly AuditKnownFinding[]): string {
  const { nonce } = context;
  return render(ANALYST_TEMPLATE, {
    NONCE: nonce,
    LENS_LABEL: LENS_PROMPT_LABELS[lens],
    LENS_CLASSES: AUDIT_LENS_CLASSES[lens].map((auditClass) => `\`${auditClass}\``).join(", "),
    LENS_METHOD: promptText(LENS_METHODS[lens]),
    READ_ACCESS: readAccess(context.provider, context.worktree),
    WORKTREE: context.worktree,
    RANGE: rangeLabel(chunk),
    RUBRIC: promptText(RUBRIC),
    FILES: changedFiles(nonce, chunk),
    COMMITS: commitsSection(nonce, [chunk], context.prBodies),
    KNOWN_FINDINGS: knownFindingsSection(nonce, chunk, known),
    DIFF: diffSection(nonce, [chunk]),
  });
}

export function verifierPrompt(context: AuditPromptContext, candidates: readonly AuditPromptCandidate[], chunks: readonly AuditRangeChunk[], second: boolean): string {
  const { nonce } = context;
  return render(VERIFIER_TEMPLATE, {
    NONCE: nonce,
    ROLE_NOTE: second ? SECOND_VERIFIER_NOTE : "",
    READ_ACCESS: readAccess(context.provider, context.worktree),
    WORKTREE: context.worktree,
    RUBRIC: promptText(RUBRIC),
    CANDIDATES: untrusted(nonce, "candidates", JSON.stringify(candidates.map(({ id, finding }) => ({ id, ...finding })), null, JSON_INDENT)),
    COMMITS: commitsSection(nonce, chunks, context.prBodies),
    DIFF: diffSection(nonce, chunks),
  });
}

export function reviewPrompt(provider: AuditProvider, worktree: string, nonce: string, finding: AuditFinding, revision: string, mode: AuditReviewMode): string {
  const { class: findingClass, severity, title, file, line, symbol, scenario, expected, expectedSource, impact, evidence, introducedBy, suggestedFix } = finding;
  return render(ARBITER_TEMPLATE, {
    NONCE: nonce,
    ROLE_NAME: REVIEW_MODES[mode].role,
    MODE_INSTRUCTIONS: REVIEW_MODES[mode].instructions,
    FINDING_ID: REVIEW_FINDING_PROMPT_ID,
    READ_ACCESS: readAccess(provider, worktree),
    WORKTREE: worktree,
    REVISION: revision,
    RUBRIC: promptText(RUBRIC),
    FINDING: untrusted(nonce, "finding", JSON.stringify({ id: REVIEW_FINDING_PROMPT_ID, class: findingClass, severity, title, file, line, symbol, scenario, expected, expectedSource, impact, evidence, introducedBy, suggestedFix }, null, JSON_INDENT)),
    VERDICTS: untrusted(nonce, "previous-verdicts", JSON.stringify(finding.verdicts.map(({ role, verdict, severity: verdictSeverity, reason, revision: verdictRevision }) => ({ role, verdict, severity: verdictSeverity, reason, revision: verdictRevision })), null, JSON_INDENT)),
  });
}
