"use client";
import { useEffect, useRef, useState } from "react";

export function usePolling<T>(url: string, intervalMs: number, initial?: T) {
  const [data, setData] = useState<T | undefined>(initial);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
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
        if (mounted.current) timer = setTimeout(tick, intervalMs);
      }
    };
    tick();
    return () => {
      mounted.current = false;
      clearTimeout(timer!);
    };
  }, [url, intervalMs]);

  return { data, error, lastFetched };
}
