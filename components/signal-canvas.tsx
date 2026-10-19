"use client";

import { useEffect, useRef } from "react";

/**
 * A quiet telemetry waveform behind the incident header.
 *
 * Drawn once onto a canvas twice the width of its box, then scrolled with a
 * composited CSS animation. No per-frame JavaScript: a requestAnimationFrame
 * loop here kept the main thread busy enough that React deferred hydrating
 * the off-screen investigation panel indefinitely in development.
 */
export function SignalCanvas({ accent = "#6d4fd2", secondary = "#14b8a6" }: { accent?: string; secondary?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const draw = () => {
      const box = canvas.parentElement?.getBoundingClientRect();
      if (!box) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.floor(box.width));
      const h = Math.max(1, Math.floor(box.height));
      canvas.style.width = `${w * 2}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.floor(w * 2 * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w * 2, h);
      const lines = [
        { color: accent, amp: 10, freq: 0.012, y: h * 0.62, alpha: 0.35, width: 1.4 },
        { color: secondary, amp: 7, freq: 0.02, y: h * 0.7, alpha: 0.28, width: 1.2 },
        { color: accent, amp: 16, freq: 0.008, y: h * 0.55, alpha: 0.16, width: 2 },
      ];
      // The pattern repeats every `w` pixels so the scroll loops seamlessly.
      for (const l of lines) {
        ctx.beginPath();
        for (let x = 0; x <= w * 2; x += 3) {
          const phase = (x % w) / w;
          const spike = phase > 0.68 ? Math.pow((phase - 0.68) / 0.32, 2) * 42 : 0;
          const y = l.y - spike + Math.sin(x * l.freq) * l.amp + Math.sin(x * l.freq * 2.7) * l.amp * 0.35;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = l.color;
        ctx.globalAlpha = l.alpha;
        ctx.lineWidth = l.width;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    draw();
    const ro = new ResizeObserver(draw);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, [accent, secondary]);
  return (
    <div className="signal" aria-hidden="true">
      <canvas ref={ref} className="signal-strip" />
    </div>
  );
}
