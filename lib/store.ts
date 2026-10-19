import { mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { investigationRecordSchema, type InvestigationRecord } from "./contracts";

/**
 * The investigation index: who ran what, when, with which model, at what
 * cost, and the final report. This is the "sessions store" of the demo.
 *
 * Postgres (DATABASE_URL) in deployed environments; a JSON file in local
 * development; memory as a last resort so the app still works without a
 * database (reads then fall back to the workflow's own retained state).
 */
export interface Store {
  readonly kind: "postgres" | "file" | "memory";
  create(record: InvestigationRecord): Promise<void>;
  update(runId: string, patch: Partial<InvestigationRecord>): Promise<void>;
  get(runId: string): Promise<InvestigationRecord | null>;
  list(options?: { incidentId?: string; limit?: number }): Promise<InvestigationRecord[]>;
  claimStart(key: string, fingerprint: string): Promise<{ created: boolean; runId: string | null }>;
  bindStart(key: string, runId: string): Promise<void>;
}

class MemoryStore implements Store {
  protected rows = new Map<string, InvestigationRecord>();
  protected starts = new Map<string, { fingerprint: string; runId: string | null }>();
  constructor(readonly kind: Store["kind"] = "memory") {}
  async create(record: InvestigationRecord) {
    if (this.rows.has(record.runId)) return; // replay must not erase a completed run
    this.rows.set(record.runId, investigationRecordSchema.parse(record));
    this.persist();
  }
  async update(runId: string, patch: Partial<InvestigationRecord>) {
    const current = this.rows.get(runId);
    if (!current) throw new Error("Investigation index record is missing");
    this.rows.set(runId, investigationRecordSchema.parse({ ...current, ...patch }));
    this.persist();
  }
  async get(runId: string) {
    return this.rows.get(runId) ?? null;
  }
  async list({ incidentId, limit = 12 }: { incidentId?: string; limit?: number } = {}) {
    return [...this.rows.values()]
      .filter((r) => !incidentId || r.incidentId === incidentId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((r) => ({ ...r, result: null, approval: r.approval ? { ...r.approval, token: undefined } : r.approval }));
  }
  protected persist() {}
  async claimStart(key: string, fingerprint: string) {
    const existing = this.starts.get(key);
    if (existing && existing.fingerprint !== fingerprint)
      throw new Error("Request key was reused with different inputs");
    if (existing) return { created: false, runId: existing.runId };
    this.starts.set(key, { fingerprint, runId: null });
    this.persist();
    return { created: true, runId: null };
  }
  async bindStart(key: string, runId: string) {
    const entry = this.starts.get(key);
    if (!entry) throw new Error("Start reservation is missing");
    if (entry.runId && entry.runId !== runId) throw new Error("Start reservation already belongs to another run");
    entry.runId = runId;
    this.persist();
  }
}

class FileStore extends MemoryStore {
  constructor(private readonly path: string) {
    super("file");
    this.load();
  }
  /**
   * Route handlers and workflow steps are separate bundles in development,
   * each with its own module instance, so every operation re-reads the file
   * and writes are read-modify-write. Postgres is the real answer; this just
   * keeps local development honest.
   */
  private load() {
    try {
      const data = JSON.parse(readFileSync(this.path, "utf8"));
      const rows: InvestigationRecord[] = Array.isArray(data) ? data : data.rows;
      this.rows = new Map(rows.map((r) => [r.runId, investigationRecordSchema.parse(r)]));
      this.starts = new Map(Array.isArray(data) ? [] : data.starts);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      this.rows = new Map();
      this.starts = new Map();
    }
  }
  override async create(record: InvestigationRecord) {
    this.load();
    await super.create(record);
  }
  override async update(runId: string, patch: Partial<InvestigationRecord>) {
    this.load();
    await super.update(runId, patch);
  }
  override async get(runId: string) {
    this.load();
    return super.get(runId);
  }
  override async list(options?: { incidentId?: string; limit?: number }) {
    this.load();
    return super.list(options);
  }
  override async claimStart(key: string, fingerprint: string) {
    this.load();
    return super.claimStart(key, fingerprint);
  }
  override async bindStart(key: string, runId: string) {
    this.load();
    return super.bindStart(key, runId);
  }
  protected override persist() {
    mkdirSync(join(this.path, ".."), { recursive: true });
    const temporary = `${this.path}.${process.pid}.tmp`;
    writeFileSync(temporary, JSON.stringify({ rows: [...this.rows.values()], starts: [...this.starts] }, null, 2));
    renameSync(temporary, this.path);
  }
}

let instance: Store | null = null;
let postgresFactory: ((url: string) => Store) | null = null;

/** Registered by lib/store-postgres.ts so this module stays import-light. */
export function registerPostgres(factory: (url: string) => Store) {
  postgresFactory = factory;
}

export function getStore(): Store {
  if (instance) return instance;
  const url = process.env.DATABASE_URL;
  if (url && postgresFactory) instance = postgresFactory(url);
  else if (process.env.NODE_ENV !== "production")
    instance = new FileStore(join(process.cwd(), ".data", "investigations.json"));
  else throw new Error("DATABASE_URL and the Postgres adapter are required in production");
  return instance;
}

/** Test seams. */
export function resetStore(store?: Store) {
  instance = store ?? null;
}
export function createFileStore(path: string): Store {
  return new FileStore(path);
}
