import type { ProgressEvent } from "@/lib/contracts";
import { Icon } from "./icons";

const toolLabel: Record<string, string> = {
  getIncident: "Read the incident record",
  getServiceMetrics: "getServiceMetrics",
  getSlowTraces: "getSlowTraces",
  getRecentChanges: "getRecentChanges",
  getEvidenceRegister: "Validate citations against the register",
};

type Row = { key: string; state: "done" | "active" | "retry" | "failed"; title: string; detail?: string; ms?: number };

/** Fold the progress stream into one row per step, newest state wins. */
export function foldTimeline(events: ProgressEvent[], terminal: "completed" | "failed" | null): Row[] {
  const rows = new Map<string, Row>();
  let modelOpen = false;
  for (const e of events) {
    if (e.type === "run") {
      if (e.status === "started")
        rows.set("run", { key: "run", state: "done", title: "Durable run started", detail: e.detail });
      if (e.status === "completed")
        rows.set("done", { key: "done", state: "done", title: "Report validated and saved", detail: e.detail });
      if (e.status === "failed")
        rows.set("done", { key: "done", state: "failed", title: "Run stopped without a diagnosis", detail: e.detail });
    } else if (e.type === "model") {
      modelOpen = e.status === "started";
      rows.set("model", {
        key: "model",
        state: e.status === "completed" ? "done" : "active",
        title:
          e.status === "completed"
            ? `Report written by ${e.model ?? "model"}`
            : `Agent reasoning with ${e.model ?? "model"}`,
        detail: e.status === "completed" && e.ms ? undefined : "Calls tools as durable steps, then writes the report.",
        ms: e.ms,
      });
    } else {
      const key = `${e.tool}`;
      const title = toolLabel[e.tool] ?? e.tool;
      const attempt = e.attempt > 1 ? ` · attempt ${e.attempt}` : "";
      if (e.status === "started")
        rows.set(key, { key, state: "active", title: `${title}${attempt}`, detail: "Calling the telemetry API…" });
      if (e.status === "retrying")
        rows.set(key, { key, state: "retry", title: `${title}${attempt}`, detail: e.summary, ms: e.ms });
      if (e.status === "failed")
        rows.set(key, { key, state: "failed", title: `${title}${attempt}`, detail: e.summary, ms: e.ms });
      if (e.status === "completed")
        rows.set(key, { key, state: "done", title: `${title}${attempt}`, detail: e.summary, ms: e.ms });
    }
  }
  // Keep insertion order but make sure the model row sits after the tools it waited on.
  const ordered = [...rows.values()];
  if (modelOpen && terminal === null) {
    const i = ordered.findIndex((r) => r.key === "model");
    if (i >= 0) ordered.push(...ordered.splice(i, 1));
  }
  return ordered;
}

export function RunTimeline({ rows }: { rows: Row[] }) {
  return (
    <div className="timeline" aria-live="polite">
      {rows.map((row) => (
        <div key={row.key} className={`tl ${row.state}`}>
          <span className="ic">
            {row.state === "done" ? (
              <Icon name="check" size={12} />
            ) : row.state === "failed" ? (
              <Icon name="close" size={12} />
            ) : row.state === "retry" ? (
              <Icon name="refresh" size={12} />
            ) : (
              <span className="pulse" />
            )}
          </span>
          <div>
            <strong>{row.title}</strong>
            {row.detail && <small>{row.detail}</small>}
          </div>
          <span className="ms">{row.ms !== undefined ? `${row.ms} ms` : ""}</span>
        </div>
      ))}
    </div>
  );
}
