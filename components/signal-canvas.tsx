"use client";

import { useEffect, useRef } from "react";

/**
 * A quiet, continuous telemetry waveform behind the incident header.
 * Two layered sine fields with slow phase drift; the second rises into a
 * "spike" region on the right to echo the latency chart. Pure 2D canvas.
 */
export function SignalCanvas({ accent = "#6d4fd2", secondary = "#14b8a6" }: { accent?: string; secondary?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let t = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = () => {
      const { width: w, height: h } = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, w, h);
      const lines = [
        { color: accent, amp: 10, freq: 0.012, speed: 0.9, y: h * 0.62, alpha: 0.35, width: 1.4 },
        { color: secondary, amp: 7, freq: 0.02, speed: -0.6, y: h * 0.7, alpha: 0.28, width: 1.2 },
        { color: accent, amp: 16, freq: 0.008, speed: 0.4, y: h * 0.55, alpha: 0.16, width: 2 },
      ];
      for (const l of lines) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 3) {
          const spike = x > w * 0.68 ? Math.pow((x - w * 0.68) / (w * 0.32), 2) * 42 : 0;
          const y =
            l.y -
            spike +
            Math.sin(x * l.freq + t * l.speed) * l.amp +
            Math.sin(x * l.freq * 2.7 + t * l.speed * 1.7) * l.amp * 0.35;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = l.color;
        ctx.globalAlpha = l.alpha;
        ctx.lineWidth = l.width;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      t += 0.02;
      if (!reduced) frame = requestAnimationFrame(draw);
    };
    resize();
    draw();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) draw();
    });
    ro.observe(canvas);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [accent, secondary]);
  return <canvas ref={ref} className="signal" aria-hidden="true" />;
}
