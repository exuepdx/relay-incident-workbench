"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Presenter mode for the proposal: one section per screen, arrow keys to
 * move, Esc to leave. Toggle with the P key or ?present=1.
 */
export function Presenter() {
  const router = useRouter();
  const search = useSearchParams();
  const [on, setOn] = useState(false);
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(0);

  const sections = useCallback(
    () => [...document.querySelectorAll<HTMLElement>('main.proposal > .hero3d, main.proposal > [data-present="true"]')],
    [],
  );

  useEffect(() => {
    setOn(search.get("present") === "1");
  }, [search]);

  useEffect(() => {
    document.documentElement.classList.toggle("presenting", on);
    document.querySelector("main.proposal")?.classList.toggle("presenting", on);
    if (on) setCount(sections().length);
    return () => {
      document.documentElement.classList.remove("presenting");
      document.querySelector("main.proposal")?.classList.remove("presenting");
    };
  }, [on, sections]);

  useEffect(() => {
    function go(delta: number) {
      const list = sections();
      const next = Math.max(0, Math.min(list.length - 1, index + delta));
      list[next]?.scrollIntoView({ behavior: "smooth", block: "start" });
      setIndex(next);
    }
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return;
      // Entering presenter mode leaves focus on its link. Arrow/Escape shortcuts
      // must still work; Space keeps its native activation behavior on controls.
      if (event.key === " " && target?.closest("a, button")) return;
      if (event.key === "p" || event.key === "P") {
        event.preventDefault();
        router.replace(on ? "/proposal" : "/proposal?present=1", { scroll: false });
        return;
      }
      if (!on) return;
      if (event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
        event.preventDefault();
        go(1);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        go(-1);
      } else if (event.key === "Escape") {
        router.replace("/proposal", { scroll: false });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [on, index, router, sections]);

  if (!on) return null;
  return (
    <div className="presenter-hud" role="status" aria-live="polite">
      <span className="mono">
        {index + 1} / {count}
      </span>
      <span>← → to move · Esc to exit</span>
    </div>
  );
}
