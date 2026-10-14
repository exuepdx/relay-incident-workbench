import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileStore } from "../lib/store";

test("the file store round-trips records and lists newest first without results", async () => {
  const store = createFileStore(join(mkdtempSync(join(tmpdir(), "relay-")), "investigations.json"));
  assert.equal(store.kind, "file");
  const base = { incidentId: "INC-0244", status: "running" as const, fault: "none" as const, completedAt: null, model: null, costUsd: null, title: null, result: null };
  await store.create({ ...base, runId: "wrun_test_old", createdAt: "2026-10-13T10:00:00.000Z" });
  await store.create({ ...base, runId: "wrun_test_new", createdAt: "2026-10-13T11:00:00.000Z" });
  await store.update("wrun_test_new", { status: "completed", title: "Done", result: { ok: true } });
  const list = await store.list({ incidentId: "INC-0244", limit: 5 });
  assert.equal(list[0].runId, "wrun_test_new");
  assert.equal(list[0].result, null);
  assert.equal((await store.get("wrun_test_new"))?.title, "Done");
  assert.deepEqual((await store.get("wrun_test_new"))?.result, { ok: true });
  assert.equal(await store.get("missing"), null);
});
