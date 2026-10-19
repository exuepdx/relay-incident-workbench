"use client";

import { useEffect, useState } from "react";
import type { Evidence } from "@/lib/contracts";
import { Icon } from "./icons";

/** Every evidence item the agent can cite, addressable by id for citation links. */
export function EvidenceRegister({
  evidence,
  note,
  followRun = false,
}: {
  evidence: Evidence[];
  note?: string;
  followRun?: boolean;
}) {
  const [snapshot, setSnapshot] = useState<{ evidence: Evidence[]; runId: string } | null>(null);
  useEffect(() => {
    if (!followRun) return;
    const update = (event: Event) => setSnapshot((event as CustomEvent).detail);
    window.addEventListener("relay:evidence", update);
    return () => window.removeEventListener("relay:evidence", update);
  }, [followRun]);
  const items = snapshot?.evidence ?? evidence;
  const description = snapshot
    ? `Evidence retained for ${snapshot.runId}. Catalog changes do not replace these sources.`
    : note;
  return (
    <div className="register">
      {description && (
        <p className="muted" style={{ fontSize: "var(--text-sm)" }}>
          {description}
        </p>
      )}
      {items.map((item) => (
        <article id={`evidence-${item.id}`} className="panel evidence" key={item.id}>
          <div className="evidence-top">
            <span className="cite">{item.id}</span>
            <span className="chip">{item.kind}</span>
          </div>
          <h3>{item.title}</h3>
          <p>{item.detail}</p>
          <footer>
            <Icon name="layers" size={13} /> {item.source}
          </footer>
        </article>
      ))}
    </div>
  );
}
