import { Database } from "bun:sqlite";
import { existsSync } from "node:fs";

import { assertCodexDowngradeSafe, CODEX_DOWNGRADE_TARGET, migrateCodexCatalog } from "../src/server/db/schema.ts";

const APPLY_FLAG = "--apply";

function scalar(db: Database, sql: string): number {
  const row = db.query(sql).get();
  return row && typeof row === "object" && "n" in row && typeof row.n === "number" ? row.n : 0;
}

function main(): void {
  const databasePath = process.argv.slice(2).find((arg) => arg !== APPLY_FLAG);
  if (!databasePath) throw new Error(`usage: bun scripts/downgrade-codex-catalog.ts <database> [${APPLY_FLAG}]`);
  if (!existsSync(databasePath)) throw new Error(`base introuvable : ${databasePath}`);

  const apply = process.argv.includes(APPLY_FLAG);
  const db = new Database(databasePath);
  try {
    assertCodexDowngradeSafe(db);
    const conversions = scalar(
      db,
      "SELECT COUNT(*) AS n FROM tickets WHERE codex_model IN ('gpt-6-astra', 'gpt-5.6-sol')",
    ) + scalar(
      db,
      "SELECT COUNT(*) AS n FROM profiles WHERE codex_model IN ('gpt-6-astra', 'gpt-5.6-sol')",
    );
    console.log(`Cible applicative : ${CODEX_DOWNGRADE_TARGET}`);
    console.log(`Configurations Astra/Sol à convertir explicitement vers Terra : ${conversions}`);
    if (!apply) {
      console.log(`Simulation uniquement. Relancer avec ${APPLY_FLAG} pour appliquer.`);
      return;
    }

    const snapshotPath = `${databasePath}.before-downgrade-${CODEX_DOWNGRADE_TARGET.slice(0, 12)}.sqlite`;
    if (existsSync(snapshotPath)) throw new Error(`snapshot de downgrade déjà présent : ${snapshotPath}`);
    db.query("VACUUM INTO ?").run(snapshotPath);
    migrateCodexCatalog(db, "downgrade");
    console.log(`Snapshot cohérent : ${snapshotPath}`);
    console.log("Downgrade de données appliqué ; tickets, commentaires, résultats, exécutions et usages conservés.");
  } finally {
    db.close();
  }
}

main();
