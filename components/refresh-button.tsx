"use client";

import { useTransition } from "react";
import { refreshIncident } from "@/app/actions";
import { Icon } from "./icons";

/** Re-reads this incident from the customer API by expiring its cache tag. */
export function RefreshButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button className="btn btn-ghost" disabled={pending} onClick={() => startTransition(() => refreshIncident(id))} title="Expire this incident's cached segment and re-read it from the telemetry API">
      <Icon name="refresh" size={14} /> {pending ? "Refreshing…" : "Refresh from source"}
    </button>
  );
}
