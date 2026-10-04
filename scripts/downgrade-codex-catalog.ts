import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";

import { assertCodexDowngradeSafe, CODEX_DOWNGRADE_TARGET, migrateCodexCatalog } from "../src/server/db/schema.ts";
import { DEFAULT_CODEX_MODEL } from "../src/shared/constants.ts";

const APPLY_FLAG = "--apply";

function scalar(db: Database, sql: string, param: string): number {
  const row = db.query(sql).get(param);
  return row && typeof row === "object" && "n" in row && typeof row.n === "number" ? row.n : 0;
}

function main(): void {
  const databasePath = process.argv.slice(2).find((arg) => arg !== APPLY_FLAG);
  if (!databasePath) throw new Error(`usage: bun scripts/downgrade-codex-catalog.ts <database> [${APPLY_FLAG}]`);
  if (!existsSync(databasePath)) throw new Error(`database not found: ${databasePath}`);

  const apply = process.argv.includes(APPLY_FLAG);
  const db = new Database(databasePath);
  try {
    assertCodexDowngradeSafe(db);
    const conversions = scalar(
      db,
      "SELECT COUNT(*) AS n FROM tickets WHERE codex_model IS NOT NULL AND codex_model <> ?",
      DEFAULT_CODEX_MODEL,
    ) + scalar(
      db,
      "SELECT COUNT(*) AS n FROM profiles WHERE codex_model IS NOT NULL AND codex_model <> ?",
      DEFAULT_CODEX_MODEL,
    );
    console.log(`Application target: ${CODEX_DOWNGRADE_TARGET}`);
    console.log(`Non-Terra Codex configurations to convert explicitly to Terra: ${conversions}`);
    if (!apply) {
      console.log(`Dry run only. Re-run with ${APPLY_FLAG} to apply.`);
      return;
    }

    const snapshotPath = `${databasePath}.before-downgrade-${CODEX_DOWNGRADE_TARGET.slice(0, 12)}.sqlite`;
    if (existsSync(snapshotPath)) throw new Error(`downgrade snapshot already exists: ${snapshotPath}`);
    db.query("VACUUM INTO ?").run(snapshotPath);
    migrateCodexCatalog(db, "downgrade");
    console.log(`Consistent snapshot: ${snapshotPath}`);
    console.log("Data downgrade applied; tickets, comments, results, runs and usage were preserved.");
  } finally {
    db.close();
  }
}

main();
