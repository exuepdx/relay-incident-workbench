import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Shell, Topbar } from "@/components/shell";
import { Icon } from "@/components/icons";
import { LatencyChart } from "@/components/latency-chart";
import { TraceWaterfall } from "@/components/trace-waterfall";
import { EvidenceRegister } from "@/components/evidence-register";
import { EvidenceTabs } from "@/components/evidence-tabs";
import { DependencyMap } from "@/components/dependency-map";
import { Investigator } from "@/components/investigator";
import { SavedRuns } from "@/components/saved-runs";
import { RefreshButton } from "@/components/refresh-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignalCanvas } from "@/components/signal-canvas";
import { CountUp } from "@/components/motion";
import { getIncident } from "@/lib/incidents";
import { customer } from "@/lib/customer";
import { config } from "@/lib/config";

/**
 * One incident. Three rendering tiers on one route:
 *   static shell (build) → cached incident segment (first request, tagged)
 *   → request-time data (saved runs, the live investigation stream).
 */
export default function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<IncidentSkeleton />}>
      <IncidentView params={params} />
    </Suspense>
  );
}

async function IncidentView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const incident = await getIncident(id);
  if (!incident) notFound();
  const k = incident.kpis;
  return (
    <Shell current={incident.id}>
      <Topbar
        crumbs={
          <>
            <span>{customer.short}</span>
            <span>/</span>
            <strong>{incident.id}</strong>
          </>
        }
      >
        <RefreshButton id={incident.id} />
        <ThemeToggle />
      </Topbar>
      <main id="main" className="page">
        <div className="hero-band">
          <SignalCanvas />
          <div className="incident-head enter">
            <div>
              <span className="eyebrow">
                {incident.id} · {incident.window.replace(" / ", " → ")}
              </span>
              <h1>{incident.title}</h1>
              <p>{incident.subtitle}</p>
            </div>
            <div className="incident-meta">
              <span className="chip amber">
                <i /> {incident.severity}
              </span>
              <span className="chip">
                <Icon name="layers" size={13} /> {incident.services.length} services in scope
              </span>
            </div>
          </div>

          <div className="kpis stagger">
            <div className="kpi">
              <span className="label">Checkout p95 latency</span>
              <div className="value">
                <CountUp value={k.p95Ms} from={k.baselineMs} /> <small>ms</small>
                <span className="delta">{k.change}</span>
              </div>
              <span className="foot">Baseline {k.baselineMs} ms</span>
            </div>
            <div className="kpi">
              <span className="label">API error rate</span>
              <div className="value">
                <CountUp value={k.errorRatePct} decimals={1} delay={150} /> <small>%</small>
              </div>
              <span className="foot">Checkout API, incident window</span>
            </div>
            <div className="kpi">
              <span className="label">Known gaps</span>
              <div className="value">
                <CountUp value={incident.coverage.length} delay={300} /> <small>coverage notes</small>
              </div>
              <span className="foot">What the record says is missing</span>
            </div>
          </div>
        </div>

        <div className="grid">
          <section aria-label="Incident evidence" className="enter-late">
            <EvidenceTabs
              hasTopology={Boolean(incident.topology)}
              topology={incident.topology ? <DependencyMap incident={incident} /> : null}
              overview={
                <div className="stack">
                  <div className="panel">
                    <div className="panel-head">
                      <div>
                        <h2>Checkout response time</h2>
                        <p>p95 over the last 30 minutes, from {customer.observabilityShort}</p>
                      </div>
                    </div>
                    <div className="panel-body" style={{ paddingBottom: 0 }}>
                      <LatencyChart incident={incident} />
                    </div>
                    <div className="chart-foot">
                      <Icon name="info" size={14} /> A change near an alert is a lead, not proof of a cause.
                    </div>
                  </div>
                  <div className="panel">
                    <div className="panel-head">
                      <div>
                        <h2>Follow the slow request</h2>
                        <p>Representative trace · {incident.spans.length} spans</p>
                      </div>
                    </div>
                    <div className="panel-body">
                      <TraceWaterfall incident={incident} />
                    </div>
                  </div>
                </div>
              }
              register={
                <EvidenceRegister
                  evidence={incident.coverage}
                  note="The agent is briefed with these coverage notes only. Metrics, traces, and changes are fetched through its tools during a run and appear here when it completes."
                />
              }
            />
          </section>
          <aside className="investigator enter-late" aria-label="Investigation">
            <Investigator
              incidentId={incident.id}
              question={incident.question}
              demoControls={config.demoControls}
              model={config.model}
              fallbackModels={config.fallbackModels}
              comparisonModels={config.comparisonModels}
            />
            <div style={{ height: 16 }} />
            <Suspense
              fallback={
                <div className="panel">
                  <div className="panel-body">
                    <div className="skeleton" style={{ height: 60 }} />
                  </div>
                </div>
              }
            >
              <SavedRuns incidentId={incident.id} />
            </Suspense>
          </aside>
        </div>
      </main>
    </Shell>
  );
}

function IncidentSkeleton() {
  return (
    <Shell>
      <Topbar crumbs={<strong>Loading incident…</strong>} />
      <main className="page">
        <div className="skeleton" style={{ height: 36, width: 420, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 18, width: 560, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 96, marginBottom: 24 }} />
        <div className="grid">
          <div className="skeleton" style={{ height: 480 }} />
          <div className="skeleton" style={{ height: 480 }} />
        </div>
      </main>
    </Shell>
  );
}
