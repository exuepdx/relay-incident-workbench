"use client";

import { useEffect, useState } from "react";

type Tab = "topology" | "overview" | "register";

/**
 * Left-column tabs. Listens for citation clicks from the investigator so a
 * cited id switches to the register and scrolls the item into view.
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

  useEffect(() => {
    function onCite(event: Event) {
      const id = (event as CustomEvent<string>).detail;
      setTab("register");
      requestAnimationFrame(() => {
        const el = document.getElementById(`evidence-${id}`);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("flash");
        setTimeout(() => el.classList.remove("flash"), 1600);
      });
    }
    window.addEventListener("relay:cite", onCite);
    return () => window.removeEventListener("relay:cite", onCite);
  }, []);

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

/** Fire a citation click from anywhere. */
export function cite(id: string) {
  window.dispatchEvent(new CustomEvent("relay:cite", { detail: id }));
}
