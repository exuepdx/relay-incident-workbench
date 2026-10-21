"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePresentationMotion } from "./presentation-motion";

/** Slide navigation follows scrolling as well as keyboard and touch controls. */
export function Presenter() {
  const router = useRouter();
  const search = useSearchParams();
  const on = search.get("present") === "1";
  const { motion, toggle } = usePresentationMotion();
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [titles, setTitles] = useState<string[]>([]);
  const sections = useCallback(
    () => [...document.querySelectorAll<HTMLElement>('main.proposal > .hero3d, main.proposal > [data-present="true"]')],
    [],
  );

  // The motion provider can update before this Suspense boundary hydrates.
  // Mount the HUD after hydration so its controls use the current preference.
  useEffect(() => setReady(true), []);

  useEffect(() => {
    const main = document.querySelector("main.proposal");
    document.documentElement.classList.toggle("presenting", on);
    main?.classList.toggle("presenting", on);
    const list = sections();
    setTitles(list.map((section) => section.dataset.title || "Overview"));
    let frame = 0;
    function sync() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const marker = window.innerHeight * 0.3;
        let current = 0;
        list.forEach((section, i) => {
          if (section.getBoundingClientRect().top <= marker) current = i;
        });
        setIndex(current);
      });
    }
    sync();
    // Presentation mode changes every preceding section's height. Re-anchor any
    // shared slide link after that layout change, not only the overview link.
    // The appendix likewise cannot be targeted while presentation CSS hides it.
    const hash = window.location.hash.slice(1);
    const destination =
      !on && hash === "notes" ? "notes" : on && list.some((section) => section.id === hash) ? hash : null;
    const anchorFrame = destination
      ? requestAnimationFrame(() =>
          document.getElementById(destination)?.scrollIntoView({ block: "start", behavior: "instant" }),
        )
      : 0;
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(anchorFrame);
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      document.documentElement.classList.remove("presenting");
      main?.classList.remove("presenting");
    };
  }, [on, sections]);

  const go = useCallback(
    (delta: number) => {
      const list = sections();
      const next = Math.max(0, Math.min(list.length - 1, index + delta));
      list[next]?.scrollIntoView({ behavior: motion ? "smooth" : "instant", block: "start" });
    },
    [index, sections, motion],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.key === "Escape" && on) {
        router.replace("/proposal", { scroll: false });
        return;
      }
      if (target?.closest("[data-deck-interactive], details[open]")) return;
      if (event.key === "p" || event.key === "P") {
        event.preventDefault();
        router.replace(on ? "/proposal" : "/proposal?present=1", { scroll: false });
        return;
      }
      if (!on || (event.key === " " && target?.closest("a, button, summary"))) return;
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        go(1);
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
        event.preventDefault();
        go(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [on, go, router]);

  if (!on || !ready) return null;
  return (
    <nav className="presenter-hud" aria-label="Slide navigation">
      <button onClick={() => go(-1)} disabled={index === 0} aria-label="Previous slide">
        ←
      </button>
      <span className="presenter-position" role="status" aria-live="polite">
        <span>
          {index + 1} / {titles.length || 9}
        </span>
        <small>{titles[index] || "Overview"}</small>
      </span>
      <button onClick={() => go(1)} disabled={index === titles.length - 1} aria-label="Next slide">
        →
      </button>
      <Link href="/proposal#notes">Notes</Link>
      <button
        onClick={toggle}
        aria-label="Diagram animation"
        aria-pressed={motion}
        title={motion ? "Pause diagram motion" : "Enable diagram motion"}
      >
        {motion ? "Ⅱ" : "▷"}
      </button>
      <button onClick={() => router.replace("/proposal", { scroll: false })} aria-label="Exit presentation">
        ×
      </button>
    </nav>
  );
}
