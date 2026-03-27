"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import styles from "./LiveGlobe.module.css";

interface LocationEvent {
  lat: number;
  lon: number;
  city?: string;
  country?: string;
  colo?: string;
  account_id?: string;
  product_id?: string;
  path?: string;
}

interface LocationPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

interface StatsData {
  requestsPerSecond: number;
  broadcastsPerSecond: number;
  viewers: number;
}

interface LiveGlobeProps {
  wsUrl: string;
  width: number;
  height: number;
  onError?: () => void;
}

const DOT_TTL_MS = 3000;
const DOT_COLOR = "#ff6b35";

export function LiveGlobe({ wsUrl, width, height, onError }: LiveGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>();
  const wsRef = useRef<WebSocket>();
  const pointsRef = useRef<LocationPoint[]>([]);
  const animFrameRef = useRef<number>();
  const [stats, setStats] = useState<StatsData | null>(null);
  const mountedRef = useRef(true);

  const handleError = useCallback(() => {
    onError?.();
  }, [onError]);

  useEffect(() => {
    mountedRef.current = true;
    const container = containerRef.current;
    if (!container) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let globe: any;
    let composer: import("three/examples/jsm/postprocessing/EffectComposer.js").EffectComposer | undefined;

    async function init() {
      try {
        const [
          GlobeGL,
          THREE,
          { EffectComposer },
          { RenderPass },
          { ShaderPass },
          { DitherShader },
        ] = await Promise.all([
          import("globe.gl").then((m) => m.default),
          import("three"),
          import("three/examples/jsm/postprocessing/EffectComposer.js"),
          import("three/examples/jsm/postprocessing/RenderPass.js"),
          import("three/examples/jsm/postprocessing/ShaderPass.js"),
          import("./DitherShader"),
        ]);

        if (!mountedRef.current) return;

        globe = new GlobeGL(container as HTMLElement)
          .width(width)
          .height(height)
          .backgroundColor("rgba(0,0,0,0)")
          .globeImageUrl(
            "//cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg"
          )
          .bumpImageUrl(
            "//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png"
          )
          .showAtmosphere(false)
          .pointsData([])
          .pointLat("lat")
          .pointLng("lng")
          .pointAltitude(0.01)
          .pointRadius(0.4)
          .pointColor(() => DOT_COLOR)
          .pointsMerge(false);

        globeRef.current = globe;

        // Auto-rotate
        const controls = globe.controls();
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.4;
        controls.enableZoom = false;

        // Add cloud layer
        const CLOUDS_ALT = 0.004;
        const CLOUDS_ROTATION_SPEED = -0.006;
        new THREE.TextureLoader().load(
          "//cdn.jsdelivr.net/npm/three-globe/example/img/clouds.png",
          (cloudsTexture: import("three").Texture) => {
            if (!mountedRef.current || !globe) return;
            const clouds = new THREE.Mesh(
              new THREE.SphereGeometry(
                globe.getGlobeRadius() * (1 + CLOUDS_ALT),
                75,
                75
              ),
              new THREE.MeshPhongMaterial({
                map: cloudsTexture,
                transparent: true,
              })
            );
            globe.scene().add(clouds);

            // Rotate clouds
            (function rotateClouds() {
              if (!mountedRef.current) return;
              clouds.rotation.y += (CLOUDS_ROTATION_SPEED * Math.PI) / 180;
              requestAnimationFrame(rotateClouds);
            })();
          }
        );

        // Set up dither post-processing
        const renderer = globe.renderer();
        const scene = globe.scene();
        const camera = globe.camera();

        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));

        const ditherPass = new ShaderPass(DitherShader);
        ditherPass.uniforms.resolution.value = new THREE.Vector2(width, height);
        composer.addPass(ditherPass);

        // Override the render loop to use the composer
        globe.onGlobeReady(() => {
          if (!mountedRef.current || !composer) return;

          // Replace the default animation loop
          renderer.setAnimationLoop(null);

          function animate() {
            if (!mountedRef.current) return;
            animFrameRef.current = requestAnimationFrame(animate);

            // Update points - prune expired, update data
            const now = Date.now();
            pointsRef.current = pointsRef.current.filter(
              (p) => now - p.timestamp < DOT_TTL_MS
            );
            globe!.pointsData(pointsRef.current);

            // Update controls
            controls.update();

            // Render with dither
            composer!.render();
          }

          animate();
        });

        // Connect WebSocket
        if (wsUrl) {
          const ws = new WebSocket(wsUrl);
          wsRef.current = ws;

          ws.onmessage = (event) => {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type === "location") {
                const loc: LocationEvent = msg.data;
                pointsRef.current.push({
                  lat: loc.lat,
                  lng: loc.lon,
                  timestamp: Date.now(),
                });
              } else if (msg.type === "stats") {
                setStats(msg.data);
              }
            } catch {
              // Ignore malformed messages
            }
          };

          ws.onerror = () => {
            // WebSocket failed, but globe still works — just no dots
          };
        }
      } catch {
        handleError();
      }
    }

    init();

    return () => {
      mountedRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      wsRef.current?.close();
      if (globe) {
        globe.renderer().setAnimationLoop(null);
        globe.renderer().dispose();
        // Remove the canvas
        const canvas = container.querySelector("canvas");
        if (canvas) container.removeChild(canvas);
      }
      globe = undefined;
      composer = undefined;
      globeRef.current = undefined;
    };
  }, [wsUrl, width, height, handleError]);

  return (
    <div ref={containerRef} className={styles.container}>
      {stats && (
        <div
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            fontSize: "0.7rem",
            fontFamily: "var(--heading-font-family)",
            opacity: 0.6,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {stats.requestsPerSecond} req/s
        </div>
      )}
    </div>
  );
}
