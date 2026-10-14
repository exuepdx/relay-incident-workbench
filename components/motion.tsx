"use client";

import { useEffect, useRef, useState } from "react";

/** Adds `.in` when the element scrolls into view. CSS does the rest. */
export function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Anything at or above the fold reveals at once; the observer handles the rest.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      setSeen(true);
      return;
    }
    if (!("IntersectionObserver" in window)) {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        // Also reveal when the element has been scrolled past (anchor jumps).
        if (entries.some((e) => e.isIntersecting || e.boundingClientRect.top < 0)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0 },
    );
    io.observe(el);
    // Anchor jumps skip past sections without an intersection change, so a
    // passive scroll check reveals anything at or above the fold.
    const onScroll = () => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
        setSeen(true);
        io.disconnect();
        window.removeEventListener("scroll", onScroll);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  const Component = Tag as unknown as "div";
  return (
    <Component
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`reveal ${seen ? "in" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Component>
  );
}

/** Animates a number from `from` to `value` with an ease-out curve. */
export function CountUp({
  value,
  from = 0,
  duration = 1400,
  decimals = 0,
  delay = 0,
}: {
  value: number;
  from?: number;
  duration?: number;
  decimals?: number;
  delay?: number;
}) {
  const [current, setCurrent] = useState(from);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCurrent(value);
      return;
    }
    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 4);
      setCurrent(from + (value - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => {
      frame = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [value, from, duration, delay]);
  return <>{current.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
}
