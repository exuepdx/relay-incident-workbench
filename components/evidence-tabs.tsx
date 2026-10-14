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
  const labels: Record<Tab, string> = { topology: "Blast radius & owners", overview: "Overview", register: "Evidence register" };

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
          <button key={t} role="tab" id={`tab-${t}`} className="tab" aria-selected={tab === t} aria-controls="evidence-panel" tabIndex={tab === t ? 0 : -1} onClick={() => setTab(t)}>
            {labels[t]}
          </button>
        ))}
      </div>
      <div id="evidence-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "topology" ? topology : tab === "overview" ? overview : register}
      </div>
    </div>
  );
}

/** Fire a citation click from anywhere. */
export function cite(id: string) {
  window.dispatchEvent(new CustomEvent("relay:cite", { detail: id }));
}
