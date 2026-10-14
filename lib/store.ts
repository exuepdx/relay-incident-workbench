import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
}

class MemoryStore implements Store {
  protected rows = new Map<string, InvestigationRecord>();
  constructor(readonly kind: Store["kind"] = "memory") {}
  async create(record: InvestigationRecord) {
    this.rows.set(record.runId, investigationRecordSchema.parse(record));
    this.persist();
  }
  async update(runId: string, patch: Partial<InvestigationRecord>) {
    const current = this.rows.get(runId);
    if (!current) return;
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
      .map((r) => ({ ...r, result: null }));
  }
  protected persist() {}
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
      const rows = JSON.parse(readFileSync(this.path, "utf8")) as InvestigationRecord[];
      this.rows = new Map(rows.map((r) => [r.runId, r]));
    } catch {
      this.rows = new Map();
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
  protected override persist() {
    mkdirSync(join(this.path, ".."), { recursive: true });
    writeFileSync(this.path, JSON.stringify([...this.rows.values()], null, 2));
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
  else if (process.env.NODE_ENV !== "production") instance = new FileStore(join(process.cwd(), ".data", "investigations.json"));
  else {
    console.warn("DATABASE_URL is not set; saved investigations will not persist across function instances.");
    instance = new MemoryStore();
  }
  return instance;
}

/** Test seams. */
export function resetStore(store?: Store) {
  instance = store ?? null;
}
export function createFileStore(path: string): Store {
  return new FileStore(path);
}
