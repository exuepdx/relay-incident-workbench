import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import postgres from "postgres";
import { PostgresStore } from "../lib/store-postgres";
import type { InvestigationRecord } from "../lib/contracts";

// Integration check for the hosted adapter. Uses only uniquely named probe rows
// and removes those exact rows afterward; never clears an existing table.
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for the Postgres integration check");
  const id = `probe_${randomUUID()}`;
  const key = randomUUID();
  const store = new PostgresStore(url);
  const fresh = new PostgresStore(url);
  const sql = postgres(url, { max: 1 });
  const record: InvestigationRecord = {
    runId: id,
    incidentId: "INC-0244",
    status: "running",
    fault: "none",
    createdAt: new Date().toISOString(),
    completedAt: null,
    model: null,
    costUsd: null,
    title: null,
    result: null,
    approval: null,
  };
  try {
    await store.create(record);
    await Promise.all([store.update(id, { title: "Probe retained" }), store.update(id, { costUsd: "0.000000" })]);
    await store.update(id, { status: "completed" });
    await store.create(record);
    const read = await fresh.get(id);
    assert.equal(read?.status, "completed");
    assert.equal(read.title, "Probe retained");
    assert.equal(read.costUsd, "0.000000");
    const claims = await Promise.all([store.claimStart(key, "same-input"), fresh.claimStart(key, "same-input")]);
    assert.equal(claims.filter((c) => c.created).length, 1);
    await store.bindStart(key, id);
    assert.equal((await fresh.claimStart(key, "same-input")).runId, id);
    await assert.rejects(() => fresh.claimStart(key, "different-input"), /different inputs/);
    await assert.rejects(() => store.update(`${id}_missing`, { title: "missing" }), /missing/);
    await writeFile(
      "artifacts/postgres-verification.json",
      JSON.stringify(
        {
          verifiedAt: new Date().toISOString(),
          adapter: "postgres",
          passed: true,
          checks: [
            "concurrent partial updates preserve fields",
            "replayed create preserves completion",
            "fresh connection reads saved state",
            "only one concurrent start claim wins",
            "lost response reconnects to bound run",
            "changed inputs rejected",
            "missing update fails visibly",
          ],
        },
        null,
        2,
      ) + "\n",
    );
    console.log("Postgres integration checks passed");
  } finally {
    await sql`DELETE FROM investigation_starts WHERE request_key = ${key}`;
    await sql`DELETE FROM investigations WHERE run_id = ${id}`;
    await Promise.all([store.close(), fresh.close(), sql.end()]);
  }
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Postgres check failed");
  process.exitCode = 1;
});
