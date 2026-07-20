import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

interface SignalFieldProps {
  /** 0..1 — drives node count + brightness (e.g. share of strong matches). */
  intensity?: number;
  className?: string;
}

interface Node { x: number; y: number; vx: number; vy: number; r: number }

/**
 * The app's in-product signature: a slow constellation of "signal" nodes whose
 * density and brightness scale with how strong the current feed is. Not
 * decoration — it's a data-driven ambient (more strong matches → a fuller
 * field). Canvas-based (cheap), paused when the tab is hidden, and frozen to a
 * single static frame under reduced-motion.
 */
export function SignalField({ intensity = 0.5, className }: SignalFieldProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const clamped = Math.max(0, Math.min(1, intensity));
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const count = Math.round(14 + clamped * 26); // 14..40 nodes
    const linkDist = 96;
    let w = 0;
    let h = 0;
    let raf = 0;
    const nodes: Node[] = [];

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    for (let i = 0; i < count; i += 1) {
      nodes.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        r: 0.8 + Math.random() * 1.6,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j += 1) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < linkDist) {
            const o = (1 - d / linkDist) * 0.22 * (0.45 + clamped);
            ctx.strokeStyle = `rgba(139,92,246,${o})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      for (const n of nodes) {
        ctx.fillStyle = `rgba(124,104,247,${0.45 + clamped * 0.4})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const step = () => {
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
      draw();
      raf = requestAnimationFrame(step);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    if (reduce) {
      draw();
      return () => ro.disconnect();
    }

    const onVis = () => {
      cancelAnimationFrame(raf);
      if (document.visibilityState === 'visible') raf = requestAnimationFrame(step);
    };
    document.addEventListener('visibilitychange', onVis);
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('visibilitychange', onVis);
      ro.disconnect();
    };
  }, [intensity, reduce]);

  return <canvas ref={ref} className={className} aria-hidden />;
}
