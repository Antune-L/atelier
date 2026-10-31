import { sshHostAliasSchema } from "../../shared/boardLink.ts";
import { BRIDGE_MAX_REQUEST_BYTES, bridgeEnvelopeSchema } from "../../shared/vpsBridge.ts";
import type { BridgeEnvelope, BridgeOp } from "../../shared/vpsBridge.ts";

import { runBoundedCommand, safeJsonParse } from "./boundedCommand.ts";
import type { BoundedCommandResult } from "./boundedCommand.ts";
import { NON_INTERACTIVE_SSH_OPTIONS } from "./previewCleanup.ts";

// NOTE: installed by kanban-upgrade from the reviewed commit (root:root 0755); see deploy/vps/kanban-bridge.
export const VPS_BRIDGE_REMOTE_PROGRAM = "/usr/local/bin/kanban-bridge";
export const VPS_BRIDGE_PROGRAM_VERSION_ARG = "program-version";
const VPS_BRIDGE_TIMEOUT_MS = 45_000;
const VPS_BRIDGE_MAX_STDOUT_CHARS = 1_000_000;
const VPS_BRIDGE_MAX_STDERR_CHARS = 4_000;
const VPS_BRIDGE_DETAIL_MAX_CHARS = 300;
const EXIT_SSH_FAILURE = 255;
export const EXIT_BRIDGE_USAGE = 64;
export const EXIT_NOT_EXECUTABLE = 126;
export const EXIT_NOT_FOUND = 127;
const SSH_AUTH_FAILURE_PATTERN = /permission denied|too many authentication failures|no mutual signature/i;
const SSH_HOST_KEY_FAILURE_PATTERN = /host key verification failed|remote host identification has changed|host key is known for/i;

export const VPS_BRIDGE_FAILURE_KINDS = [
  "invalid_request",
  "auth",
  "host_key",
  "unreachable",
  "timeout",
  "remote_missing",
  "version_mismatch",
  "remote_unavailable",
  "bad_output",
] as const;
export type VpsBridgeFailureKind = (typeof VPS_BRIDGE_FAILURE_KINDS)[number];

export interface VpsBridgeCall {
  hostAlias: string;
  op: BridgeOp;
  input: unknown;
}

export type VpsBridgeResult =
  | { ok: true; envelope: BridgeEnvelope }
  | { ok: false; kind: VpsBridgeFailureKind; detail: string };

function failure(kind: VpsBridgeFailureKind, detail: string): VpsBridgeResult {
  return { ok: false, kind, detail: detail.trim().slice(0, VPS_BRIDGE_DETAIL_MAX_CHARS) };
}

function classifyExit(result: BoundedCommandResult): VpsBridgeResult | null {
  if (result.timedOut) return failure("timeout", "");
  if (result.exitCode === 0) return null;
  const detail = result.stderr;
  if (result.exitCode === EXIT_SSH_FAILURE) {
    if (SSH_AUTH_FAILURE_PATTERN.test(detail)) return failure("auth", detail);
    if (SSH_HOST_KEY_FAILURE_PATTERN.test(detail)) return failure("host_key", detail);
    return failure("unreachable", detail);
  }
  if (result.exitCode === EXIT_NOT_FOUND || result.exitCode === EXIT_NOT_EXECUTABLE) return failure("remote_missing", detail);
  if (result.exitCode === EXIT_BRIDGE_USAGE) return failure("version_mismatch", detail);
  return failure("remote_unavailable", detail);
}

export function parseBridgeOutput(stdout: string): VpsBridgeResult {
  const envelope = bridgeEnvelopeSchema.safeParse(safeJsonParse(stdout.trim()));
  return envelope.success ? { ok: true, envelope: envelope.data } : failure("bad_output", "");
}

// NOTE(ali): the JSON input travels on stdin so card content never reaches an argv.
export async function runVpsBridge(call: VpsBridgeCall): Promise<VpsBridgeResult> {
  const alias = sshHostAliasSchema.safeParse(call.hostAlias);
  if (!alias.success) return failure("invalid_request", "invalid SSH host alias");
  const stdin = JSON.stringify(call.input);
  if (Buffer.byteLength(stdin) > BRIDGE_MAX_REQUEST_BYTES) return failure("invalid_request", "request too large");
  let result: BoundedCommandResult;
  try {
    result = await runBoundedCommand(["ssh", ...NON_INTERACTIVE_SSH_OPTIONS, alias.data, VPS_BRIDGE_REMOTE_PROGRAM, call.op], process.cwd(), {
      stdin,
      timeoutMs: VPS_BRIDGE_TIMEOUT_MS,
      maxStdoutChars: VPS_BRIDGE_MAX_STDOUT_CHARS,
      maxStderrChars: VPS_BRIDGE_MAX_STDERR_CHARS,
    });
  } catch (error) {
    return failure("unreachable", error instanceof Error ? error.message : "");
  }
  if (result.truncated) return failure("bad_output", "");
  return classifyExit(result) ?? parseBridgeOutput(result.stdout);
}
