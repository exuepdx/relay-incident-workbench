"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { usePresentationMotion } from "./presentation-motion";

const HeroScene = dynamic(() => import("./hero-scene"), {
  ssr: false,
  loading: () => <div className="hero-fallback" />,
});

/** WebGL hero with a static fallback for reduced motion or no WebGL. */
export function Hero({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"pending" | "scene" | "static">("pending");
  const section = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const { motion } = usePresentationMotion();
  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const phone = window.matchMedia("(max-width: 760px)");
    let webgl = false;
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("webgl2") || canvas.getContext("webgl");
      webgl = Boolean(context);
      context?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webgl = false;
    }
    const sync = () => setMode(reduced.matches || phone.matches || !webgl ? "static" : "scene");
    sync();
    reduced.addEventListener("change", sync);
    phone.addEventListener("change", sync);
    return () => {
      reduced.removeEventListener("change", sync);
      phone.removeEventListener("change", sync);
    };
  }, []);
  return (
    <section className="hero3d" ref={section} data-title="Overview" id="overview">
      {mode === "scene" ? (
        <HeroScene animate={motion && visible} />
      ) : (
        <div className="hero-fallback" aria-hidden="true" />
      )}
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-vignette" aria-hidden="true" />
      {children}
    </section>
  );
}
