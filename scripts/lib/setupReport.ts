import { z } from "zod";

import { runBoundedCommand, safeJsonParse } from "../../src/server/system/boundedCommand.ts";
import type { BoundedCommandOptions, BoundedCommandResult } from "../../src/server/system/boundedCommand.ts";

export const EXIT_INCOMPLETE = 1;
export const EXIT_USAGE = 64;
const DETAIL_MAX_CHARS = 200;
const LABEL_WIDTH = 9;
const SECTION_WIDTH = 8;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export type Status = "ok" | "changed" | "missing" | "failed" | "skipped" | "warning";

const STATUS_LABELS: Record<Status, string> = {
  ok: "ok",
  changed: "fixed",
  missing: "MISSING",
  failed: "FAILED",
  skipped: "skipped",
  warning: "warning",
};
const BLOCKING_STATUSES = new Set<Status>(["missing", "failed"]);

let blocking = 0;

export function report(section: string, status: Status, label: string, detail?: string): void {
  if (BLOCKING_STATUSES.has(status)) blocking += 1;
  const tag = `[${STATUS_LABELS[status]}]`.padEnd(LABEL_WIDTH);
  console.log(`${tag} ${section.padEnd(SECTION_WIDTH)} ${label}${detail ? ` - ${detail}` : ""}`);
}

export function finish(): never {
  if (blocking > 0) {
    console.log(`${blocking} item(s) missing or failing.`);
    process.exit(EXIT_INCOMPLETE);
  }
  console.log("Everything is in place.");
  process.exit(0);
}

export function shortDetail(text: string): string {
  return text.trim().split("\n").slice(-2).join(" ").slice(0, DETAIL_MAX_CHARS);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function run(args: string[], options: Pick<BoundedCommandOptions, "timeoutMs" | "stdin"> = {}): Promise<BoundedCommandResult> {
  return runBoundedCommand(args, process.cwd(), options);
}

const tunnelTokenSchema = z.object({ a: z.string().min(1), t: z.string().uuid(), s: z.string().min(1) });
type TunnelToken = z.infer<typeof tunnelTokenSchema>;

export function parseTunnelToken(raw: string): TunnelToken | null {
  const token = raw.trim();
  if (!BASE64_PATTERN.test(token)) return null;
  const parsed = tunnelTokenSchema.safeParse(safeJsonParse(Buffer.from(token, "base64").toString("utf8")));
  return parsed.success ? parsed.data : null;
}
