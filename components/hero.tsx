"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const HeroScene = dynamic(() => import("./hero-scene"), {
  ssr: false,
  loading: () => <div className="hero-fallback" />,
});

/** WebGL hero with a static fallback for reduced motion or no WebGL. */
export function Hero({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<"pending" | "scene" | "static">("pending");
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = window.matchMedia("(max-width: 760px)").matches;
    let webgl = false;
    try {
      const canvas = document.createElement("canvas");
      webgl = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      webgl = false;
    }
    setMode(reduced || phone || !webgl ? "static" : "scene");
  }, []);
  return (
    <section className="hero3d">
      {mode === "scene" ? <HeroScene /> : <div className="hero-fallback" />}
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-vignette" aria-hidden="true" />
      {children}
    </section>
  );
}
