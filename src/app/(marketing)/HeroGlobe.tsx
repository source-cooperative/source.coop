"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import styles from "./Landing.module.css";
import { CONFIG } from "@/lib/config";

const LiveGlobe = dynamic(
  () =>
    import("@/components/features/globe/LiveGlobe").then((m) => ({
      default: m.LiveGlobe,
    })),
  { ssr: false }
);

export function HeroGlobe() {
  const [errored, setErrored] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

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
        alt="globe"
      />
    );
  }

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      {size.width > 0 && (
        <LiveGlobe
          wsUrl={CONFIG.locationWs.url || ""}
          width={size.width}
          height={size.height}
          onError={() => setErrored(true)}
        />
      )}
    </div>
  );
}
