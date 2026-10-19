"use client";

import { useRef, useId } from "react";
import type { Evidence } from "@/lib/contracts";

/** Each report owns its source snapshot, including when two runs are compared. */
export function CitationButton({ id, evidence }: { id: string; evidence: Evidence[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const item = evidence.find((e) => e.id === id);
  return (
    <>
      <button className="cite" onClick={() => dialog.current?.showModal()} aria-label={`View evidence ${id}`}>
        {id} ↗
      </button>
      <dialog ref={dialog} className="evidence-dialog" aria-labelledby={titleId}>
        <div className="panel-head">
          <span className="eyebrow">Run evidence · {id}</span>
          <button className="btn" onClick={() => dialog.current?.close()} autoFocus>
            Close
          </button>
        </div>
        <div className="panel-body">
          <h3 id={titleId}>{item?.title ?? "Source unavailable in this historical run"}</h3>
          <p>
            {item?.detail ??
              "This run did not retain this evidence. Do not rely on the citation; run a fresh investigation."}
          </p>
          {item && (
            <p className="note">
              {item.kind} · {item.source}
            </p>
          )}
          <p className="note">
            Snapshot retained with this run. A citation identifies a source; it does not prove the interpretation is
            correct.
          </p>
        </div>
      </dialog>
    </>
  );
}
