import postgres from "postgres";
import { investigationRecordSchema, type InvestigationRecord } from "./contracts";
import type { Store } from "./store";

/**
 * Postgres-backed investigation index. The table is created on first use so
 * a fresh Neon/Supabase/RDS database needs no migration step for the demo.
 * In the customer story this table lives in their RDS: the "sessions store"
 * that cannot move stays where it is.
 */
export class PostgresStore implements Store {
  readonly kind = "postgres" as const;
  private readonly sql;
  private ready: Promise<void> | null = null;

  constructor(url: string) {
    this.sql = postgres(url, { max: 2, idle_timeout: 20, connect_timeout: 10, prepare: false });
  }

  async close() {
    await this.sql.end();
  }

  private init() {
    this.ready ??= this.sql`
      CREATE TABLE IF NOT EXISTS investigations (
        run_id text PRIMARY KEY,
        incident_id text NOT NULL,
        status text NOT NULL,
        fault text NOT NULL,
        created_at timestamptz NOT NULL,
        completed_at timestamptz,
        model text,
        cost_usd text,
        title text,
        result jsonb,
        approval jsonb
      )`
      .then(() => this.sql`ALTER TABLE investigations ADD COLUMN IF NOT EXISTS approval jsonb`)
      .then(
        () => this.sql`CREATE TABLE IF NOT EXISTS investigation_starts (
        request_key text PRIMARY KEY, fingerprint text NOT NULL, run_id text, created_at timestamptz NOT NULL DEFAULT now()
      )`,
      )
      .then(() => undefined)
      .catch((error) => {
        this.ready = null;
        throw error;
      });
    return this.ready;
  }

  private row(r: Record<string, unknown>): InvestigationRecord {
    return investigationRecordSchema.parse({
      runId: r.run_id,
      incidentId: r.incident_id,
      status: r.status,
      fault: r.fault,
      createdAt: new Date(r.created_at as string).toISOString(),
      completedAt: r.completed_at ? new Date(r.completed_at as string).toISOString() : null,
      model: r.model ?? null,
      costUsd: r.cost_usd ?? null,
      title: r.title ?? null,
      result: r.result ?? null,
      approval: r.approval ?? null,
    });
  }

  async create(record: InvestigationRecord) {
    await this.init();
    const r = investigationRecordSchema.parse(record);
    await this.sql`
      INSERT INTO investigations (run_id, incident_id, status, fault, created_at, completed_at, model, cost_usd, title, result, approval)
      VALUES (${r.runId}, ${r.incidentId}, ${r.status}, ${r.fault}, ${r.createdAt}, ${r.completedAt}, ${r.model}, ${r.costUsd}, ${r.title}, ${this.sql.json(r.result as never)}, ${this.sql.json((r.approval ?? null) as never)})
      ON CONFLICT (run_id) DO NOTHING`;
  }

  async update(runId: string, patch: Partial<InvestigationRecord>) {
    await this.init();
    const p = investigationRecordSchema.partial().parse(patch);
    const rows = await this.sql`
      UPDATE investigations SET
        status = CASE WHEN ${"status" in p} THEN ${p.status ?? null} ELSE status END,
        completed_at = CASE WHEN ${"completedAt" in p} THEN ${p.completedAt ?? null} ELSE completed_at END,
        model = CASE WHEN ${"model" in p} THEN ${p.model ?? null} ELSE model END,
        cost_usd = CASE WHEN ${"costUsd" in p} THEN ${p.costUsd ?? null} ELSE cost_usd END,
        title = CASE WHEN ${"title" in p} THEN ${p.title ?? null} ELSE title END,
        result = CASE WHEN ${"result" in p} THEN ${this.sql.json((p.result ?? null) as never)} ELSE result END,
        approval = CASE WHEN ${"approval" in p} THEN ${this.sql.json((p.approval ?? null) as never)} ELSE approval END
      WHERE run_id = ${runId} RETURNING run_id`;
    if (!rows.length) throw new Error("Investigation index record is missing");
  }

  async claimStart(key: string, fingerprint: string) {
    await this.init();
    const inserted = await this.sql`INSERT INTO investigation_starts (request_key, fingerprint)
      VALUES (${key}, ${fingerprint}) ON CONFLICT DO NOTHING RETURNING request_key`;
    const [row] = await this.sql`SELECT fingerprint, run_id FROM investigation_starts WHERE request_key = ${key}`;
    if (!row || row.fingerprint !== fingerprint) throw new Error("Request key was reused with different inputs");
    return { created: inserted.length > 0, runId: row.run_id as string | null };
  }

  async bindStart(key: string, runId: string) {
    await this.init();
    const rows = await this.sql`UPDATE investigation_starts SET run_id = ${runId}
      WHERE request_key = ${key} AND (run_id IS NULL OR run_id = ${runId}) RETURNING request_key`;
    if (!rows.length) throw new Error("Start reservation is missing or belongs to another run");
  }

  async get(runId: string) {
    await this.init();
    const rows = await this.sql`SELECT * FROM investigations WHERE run_id = ${runId} LIMIT 1`;
    return rows.length ? this.row(rows[0]) : null;
  }

  async list({ incidentId, limit = 12 }: { incidentId?: string; limit?: number } = {}) {
    await this.init();
    const rows = incidentId
      ? await this
          .sql`SELECT run_id, incident_id, status, fault, created_at, completed_at, model, cost_usd, title, approval FROM investigations WHERE incident_id = ${incidentId} ORDER BY created_at DESC LIMIT ${limit}`
      : await this
          .sql`SELECT run_id, incident_id, status, fault, created_at, completed_at, model, cost_usd, title, approval FROM investigations ORDER BY created_at DESC LIMIT ${limit}`;
    return rows.map((r) =>
      this.row({ ...r, result: null, approval: r.approval ? { ...r.approval, token: undefined } : null }),
    );
  }
}
