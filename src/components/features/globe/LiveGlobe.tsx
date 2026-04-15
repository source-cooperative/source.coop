"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Globe, { GlobeMethods } from "react-globe.gl";
import {
  AmbientLight,
  DirectionalLight,
  Mesh,
  MeshPhongMaterial,
  Object3D,
  SphereGeometry,
  TextureLoader,
  Vector2,
  Vector3,
} from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { DitherShader } from "./DitherShader";
import styles from "./LiveGlobe.module.css";
import coloLocations from "./locations.json";

interface LocationPoint {
  id: number;
  lat: number;
  lng: number;
  timestamp: number;
  label: string;
  location: string;
  href: string;
}

interface SelectedPoint {
  label: string;
  location: string;
  href: string;
  x: number;
  y: number;
}

interface LiveGlobeProps {
  wsUrl: string;
  width: number;
  height: number;
  showClouds?: boolean;
  onError?: () => void;
}

const DOT_TTL_MS = 10 * 1_000;
const DOT_COLOR = "#75e58c";
const DOT_SIZE = 8;
const CLOUDS_ALT = 0.004;
const CLOUDS_ROTATION_SPEED = -0.0025;
const MAX_POINTS = 500;

// Monotonic ID counter — shared across instances, but always unique
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
  const [globeReady, setGlobeReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const globeReadyRef = useRef(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dotsContainerRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ width, height });
  sizeRef.current = { width, height };
  const [selected, setSelected] = useState<SelectedPoint | null>(null);
  const selectedRef = useRef<SelectedPoint | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  const pinnedRef = useRef(false);

  // onGlobeReady fires during render so we can't call setState directly.
  // Instead, set a ref and poll until mounted.
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
    let clouds: Mesh | undefined;
    let cachedRect: DOMRect | null = null;

    // Per-instance scratch vectors
    const _pointVec = new Vector3();
    const _camToPoint = new Vector3();
    const _projVec = new Vector3();

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    try {
      const scene = globe.scene();
      scene.traverse((obj: Object3D) => {
        if (obj instanceof AmbientLight) {
          obj.intensity = 3.0;
        }
        if (obj instanceof DirectionalLight) {
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
        new TextureLoader().load("/img/clouds.png", (texture) => {
          if (cancelled || !globe) return;
          clouds = new Mesh(
            new SphereGeometry(
              globe.getGlobeRadius() * (1 + CLOUDS_ALT),
              75,
              75,
            ),
            new MeshPhongMaterial({
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
      ditherPass.uniforms.resolution.value = new Vector2(
        sizeRef.current.width,
        sizeRef.current.height,
      );
      composer.addPass(ditherPass);

      // Store refs for the resize effect
      composerRef.current = composer;
      ditherPassRef.current = ditherPass;

      // Replace default render loop with dithered one
      renderer.setAnimationLoop(null);

      // Cache wrapper rect; invalidate on scroll/resize
      function updateRect() {
        cachedRect = wrapperRef.current?.getBoundingClientRect() ?? null;
      }
      updateRect();
      window.addEventListener("scroll", updateRect, { passive: true });
      window.addEventListener("resize", updateRect, { passive: true });

      function toPageCoords(canvasX: number, canvasY: number) {
        if (!cachedRect) return { x: canvasX, y: canvasY };
        return {
          x: cachedRect.left + canvasX + window.scrollX,
          y: cachedRect.top + canvasY + window.scrollY,
        };
      }

      function updateSelected(next: SelectedPoint) {
        const prev = selectedRef.current;
        if (
          prev &&
          prev.x === next.x &&
          prev.y === next.y &&
          prev.label === next.label &&
          prev.location === next.location &&
          prev.href === next.href
        ) {
          return;
        }
        selectedRef.current = next;
        setSelected(next);
      }

      function clearSelected() {
        selectedIdRef.current = null;
        pinnedRef.current = false;
        selectedRef.current = null;
        setSelected(null);
      }

      function selectPoint(pointId: number) {
        const point = pointsRef.current.find((p) => p.id === pointId);
        if (!point) return;
        selectedIdRef.current = pointId;
        const coords = globe!.getScreenCoords(point.lat, point.lng, 0.01);
        if (coords) {
          const page = toPageCoords(coords.x, coords.y);
          updateSelected({
            label: point.label,
            location: point.location,
            href: point.href,
            x: page.x,
            y: page.y,
          });
        }
      }

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
        // Early exit: only filter if the oldest point could have expired
        if (prev.length > 0 && now - prev[0].timestamp >= DOT_TTL_MS) {
          const alive = prev.filter((p) => now - p.timestamp < DOT_TTL_MS);
          if (alive.length !== prev.length) {
            pointsRef.current = alive;
            // Clear selection if the selected point expired
            if (
              selectedIdRef.current !== null &&
              !alive.some((p) => p.id === selectedIdRef.current)
            ) {
              clearSelected();
            }
          }
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
            el.style.setProperty("--dot-color", DOT_COLOR);
            el.style.backgroundColor = DOT_COLOR;
            container.appendChild(el);
          }
          for (let i = 0; i < dots.length; i++) {
            const p = dots[i];
            const el = container.children[i] as HTMLElement;

            // Only update dataset when mapping changes
            const idStr = String(p.id);
            if (el.dataset.pointId !== idStr) {
              el.dataset.pointId = idStr;
            }

            const pos3d = globe!.getCoords(p.lat, p.lng, 0.01);
            if (!pos3d) {
              el.style.display = "none";
              continue;
            }

            // Occlusion + edge fade: cosine of angle between the surface
            // normal (≈ point vector) and the camera-to-point direction.
            // 1.0 = dead-center, 0.0 = limb, negative = behind globe.
            _pointVec.set(pos3d.x, pos3d.y, pos3d.z);
            _projVec.copy(_pointVec); // save unnormalized for projection
            _camToPoint.copy(_pointVec).sub(camera.position);
            const cosAngle =
              -_pointVec.normalize().dot(_camToPoint.normalize());
            if (cosAngle <= 0) {
              el.style.display = "none";
              continue;
            }

            // Smooth fade near the limb (cosAngle 0→0.15 maps to opacity 0→1)
            const edgeFade = Math.min(1, cosAngle / 0.15);

            // Project 3D position to screen coords
            const { width, height } = sizeRef.current;
            _projVec.project(camera);
            const screenX = (_projVec.x * 0.5 + 0.5) * width;
            const screenY = (-_projVec.y * 0.5 + 0.5) * height;

            const age = now - p.timestamp;
            const ageFade = Math.max(0, 1 - age / DOT_TTL_MS);
            el.style.display = "";
            el.style.transform = `translate(${screenX - DOT_SIZE / 2}px,${screenY - DOT_SIZE / 2}px)`;
            el.style.opacity = String(ageFade * edgeFade);

            // Update popup position if this point is selected (only when changed)
            if (p.id === selectedIdRef.current) {
              const page = toPageCoords(screenX, screenY);
              updateSelected({
                label: p.label,
                location: p.location,
                href: p.href,
                x: page.x,
                y: page.y,
              });
            }
          }
        }

        controls.update();
        composer.render();
      }

      // Hover: show popup on mouseenter, hide on mouseleave (unless pinned)
      const handleMouseOver = (e: MouseEvent) => {
        if (pinnedRef.current) return;
        const target = (e.target as HTMLElement).closest(
          `.${styles.dot}`,
        ) as HTMLElement | null;
        if (!target) return;
        selectPoint(Number(target.dataset.pointId));
      };

      const handleMouseOut = (e: MouseEvent) => {
        if (pinnedRef.current) return;
        const related = e.relatedTarget as HTMLElement | null;
        if (related?.closest(`.${styles.dot}`)) return;
        clearSelected();
      };

      // Click on dot: pin the popup open
      const handleDotClick = (e: MouseEvent) => {
        const target = (e.target as HTMLElement).closest(
          `.${styles.dot}`,
        ) as HTMLElement | null;
        if (!target) return;
        e.stopPropagation();
        const pointId = Number(target.dataset.pointId);
        if (pinnedRef.current && selectedIdRef.current === pointId) {
          pinnedRef.current = false;
        } else {
          pinnedRef.current = true;
          selectPoint(pointId);
        }
      };

      // Click anywhere else: dismiss pinned popup
      const handleDocClick = () => {
        if (!pinnedRef.current) return;
        clearSelected();
      };

      const containerEl = dotsContainerRef.current;
      containerEl?.addEventListener("mouseover", handleMouseOver);
      containerEl?.addEventListener("mouseout", handleMouseOut);
      containerEl?.addEventListener("click", handleDotClick);
      document.addEventListener("click", handleDocClick);

      animate();
      setSceneReady(true);

      return () => {
        setSceneReady(false);
        cancelled = true;
        cancelAnimationFrame(animFrameId);
        window.removeEventListener("scroll", updateRect);
        window.removeEventListener("resize", updateRect);
        containerEl?.removeEventListener("mouseover", handleMouseOver);
        containerEl?.removeEventListener("mouseout", handleMouseOut);
        containerEl?.removeEventListener("click", handleDotClick);
        document.removeEventListener("click", handleDocClick);
        composerRef.current?.dispose();
        composerRef.current = null;
        ditherPassRef.current = null;
        if (clouds) {
          globe?.scene().remove(clouds);
          const mat = clouds.material as MeshPhongMaterial;
          mat.map?.dispose();
          mat.dispose();
          clouds.geometry.dispose();
        }
        // Clear overlay DOM
        const c = dotsContainerRef.current;
        if (c) {
          c.innerHTML = "";
        }
      };
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[LiveGlobe] setup error:", err);
      }
      onErrorRef.current?.();
    }
    // width/height handled by separate resize effect; onError via ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globeReady, showClouds]);

  // WebSocket connection with auto-reconnect on close/error and wake
  useEffect(() => {
    if (!wsUrl) return;

    let disposed = false;
    let ws: WebSocket;
    let reconnectDelay = 1000;

    function connect() {
      if (disposed) return;
      if (ws && ws.readyState < WebSocket.CLOSING) ws.close();
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        if (disposed) return;
        reconnectDelay = 1000; // reset backoff on successful message
        try {
          const msg = JSON.parse(event.data);
          if (msg.type !== "location") return;
          const { account_id, product_id, colo } = msg.data;
          const parts = [account_id, product_id].filter(Boolean);
          const coloEntry =
            colo &&
            coloLocations[colo as keyof typeof coloLocations];
          if (!coloEntry?.lat || !coloEntry?.lon) return;
          const current = pointsRef.current;
          const trimmed =
            current.length >= MAX_POINTS
              ? current.slice(current.length - MAX_POINTS + 1)
              : current;
          pointsRef.current = [
            ...trimmed,
            {
              id: nextPointId++,
              lat: coloEntry.lat,
              lng: coloEntry.lon,
              timestamp: Date.now(),
              label: parts.length > 0 ? `GET /${parts.join("/")}` : "",
              location: coloEntry ? coloEntry.name : "",
              href:
                account_id && product_id ? `/${account_id}/${product_id}` : "",
            },
          ];
        } catch {
          // Ignore malformed messages
        }
      };
      ws.onclose = () => {
        if (disposed || document.hidden) return;
        setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
      };
    }

    function onVisibilityChange() {
      if (disposed || document.hidden) return;
      if (ws.readyState >= WebSocket.CLOSING) connect();
    }

    connect();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (ws.readyState < WebSocket.CLOSING) ws.close();
    };
  }, [wsUrl]);

  return (
    <>
      <div
        ref={wrapperRef}
        className={`${styles.container} ${sceneReady ? styles.ready : styles.loading}`}
        role="img"
        aria-label="Interactive 3D globe showing live data request locations"
      >
        <Globe
          ref={globeRef}
          width={width}
          height={height}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="/img/earth-blue-marble.jpg"
          showAtmosphere={false}
          onGlobeReady={() => {
            globeReadyRef.current = true;
          }}
          animateIn={false}
        />
        {/* Dot overlay — managed imperatively by the animation loop, not React */}
        <div ref={dotsContainerRef} aria-hidden="true" />
      </div>
      {selected &&
        createPortal(
          <div
            className={styles.popup}
            style={{
              left: selected.x,
              top: selected.y,
            }}
          >
            {selected.location && (
              <div className={styles.popupLocation}>{selected.location}</div>
            )}
            <div className={styles.popupLabel}>{selected.label}</div>
            {selected.href && (
              <a href={selected.href} className={styles.popupLink}>
                View product &rarr;
              </a>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
