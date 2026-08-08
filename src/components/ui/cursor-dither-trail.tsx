/**
 * CursorDitherTrail
 *
 * Renders a full-viewport canvas overlay that paints tiny dithered squares
 * wherever the mouse moves, fading them out over `fadeDuration` ms.
 *
 * The canvas sits pointer-events-none at fixed position so it never blocks
 * clicks on elements beneath it.
 *
 * SSR-safe: all browser APIs (canvas, requestAnimationFrame, mousemove)
 * are accessed only inside useEffect, which never runs on the server.
 */
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface CursorDitherTrailProps {
  /** Hex colour used for the dither dots. Default: lime-green to match AVSS primary. */
  trailColor?: string;
  /** Side length in px of each painted square. 1–4 recommended. */
  dotSize?: number;
  /** Milliseconds until a dot fully fades out. */
  fadeDuration?: number;
  /** Extra Tailwind classes applied to the canvas wrapper. */
  className?: string;
}

export function CursorDitherTrail({
  trailColor = "#b6ff3c",
  dotSize = 4,
  fadeDuration = 700,
  className,
}: CursorDitherTrailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // All browser-only APIs are safely inside useEffect
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Size canvas to viewport
    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Pre-parse hex → rgb once
    const hex = trailColor.replace("#", "");
    const bigint = parseInt(hex.length === 3
      ? hex.split("").map(c => c + c).join("")
      : hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8)  & 255;
    const b =  bigint        & 255;

    // Paint a single dither block at grid-snapped position
    const paint = (cx: number, cy: number) => {
      // Snap to dotSize grid so dots align cleanly
      const x = Math.floor(cx / dotSize) * dotSize;
      const y = Math.floor(cy / dotSize) * dotSize;

      // 2×2 Bayer threshold — paint only ~75 % of squares for dither look
      const bayer = [[0, 2], [3, 1]];
      const cellX = (x / dotSize) % 2;
      const cellY = (y / dotSize) % 2;
      const threshold = (bayer[cellY % 2]?.[cellX % 2] ?? 0) / 4;

      if (Math.random() > threshold) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = `rgba(${r},${g},${b},0.85)`;
        ctx.fillRect(x, y, dotSize, dotSize);
      }
    };

    // RAF fade loop — each frame slightly erases the canvas
    let lastTime = performance.now();
    let rafId = 0;

    const fadeLoop = (now: number) => {
      const delta = now - lastTime;
      lastTime = now;

      const alpha = Math.min(1, delta / fadeDuration);
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "source-over";

      rafId = requestAnimationFrame(fadeLoop);
    };
    rafId = requestAnimationFrame(fadeLoop);

    // Mouse trail
    const onMove = (e: MouseEvent) => {
      paint(e.clientX, e.clientY);

      // Paint a few extra dots between frames for dense trails at fast movement
      const spread = dotSize * 2;
      for (let i = 0; i < 2; i++) {
        paint(
          e.clientX + (Math.random() - 0.5) * spread,
          e.clientY + (Math.random() - 0.5) * spread,
        );
      }
    };
    window.addEventListener("mousemove", onMove);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", resize);
    };
  }, [trailColor, dotSize, fadeDuration]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 z-[9999]",
        className,
      )}
    />
  );
}

export default CursorDitherTrail;
