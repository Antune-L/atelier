import { createHash } from "node:crypto";

const FINGERPRINT_LENGTH = 16;
const FINGERPRINT_SEPARATOR = "|";

export function normalizeAuditText(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .replaceAll(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

export function normalizeAuditPath(file: string): string {
  return file.trim().replace(/^\.\/+/, "").replaceAll("\\", "/");
}

export function auditFingerprint(input: { file: string; symbol: string; title: string }): string {
  const key = [normalizeAuditPath(input.file), input.symbol.trim().toLocaleLowerCase(), normalizeAuditText(input.title)].join(FINGERPRINT_SEPARATOR);
  return createHash("sha1").update(key).digest("hex").slice(0, FINGERPRINT_LENGTH);
}
