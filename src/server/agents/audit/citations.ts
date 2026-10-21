import { realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import type { AuditCitationCheck } from "../../../shared/audit.ts";
import { isQualityRepositoryPath } from "../../system/qualityReadPolicy.ts";

import { normalizeAuditPath } from "./fingerprint.ts";

const MIN_EXCERPT_CHARS = 12;
const REDACTED_PLACEHOLDER = /<redacted:[^>]*>/g;
const LINE_PREFIX = /^(?:[+-](?![+-])\s?|L?\d+\s*[:|]\s?)/;
const WHITESPACE_RUN = /\s+/g;

function compact(value: string): string {
  return value.replaceAll(WHITESPACE_RUN, " ").trim();
}

function excerptFragments(evidence: string): string[] {
  return evidence.split("\n").flatMap((line) => {
    const code = compact(line).replace(LINE_PREFIX, "");
    const longest = code.split(REDACTED_PLACEHOLDER).map(compact).reduce((best, part) => part.length > best.length ? part : best, "");
    return longest.length >= MIN_EXCERPT_CHARS ? [longest] : [];
  });
}

function workspaceRoots(cwd: string): string[] {
  try {
    return [...new Set([resolve(cwd), realpathSync(cwd)])];
  } catch {
    return [resolve(cwd)];
  }
}

export function relativeAuditPath(cwd: string, file: string): string {
  const normalized = normalizeAuditPath(file);
  if (!isAbsolute(normalized)) return normalized;
  for (const root of workspaceRoots(cwd)) {
    const offset = relative(root, normalized);
    if (offset !== "" && !offset.startsWith("..") && !isAbsolute(offset)) return offset;
  }
  return normalized;
}

export async function checkAuditCitation(cwd: string, citation: { file: string; line: number; evidence: string }): Promise<AuditCitationCheck> {
  const missing: AuditCitationCheck = { fileExists: false, lineInRange: false, excerptFound: false };
  if (isAbsolute(citation.file) || !isQualityRepositoryPath(cwd, citation.file)) return missing;
  let content: string;
  try {
    content = await readFile(resolve(cwd, citation.file), "utf8");
  } catch {
    return missing;
  }
  const lines = content.split("\n");
  const fileText = compact(content);
  const fragments = excerptFragments(citation.evidence);
  return {
    fileExists: true,
    lineInRange: citation.line >= 1 && citation.line <= lines.length,
    excerptFound: fragments.length > 0 && fragments.some((fragment) => fileText.includes(fragment)),
  };
}

export function citationPassed(check: AuditCitationCheck): boolean {
  return check.fileExists && check.lineInRange && check.excerptFound;
}
