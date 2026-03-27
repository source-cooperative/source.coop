"use client";

import { useEffect, useRef, useState } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { DitherShader } from "./DitherShader";
import styles from "./LiveGlobe.module.css";

interface LocationPoint {
  id: number;
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
  showClouds?: boolean;
  onError?: () => void;
}

const DOT_TTL_MS = 3000;
const DOT_COLOR = "#ff6b35";
const DOT_SIZE = 8;
const CLOUDS_ALT = 0.004;
const CLOUDS_ROTATION_SPEED = -0.0025;
const MAX_POINTS = 500;

// Monotonic ID counter for unique keys
let nextPointId = 0;

export function LiveGlobe({
  wsUrl,
  width,
  height,
  showClouds = false,
  onError,
}: LiveGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const pointsRef = useRef<LocationPoint[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [globeReady, setGlobeReady] = useState(false);
  const globeReadyRef = useRef(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const dotsContainerRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ width, height });
  sizeRef.current = { width, height };

  // Poll for globe readiness (onGlobeReady fires during render, can't setState there)
  useEffect(() => {
    if (globeReady) return;
    const id = setInterval(() => {
      if (globeReadyRef.current) {
        setGlobeReady(true);
        clearInterval(id);
      }
    }, 100);
    return () => clearInterval(id);
  }, [globeReady]);

  // Resize the composer/dither pass without tearing down the scene
  const composerRef = useRef<EffectComposer | null>(null);
  const ditherPassRef = useRef<ShaderPass | null>(null);

  useEffect(() => {
    const composer = composerRef.current;
    const ditherPass = ditherPassRef.current;
    if (!composer || !ditherPass) return;
    composer.setSize(width, height);
    ditherPass.uniforms.resolution.value.set(width, height);
  }, [width, height]);

  // Set up scene, post-processing, and animation loop once globe is ready
  useEffect(() => {
    const globe = globeRef.current;
    if (!globeReady || !globe) return;

    let cancelled = false;
    let animFrameId: number;
    let clouds: THREE.Mesh | undefined;

    // Per-instance scratch vectors (safe if multiple instances mount)
    const _pointVec = new THREE.Vector3();
    const _camToPoint = new THREE.Vector3();

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    try {
      const scene = globe.scene();
      scene.traverse((obj: THREE.Object3D) => {
        if (obj instanceof THREE.AmbientLight) {
          obj.intensity = 3.0;
        }
        if (obj instanceof THREE.DirectionalLight) {
          obj.intensity = 0.2;
        }
      });

      globe.pointOfView({ altitude: 1.5 });

      const controls = globe.controls();
      controls.autoRotate = !prefersReducedMotion;
      controls.autoRotateSpeed = 0.2;
      controls.enableZoom = false;

      // Remove canvas from keyboard tab order (decorative)
      const renderer = globe.renderer();
      renderer.domElement.setAttribute("tabindex", "-1");

      // Add clouds
      if (showClouds) {
        new THREE.TextureLoader().load("/img/clouds.png", (texture) => {
          if (cancelled || !globe) return;
          clouds = new THREE.Mesh(
            new THREE.SphereGeometry(
              globe.getGlobeRadius() * (1 + CLOUDS_ALT),
              75,
              75,
            ),
            new THREE.MeshPhongMaterial({
              map: texture,
              transparent: true,
              opacity: 0.3,
            }),
          );
          globe.scene().add(clouds);
        });
      }

      // Set up dither post-processing
      const camera = globe.camera();

      const composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));

      const ditherPass = new ShaderPass(DitherShader);
      ditherPass.uniforms.resolution.value = new THREE.Vector2(
        sizeRef.current.width,
        sizeRef.current.height,
      );
      composer.addPass(ditherPass);

      // Store refs for the resize effect
      composerRef.current = composer;
      ditherPassRef.current = ditherPass;

      // Replace default render loop with dithered one
      renderer.setAnimationLoop(null);

      function animate() {
        if (cancelled) return;
        animFrameId = requestAnimationFrame(animate);

        // Rotate clouds
        if (clouds && !prefersReducedMotion) {
          clouds.rotation.y += (CLOUDS_ROTATION_SPEED * Math.PI) / 180;
        }

        // Prune expired points (only mutate ref, don't setState)
        const now = Date.now();
        const prev = pointsRef.current;
        const alive = prev.filter((p) => now - p.timestamp < DOT_TTL_MS);
        if (alive.length !== prev.length) {
          pointsRef.current = alive;
        }

        // Update dot overlay positions directly via DOM (no React re-render)
        const container = dotsContainerRef.current;
        if (container) {
          const dots = pointsRef.current;
          // Sync DOM children count with data
          while (container.children.length > dots.length) {
            container.removeChild(container.lastChild!);
          }
          while (container.children.length < dots.length) {
            const el = document.createElement("div");
            el.className = styles.dot;
            el.style.width = `${DOT_SIZE}px`;
            el.style.height = `${DOT_SIZE}px`;
            el.style.backgroundColor = DOT_COLOR;
            container.appendChild(el);
          }
          for (let i = 0; i < dots.length; i++) {
            const p = dots[i];
            const el = container.children[i] as HTMLElement;

            const pos3d = globe!.getCoords(p.lat, p.lng, 0.01);
            const coords = globe!.getScreenCoords(p.lat, p.lng, 0.01);
            if (!pos3d || !coords) {
              el.style.display = "none";
              continue;
            }

            // Occlusion + edge fade: use the dot product to determine
            // how much the point faces the camera. Values near 0 are at
            // the limb (edge) of the globe; negative values are behind it.
            _pointVec.set(pos3d.x, pos3d.y, pos3d.z);
            _camToPoint.copy(_pointVec).sub(camera.position);
            const facing = -_pointVec.dot(_camToPoint);
            if (facing <= 0) {
              el.style.display = "none";
              continue;
            }

            // Normalize facing value: points dead-center have facing ≈ max,
            // points at the edge approach 0. Use this to smoothly fade at the limb.
            const pointDist = _pointVec.length();
            const camDist = _camToPoint.length();
            const edgeFade = Math.min(1, facing / (pointDist * camDist * 0.15));

            const age = now - p.timestamp;
            const ageFade = Math.max(0, 1 - age / DOT_TTL_MS);
            el.style.display = "";
            el.style.left = `${coords.x - DOT_SIZE / 2}px`;
            el.style.top = `${coords.y - DOT_SIZE / 2}px`;
            el.style.opacity = String(ageFade * edgeFade);
          }
        }

        controls.update();
        composer.render();
      }

      animate();
    } catch {
      onErrorRef.current?.();
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrameId);
      composerRef.current?.dispose();
      composerRef.current = null;
      ditherPassRef.current = null;
      if (clouds) {
        globe?.scene().remove(clouds);
        const mat = clouds.material as THREE.MeshPhongMaterial;
        mat.map?.dispose();
        mat.dispose();
        clouds.geometry.dispose();
      }
      // Clear overlay DOM
      const container = dotsContainerRef.current;
      if (container) {
        container.innerHTML = "";
      }
    };
  // width/height handled by separate resize effect; onError via ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globeReady, showClouds]);

  // WebSocket connection
  useEffect(() => {
    if (!wsUrl) return;

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "location") {
          const prev = pointsRef.current;
          const newPoint: LocationPoint = {
            id: nextPointId++,
            lat: msg.data.lat,
            lng: msg.data.lon,
            timestamp: Date.now(),
          };
          // Cap array to prevent unbounded growth under burst traffic
          pointsRef.current =
            prev.length >= MAX_POINTS
              ? [...prev.slice(prev.length - MAX_POINTS + 1), newPoint]
              : [...prev, newPoint];
        } else if (msg.type === "stats") {
          setStats(msg.data);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onerror = () => {
      // WebSocket failed — globe still works, just no dots
    };

    return () => {
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }
    };
  }, [wsUrl]);

  return (
    <div
      className={styles.container}
      role="img"
      aria-label="Interactive 3D globe showing live data request locations"
    >
      <Globe
        ref={globeRef}
        width={width}
        height={height}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="/img/earth-blue-marble.jpg"
        bumpImageUrl="/img/earth-topology.png"
        showAtmosphere={false}
        onGlobeReady={() => {
          globeReadyRef.current = true;
        }}
        animateIn={false}
      />
      {/* Dot overlay — managed imperatively by the animation loop, not React */}
      <div ref={dotsContainerRef} aria-hidden="true" />
      {stats && (
        <div
          aria-hidden="true"
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
