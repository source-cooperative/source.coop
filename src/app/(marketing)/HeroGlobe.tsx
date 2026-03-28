"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import styles from "./Landing.module.css";

const LiveGlobe = dynamic(
  () =>
    import("@/components/features/globe/LiveGlobe").then((m) => ({
      default: m.LiveGlobe,
    })),
  { ssr: false },
);

export function HeroGlobe({ wsUrl }: { wsUrl: string }) {
  const [errored, setErrored] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const handleError = useCallback(() => setErrored(true), []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ width: Math.floor(width), height: Math.floor(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (errored) {
    return (
      <img
        className={styles.heroImage}
        src="/img/dithered-globe.png"
        alt="Visualization of live data requests around the world"
      />
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", aspectRatio: "1 / 1", overflow: "hidden" }}
    >
      {size.width > 0 && (
        <LiveGlobe
          wsUrl={wsUrl}
          width={size.width}
          height={size.height}
          onError={handleError}
          showClouds
        />
      )}
    </div>
  );
}
