"use client";

import { useState } from "react";

type Tab = "topology" | "overview" | "register";

/**
 * Keyboard-accessible evidence tabs. Keep the register mounted so it can
 * retain a run snapshot before the responder chooses to inspect it.
 */
export function EvidenceTabs({
  hasTopology,
  topology,
  overview,
  register,
}: {
  hasTopology: boolean;
  topology: React.ReactNode;
  overview: React.ReactNode;
  register: React.ReactNode;
}) {
  const tabs: Tab[] = hasTopology ? ["topology", "overview", "register"] : ["overview", "register"];
  const [tab, setTab] = useState<Tab>(tabs[0]);
  const labels: Record<Tab, string> = {
    topology: "Blast radius & owners",
    overview: "Overview",
    register: "Evidence register",
  };

  return (
    <div>
      <div className="tabs" role="tablist" aria-label="Evidence view">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            id={`tab-${t}`}
            className="tab"
            aria-selected={tab === t}
            aria-controls="evidence-panel"
            tabIndex={tab === t ? 0 : -1}
            onClick={() => setTab(t)}
            onKeyDown={(event) => {
              const index = tabs.indexOf(t);
              const next =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? tabs.length - 1
                    : event.key === "ArrowRight"
                      ? (index + 1) % tabs.length
                      : event.key === "ArrowLeft"
                        ? (index - 1 + tabs.length) % tabs.length
                        : -1;
              if (next < 0) return;
              event.preventDefault();
              setTab(tabs[next]);
              document.getElementById(`tab-${tabs[next]}`)?.focus();
            }}
          >
            {labels[t]}
          </button>
        ))}
      </div>
      <div id="evidence-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {/* Keep the register subscribed while another tab is visible so a completed
            run cannot lose its evidence snapshot before the user opens this tab. */}
        <div hidden={tab !== "topology"}>{topology}</div>
        <div hidden={tab !== "overview"}>{overview}</div>
        <div hidden={tab !== "register"}>{register}</div>
      </div>
    </div>
  );
}
