import { Suspense } from "react";
import Link from "next/link";
import { Shell, Topbar } from "@/components/shell";
import { Icon } from "@/components/icons";
import { CompareView } from "@/components/compare";
import { ThemeToggle } from "@/components/theme-toggle";
import { getStore } from "@/lib/store";
import { customer } from "@/lib/customer";
import type { InvestigationResult } from "@/lib/contracts";

/**
 * Two completed investigations of the same incident, side by side: model,
 * cost, time, and the reports. The Gateway story made tangible.
 */
export default function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <Shell>
          <main className="page">
            <div className="skeleton" style={{ height: 320 }} />
          </main>
        </Shell>
      }
    >
      <Compare params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Compare({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { id } = await params;
  const { a, b } = await searchParams;
  const store = getStore();
  const runs = (await store.list({ incidentId: id, limit: 12 })).filter((r) => r.status === "completed");
  const pickA = runs.find((r) => r.runId === a) ?? runs[0];
  const pickB =
    runs.find((r) => r.runId === b && r.runId !== pickA?.runId) ??
    runs.find((r) => r.runId !== pickA?.runId && r.model !== pickA?.model) ??
    runs.find((r) => r.runId !== pickA?.runId);
  const [left, right] = await Promise.all([
    pickA ? store.get(pickA.runId) : null,
    pickB ? store.get(pickB.runId) : null,
  ]);
  return (
    <Shell current={id}>
      <Topbar
        crumbs={
          <>
            <span>{customer.short}</span>
            <span>/</span>
            <Link href={`/incidents/${id}`}>{id}</Link>
            <span>/</span>
            <strong>Compare</strong>
          </>
        }
      >
        <ThemeToggle />
      </Topbar>
      <main id="main" className="page">
        <div className="incident-head enter">
          <div>
            <span className="eyebrow">{id} · side by side</span>
            <h1>Compare investigations</h1>
            <p>Select two completed runs to compare findings, citations, model cost and elapsed time.</p>
          </div>
          <Link href={`/incidents/${id}`} className="btn">
            <Icon name="arrow" size={14} /> Back to the workbench
          </Link>
        </div>
        <CompareView
          incidentId={id}
          runs={runs}
          left={(left?.result as InvestigationResult | null) ?? null}
          right={(right?.result as InvestigationResult | null) ?? null}
          leftId={left?.runId ?? null}
          rightId={right?.runId ?? null}
        />
      </main>
    </Shell>
  );
}
