import type { ProgressEvent } from "@/lib/contracts";
import { Icon } from "./icons";

const toolLabel: Record<string, string> = {
  getIncident: "Read the incident record",
  getServiceMetrics: "getServiceMetrics",
  getSlowTraces: "getSlowTraces",
  getRecentChanges: "getRecentChanges",
  proposeMitigation: "proposeMitigation",
  getEvidenceRegister: "Validate citations against the register",
};

export type TimelineRow = {
  key: string;
  state: "done" | "active" | "retry" | "failed" | "waiting";
  title: string;
  detail?: string;
  ms?: number;
};

/** Fold the progress stream into one row per step, newest state wins. */
export function foldTimeline(events: ProgressEvent[], terminal: "completed" | "failed" | null): TimelineRow[] {
  const rows = new Map<string, TimelineRow>();
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
      rows.delete("model");
      rows.set("model", {
        key: "model",
        state: e.status === "completed" ? "done" : "active",
        title:
          e.status === "completed"
            ? `Report written by ${e.model ?? "model"}`
            : `Agent reasoning with ${e.model ?? "model"}`,
        detail: e.status === "completed" ? undefined : "Calls tools as durable steps, then writes the report.",
        ms: e.ms,
      });
    } else if (e.type === "pause") {
      rows.set("pause", {
        key: "pause",
        state: e.status === "completed" ? "done" : "waiting",
        title:
          e.status === "completed"
            ? `Held ${e.seconds} s · resumed on the current deployment`
            : `Holding ${e.seconds} s · push a deploy now`,
        detail: e.status === "completed" ? undefined : "A durable sleep. The run survives a redeploy and resumes here.",
      });
    } else if (e.type === "approval") {
      rows.delete("approval");
      rows.set("approval", {
        key: "approval",
        state: e.status === "requested" ? "waiting" : e.status === "expired" ? "failed" : "done",
        title:
          e.status === "requested"
            ? "Awaiting service-owner approval"
            : e.status === "approved"
              ? "Mitigation approved by the owner"
              : e.status === "declined"
                ? "Mitigation declined by the owner"
                : "Approval window expired",
        detail: e.detail,
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
  const ordered = [...rows.values()];
  if (modelOpen && terminal === null) {
    const i = ordered.findIndex((r) => r.key === "model");
    if (i >= 0) ordered.push(...ordered.splice(i, 1));
  }
  return ordered;
}

export function RunTimeline({ rows }: { rows: TimelineRow[] }) {
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
            ) : row.state === "waiting" ? (
              <Icon name="clock" size={12} />
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
