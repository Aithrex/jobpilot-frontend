import { useEffect, useRef, useState } from "react";

export interface CountdownParts {
  total: number; // ms remaining (0 when expired)
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function partsFrom(ms: number): CountdownParts {
  const total = Math.max(0, ms);
  const s = Math.floor(total / 1000);
  return {
    total,
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    expired: total <= 0,
  };
}

/**
 * Drift-safe countdown to a server-provided ISO timestamp.
 *
 * Recomputes from `Date.now()` every tick (never accumulates -=1000, which
 * drifts). On expiry, fires `onExpire` ONCE so the caller can re-fetch the
 * authoritative server state — the countdown is only a UX affordance, never
 * the source of truth for whether a day is unlocked. Pauses while the tab is
 * hidden and resyncs on focus.
 */
export function useCountdown(targetIso?: string | null, onExpire?: () => void): CountdownParts {
  const targetMs = targetIso ? new Date(targetIso).getTime() : null;
  const [parts, setParts] = useState<CountdownParts>(() =>
    partsFrom(targetMs ? targetMs - Date.now() : 0),
  );
  const firedRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    firedRef.current = false;
    if (!targetMs) {
      setParts(partsFrom(0));
      return;
    }

    const tick = () => {
      const next = partsFrom(targetMs - Date.now());
      setParts(next);
      if (next.expired && !firedRef.current) {
        firedRef.current = true;
        onExpireRef.current?.();
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [targetMs]);

  return parts;
}
