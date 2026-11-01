import { constants } from "node:fs";
import { dirname } from "node:path";
import { access, realpath, rename, writeFile } from "node:fs/promises";

import { UPDATE_HEALTH_TIMEOUT_MS, updateHealthPath, updateReceiptSchema, updateRequestSchema } from "./updateFiles.ts";

const WAIT_MS = 250;
const EXIT_TIMEOUT_MS = 60_000;
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const requestPath = process.argv[2];
if (!requestPath) throw new Error("Missing update handoff.");
const request = updateRequestSchema.parse(await Bun.file(requestPath).json());
async function receipt(phase: "healthy" | "failed" | "restored", message: string): Promise<void> {
  await writeFile(`${request.receiptPath}.tmp`, JSON.stringify({ nonce: request.nonce, version: request.manifest.version, phase, message }), { mode: 0o600 });
  await rename(`${request.receiptPath}.tmp`, request.receiptPath);
}
async function launch(): Promise<void> {
  const environment = { ...process.env };
  delete environment.KANBAN_CODEX_BINARY;
  if (environment.KANBAN_CLAUDE_BINARY?.startsWith(`${dirname(request.receiptPath)}/bin/claude-`)) delete environment.KANBAN_CLAUDE_BINARY;
  const proc = Bun.spawn(["/usr/bin/open", request.appPath], { env: environment, stdout: "ignore", stderr: "ignore", timeout: EXIT_TIMEOUT_MS });
  if (await proc.exited !== 0) throw new Error("Cannot launch the application.");
}
if (await realpath(request.appPath) !== request.appPath || !request.appPath.endsWith("/Atelier.app") || !request.backupPath.startsWith(`${dirname(request.appPath)}/.Atelier.previous-`) || !request.stagedApp.startsWith(`${dirname(request.appPath)}/.atelier-update-`)) throw new Error("Invalid local update destinations.");
await access(dirname(request.appPath), constants.W_OK);
await writeFile(request.readyPath, request.nonce, { mode: 0o600 });
let movedOld = false;
let movedNew = false;
let launched = false;
try {
  const exitDeadline = Date.now() + EXIT_TIMEOUT_MS;
  for (;;) {
    let alive = true;
    try { process.kill(request.pid, 0); } catch { alive = false; }
    if (!alive) break;
    if (Date.now() > exitDeadline) throw new Error("Old application did not stop; no replacement performed.");
    await delay(WAIT_MS);
  }
  await rename(request.appPath, request.backupPath);
  movedOld = true;
  await rename(request.stagedApp, request.appPath);
  movedNew = true;
  await launch();
  launched = true;
  const healthDeadline = Date.now() + UPDATE_HEALTH_TIMEOUT_MS;
  while (Date.now() < healthDeadline) {
    const result = updateReceiptSchema.safeParse(await Bun.file(updateHealthPath(request.receiptPath, request.nonce)).json().catch(() => null));
    if (result.success && result.data.nonce === request.nonce && result.data.version === request.manifest.version) {
      if (result.data.phase === "healthy") {
        await receipt("healthy", result.data.message ?? "Application health confirmed.");
        process.exit(0);
      }
      if (result.data.phase === "failed") throw new Error(result.data.message ?? "New application health failed.");
    }
    await delay(WAIT_MS);
  }
  await receipt("failed", "New application health was not confirmed. The previous app remains in its backup; stop the new app before restoring it. No database rollback was performed.");
} catch (error) {
  const message = error instanceof Error ? error.message : "Desktop update failed.";
  if (movedOld && !launched) {
    try {
      if (movedNew) await rename(request.appPath, request.stagedApp);
      await rename(request.backupPath, request.appPath);
      await receipt("restored", `${message} Previous application restored; user data was not rolled back.`);
      await launch();
    } catch { await receipt("failed", `${message} Automatic app restoration failed; the previous application remains at ${request.backupPath}.`); }
  } else {
    await receipt("failed", movedOld ? `${message} The previous application remains at ${request.backupPath}. Stop the new app before restoring it; no database rollback was performed.` : message);
  }
  process.exitCode = 1;
}
