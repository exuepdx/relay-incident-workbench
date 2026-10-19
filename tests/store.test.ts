import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFileStore, getStore, resetStore } from "../lib/store";

test("production selects Postgres without a separate registration import and fails closed without a URL", () => {
  const before = { NODE_ENV: process.env.NODE_ENV, DATABASE_URL: process.env.DATABASE_URL };
  try {
    Object.assign(process.env, { NODE_ENV: "production" });
    process.env.DATABASE_URL = "postgres://probe:probe@localhost:5432/probe";
    resetStore();
    assert.equal(getStore().kind, "postgres");
    delete process.env.DATABASE_URL;
    resetStore();
    assert.throws(() => getStore(), /DATABASE_URL is required/);
  } finally {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    resetStore();
  }
});

test("the file store round-trips records and lists newest first without results", async () => {
  const store = createFileStore(join(mkdtempSync(join(tmpdir(), "relay-")), "investigations.json"));
  assert.equal(store.kind, "file");
  const base = {
    incidentId: "INC-0244",
    status: "running" as const,
    fault: "none" as const,
    completedAt: null,
    model: null,
    costUsd: null,
    title: null,
    result: null,
  };
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

test("replay preserves a completed record and missing updates fail visibly", async () => {
  const store = createFileStore(join(mkdtempSync(join(tmpdir(), "relay-")), "index.json"));
  const row = {
    runId: "wrun_replay",
    incidentId: "INC-0244",
    status: "running" as const,
    fault: "none" as const,
    createdAt: "2026-10-18T00:00:00Z",
    completedAt: null,
    model: null,
    costUsd: null,
    title: null,
    result: null,
  };
  await store.create(row);
  await store.update(row.runId, { status: "completed", result: { report: "retained" } });
  await store.create(row);
  assert.equal((await store.get(row.runId))?.status, "completed");
  await assert.rejects(store.update("missing", { status: "failed" }), /missing/);
});

test("a lost start response reconnects through its persisted request key without another dispatch", async () => {
  const path = join(mkdtempSync(join(tmpdir(), "relay-")), "index.json");
  const store = createFileStore(path);
  assert.deepEqual(await store.claimStart("request-123", "fingerprint"), { created: true, runId: null });
  assert.deepEqual(await store.claimStart("request-123", "fingerprint"), { created: false, runId: null });
  await store.bindStart("request-123", "wrun_original");
  const fresh = createFileStore(path);
  assert.deepEqual(await fresh.claimStart("request-123", "fingerprint"), { created: false, runId: "wrun_original" });
  await assert.rejects(fresh.claimStart("request-123", "different"), /different inputs/);
  await assert.rejects(fresh.bindStart("request-123", "wrun_duplicate"), /another run/);
});
