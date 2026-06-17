"use client";
import { useEffect, useRef, useState } from "react";

/** Counts up from 0 to `to` with a cubic ease, then formats the value. */
export function AnimatedCounter({
  to,
  format,
  duration = 1300,
}: {
  to: number;
  format: (n: number) => string;
  duration?: number;
}) {
  const [val, setVal] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const t0 = performance.now();
    const ease = (x: number) => 1 - Math.pow(1 - x, 3);
    const tick = () => {
      const p = Math.min(1, (performance.now() - t0) / Math.max(1, duration));
      setVal(to * ease(p));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [to, duration]);

  return <>{format(val)}</>;
}
