import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { nanoid } from "nanoid";

/** A fresh, disposable SQLite path under the OS temp dir (not created on disk until a DB opens it). */
export function tmpDbPath(): string {
  return join(tmpdir(), `kanban-test-${nanoid()}.db`);
}

/** Remove a SQLite DB file together with its `-wal`/`-shm` sidecars (all best-effort). */
export function removeDbFiles(path: string): void {
  rmSync(path, { force: true });
  rmSync(`${path}-wal`, { force: true });
  rmSync(`${path}-shm`, { force: true });
}
