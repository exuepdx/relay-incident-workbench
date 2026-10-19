"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

const MotionContext = createContext({ motion: false, toggle: () => {} });

/** Motion is optional; diagrams remain complete when animation is disabled. */
export function PresentationMotion({ children }: { children: React.ReactNode }) {
  const [motion, setMotion] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotion(!preference.matches);
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);
  return (
    <MotionContext.Provider value={{ motion, toggle: () => setMotion((value) => !value) }}>
      <div className="presentation-root" data-motion={motion ? "on" : "off"}>
        {children}
      </div>
    </MotionContext.Provider>
  );
}

export const usePresentationMotion = () => useContext(MotionContext);

export function MotionToggle() {
  const { motion, toggle } = usePresentationMotion();
  return (
    <button className="deck-motion" onClick={toggle} aria-pressed={motion} aria-label="Diagram animation">
      <span aria-hidden="true">{motion ? "Ⅱ" : "▷"}</span> Motion {motion ? "on" : "off"}
    </button>
  );
}

/** Stop decorative motion and walkthrough timers when their diagram is offscreen. */
export function useDiagramMotion() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const { motion } = usePresentationMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, animated: motion && visible };
}
