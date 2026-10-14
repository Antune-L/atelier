import { renameSync, writeFileSync } from "node:fs";

import type { AgentExecutionGuard } from "./agentSession.ts";

const POLICY_REFRESH_MS = 100;
const POLICY_LEASE_MS = 1_000;
export const AUTONOMOUS_NATIVE_DELEGATION_DENIAL = "Autonomous child sessions require backend-owned delegation; use delegate_implementation or delegate_review.";

export function prepareAutonomousPermission(guard: AgentExecutionGuard | undefined, path: string) {
  let revoked = false;
  const refresh = (): void => {
    let policy = { allowed: false, deadlineAt: 0, leaseUntil: 0 };
    if (!revoked && guard) {
      try {
        const snapshot = guard.snapshot();
        if (!snapshot.allowed) revoked = true;
        policy = { allowed: snapshot.allowed, deadlineAt: snapshot.deadlineAt ?? 0, leaseUntil: Date.now() + POLICY_LEASE_MS };
      } catch {
        revoked = true;
      }
    }
    const temporary = `${path}.next`;
    writeFileSync(temporary, JSON.stringify(policy), { encoding: "utf8", mode: 0o600 });
    renameSync(temporary, path);
  };
  const revoke = (): void => {
    revoked = true;
    try {
      refresh();
    } catch {
      return;
    }
  };
  if (!guard) return { revoke: () => {}, cleanup: () => {} };
  refresh();
  const refreshSafely = (): void => {
    try {
      refresh();
    } catch {
      revoked = true;
    }
  };
  const unsubscribe = guard.subscribe(refreshSafely);
  const timer = setInterval(refreshSafely, POLICY_REFRESH_MS);
  timer.unref();
  return {
    revoke,
    cleanup: () => {
      clearInterval(timer);
      unsubscribe();
    },
  };
}

export function autonomousPermissionScript(path: string): string {
  return `import { readFileSync } from "node:fs";
try {
  const policy = JSON.parse(readFileSync(${JSON.stringify(path)}, "utf8"));
  const now = Date.now();
  if (policy.allowed !== true || typeof policy.deadlineAt !== "number" || !Number.isFinite(policy.deadlineAt) || now >= policy.deadlineAt || typeof policy.leaseUntil !== "number" || !Number.isFinite(policy.leaseUntil) || now >= policy.leaseUntil) process.exit(1);
} catch { process.exit(1); }
`;
}

export function watchAutonomousPermission(guard: AgentExecutionGuard | undefined, onRevoked: () => void): () => void {
  if (!guard) return () => {};
  let notified = false;
  const check = (): void => {
    if (notified) return;
    let allowed = false;
    try {
      const snapshot = guard.snapshot();
      allowed = snapshot.allowed && snapshot.deadlineAt !== null && Date.now() < snapshot.deadlineAt;
    } catch {
      allowed = false;
    }
    if (!allowed) {
      notified = true;
      queueMicrotask(onRevoked);
    }
  };
  const unsubscribe = guard.subscribe(check);
  const timer = setInterval(check, POLICY_REFRESH_MS);
  timer.unref();
  check();
  return () => {
    clearInterval(timer);
    unsubscribe();
  };
}
