"use client";
import { useEffect, useRef, useState } from "react";

// Overnight (ET midnight–7am) there are essentially no live games, so we poll
// far less often to save serverless compute. Hidden tabs pause entirely.
const NIGHT_FACTOR = 4;

function isOvernightET(): boolean {
  const h = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
    10
  );
  const hr = h === 24 ? 0 : h;
  return hr >= 0 && hr < 7;
}

export function usePolling<T>(url: string, intervalMs: number, initial?: T) {
  const [data, setData] = useState<T | undefined>(initial);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const hidden = () => typeof document !== "undefined" && document.hidden;

    const tick = async () => {
      // Pause while the tab is backgrounded; visibilitychange resumes us.
      if (hidden()) return;
      try {
        const res = await fetch(url, { cache: "no-store" });
        const json = (await res.json()) as T;
        if (mounted.current) {
          setData(json);
          setError(null);
          setLastFetched(new Date());
        }
      } catch (e) {
        if (mounted.current) setError(e as Error);
      } finally {
        if (mounted.current && !hidden()) {
          const delay = isOvernightET() ? intervalMs * NIGHT_FACTOR : intervalMs;
          timer = setTimeout(tick, delay);
        }
      }
    };

    const onVisible = () => {
      if (!hidden() && mounted.current) {
        clearTimeout(timer);
        tick(); // refresh immediately and resume the loop
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    tick();
    return () => {
      mounted.current = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [url, intervalMs]);

  return { data, error, lastFetched };
}
