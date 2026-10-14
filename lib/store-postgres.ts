import postgres from "postgres";
import { investigationRecordSchema, type InvestigationRecord } from "./contracts";
import { registerPostgres, type Store } from "./store";

/**
 * Postgres-backed investigation index. The table is created on first use so
 * a fresh Neon/Supabase/RDS database needs no migration step for the demo.
 * In the customer story this table lives in their RDS: the "sessions store"
 * that cannot move stays where it is.
 */
class PostgresStore implements Store {
  readonly kind = "postgres" as const;
  private readonly sql;
  private ready: Promise<void> | null = null;

  constructor(url: string) {
    this.sql = postgres(url, { max: 2, idle_timeout: 20, connect_timeout: 10, prepare: false });
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
        result jsonb
      )`.then(() => undefined);
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
    });
  }

  async create(record: InvestigationRecord) {
    await this.init();
    const r = investigationRecordSchema.parse(record);
    await this.sql`
      INSERT INTO investigations (run_id, incident_id, status, fault, created_at, completed_at, model, cost_usd, title, result)
      VALUES (${r.runId}, ${r.incidentId}, ${r.status}, ${r.fault}, ${r.createdAt}, ${r.completedAt}, ${r.model}, ${r.costUsd}, ${r.title}, ${this.sql.json(r.result as never)})
      ON CONFLICT (run_id) DO NOTHING`;
  }

  async update(runId: string, patch: Partial<InvestigationRecord>) {
    await this.init();
    const current = await this.get(runId);
    if (!current) return;
    const r = investigationRecordSchema.parse({ ...current, ...patch });
    await this.sql`
      UPDATE investigations SET status = ${r.status}, completed_at = ${r.completedAt}, model = ${r.model},
        cost_usd = ${r.costUsd}, title = ${r.title}, result = ${this.sql.json(r.result as never)}
      WHERE run_id = ${runId}`;
  }

  async get(runId: string) {
    await this.init();
    const rows = await this.sql`SELECT * FROM investigations WHERE run_id = ${runId} LIMIT 1`;
    return rows.length ? this.row(rows[0]) : null;
  }

  async list({ incidentId, limit = 12 }: { incidentId?: string; limit?: number } = {}) {
    await this.init();
    const rows = incidentId
      ? await this.sql`SELECT run_id, incident_id, status, fault, created_at, completed_at, model, cost_usd, title FROM investigations WHERE incident_id = ${incidentId} ORDER BY created_at DESC LIMIT ${limit}`
      : await this.sql`SELECT run_id, incident_id, status, fault, created_at, completed_at, model, cost_usd, title FROM investigations ORDER BY created_at DESC LIMIT ${limit}`;
    return rows.map((r) => this.row({ ...r, result: null }));
  }
}

registerPostgres((url) => new PostgresStore(url));
