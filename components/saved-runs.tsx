import Link from "next/link";
import { getStore } from "@/lib/store";
import "@/lib/store-postgres";
import { Icon } from "./icons";

/**
 * Recent investigations for this incident, read from the index at request
 * time (never cached). Opening one resumes it in the investigator panel.
 */
export async function SavedRuns({ incidentId }: { incidentId: string }) {
  const store = getStore();
  const runs = await store.list({ incidentId, limit: 8 });
  return (
    <section className="panel" aria-label="Saved investigations">
      <div className="panel-head">
        <div>
          <h3>Saved investigations</h3>
          <p>
            {runs.length ? `${runs.length} on record` : "None yet"} · index in{" "}
            {store.kind === "postgres" ? "Postgres" : store.kind === "file" ? "a local file" : "memory"}
          </p>
        </div>
        <Icon name="clock" size={16} />
      </div>
      <div className="panel-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
        {runs.length === 0 ? (
          <p className="empty">Run an investigation and it will be listed here, across browsers and refreshes.</p>
        ) : (
          <div className="runs">
            {runs.map((run) => (
              <Link key={run.runId} className="run-row" href={`/incidents/${incidentId}?run=${run.runId}`}>
                <div>
                  <strong>
                    {run.title ??
                      (run.status === "running"
                        ? "In progress…"
                        : run.status === "failed"
                          ? "Did not complete"
                          : "Investigation")}
                  </strong>
                  <small>
                    {new Date(run.createdAt).toLocaleString()} · {run.model ?? "model pending"}
                    {run.costUsd ? ` · $${Number(run.costUsd).toFixed(4)}` : ""}
                    {run.fault !== "none" ? ` · drill: ${run.fault}` : ""}
                  </small>
                </div>
                <span
                  className={`chip ${run.status === "completed" ? "green" : run.status === "failed" ? "red" : "violet"}`}
                >
                  {run.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
