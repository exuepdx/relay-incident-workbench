import Link from "next/link";
import type { InvestigationRecord } from "@/lib/contracts";
import { getStore } from "@/lib/store";
import { Icon } from "./icons";

/**
 * Recent investigations for this incident, read from the index at request
 * time (never cached). Opening one resumes it in the investigator panel.
 */
export async function SavedRuns({ incidentId }: { incidentId: string }) {
  let store;
  let runs: InvestigationRecord[];
  try {
    store = getStore();
    runs = await store.list({ incidentId, limit: 8 });
  } catch (error) {
    console.error("saved_runs_unavailable", error instanceof Error ? error.message : "storage error");
    return (
      <section className="panel" aria-label="Saved investigations">
        <div className="panel-body">
          <h3>Saved investigations unavailable</h3>
          <p role="status">
            The report store could not be reached. Refresh to reconnect; existing run links can be retried.
          </p>
        </div>
      </section>
    );
  }
  return (
    <section className="panel" aria-label="Saved investigations">
      <div className="panel-head">
        <div>
          <h3>Saved investigations</h3>
          <p>{runs.length ? `${runs.length} recent runs` : "No saved runs"}</p>
        </div>
        <Icon name="clock" size={16} />
      </div>
      <div className="panel-body" style={{ paddingTop: 8, paddingBottom: 8 }}>
        {runs.length === 0 ? (
          <p className="empty">Your investigations will appear here. Open a saved run to view its status or report.</p>
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
                    {new Date(run.createdAt).toISOString().slice(0, 19).replace("T", " ")} UTC ·{" "}
                    {run.model ?? "model pending"}
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
