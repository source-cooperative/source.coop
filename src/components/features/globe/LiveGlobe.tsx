"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  label: string;
  href: string;
}

interface SelectedPoint {
  label: string;
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

const DOT_TTL_MS = 5000;
const DOT_COLOR = "#75e58c";
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
  const [globeReady, setGlobeReady] = useState(false);
  const globeReadyRef = useRef(false);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dotsContainerRef = useRef<HTMLDivElement>(null);
  const sizeRef = useRef({ width, height });
  sizeRef.current = { width, height };
  const [selected, setSelected] = useState<SelectedPoint | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  const pinnedRef = useRef(false);

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
          // Clear selection if the selected point expired
          if (
            selectedIdRef.current !== null &&
            !alive.some((p) => p.id === selectedIdRef.current)
          ) {
            selectedIdRef.current = null;
            setSelected(null);
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

            // Store point id for click handler
            el.dataset.pointId = String(p.id);

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

            // Update popup position if this point is selected
            if (p.id === selectedIdRef.current) {
              const page = toPageCoords(coords.x, coords.y);
              setSelected({
                label: p.label,
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

      function toPageCoords(canvasX: number, canvasY: number) {
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (!rect) return { x: canvasX, y: canvasY };
        return {
          x: rect.left + canvasX + window.scrollX,
          y: rect.top + canvasY + window.scrollY,
        };
      }

      function selectPoint(pointId: number) {
        const point = pointsRef.current.find((p) => p.id === pointId);
        if (!point) return;
        selectedIdRef.current = pointId;
        const coords = globe!.getScreenCoords(point.lat, point.lng, 0.01);
        if (coords) {
          const page = toPageCoords(coords.x, coords.y);
          setSelected({
            label: point.label,
            href: point.href,
            x: page.x,
            y: page.y,
          });
        }
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
        selectedIdRef.current = null;
        setSelected(null);
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
        pinnedRef.current = false;
        selectedIdRef.current = null;
        setSelected(null);
      };

      const containerEl = dotsContainerRef.current;
      containerEl?.addEventListener("mouseover", handleMouseOver);
      containerEl?.addEventListener("mouseout", handleMouseOut);
      containerEl?.addEventListener("click", handleDotClick);
      document.addEventListener("click", handleDocClick);

      animate();

      return () => {
        cancelled = true;
        cancelAnimationFrame(animFrameId);
        containerEl?.removeEventListener("mouseover", handleMouseOver);
        containerEl?.removeEventListener("mouseout", handleMouseOut);
        containerEl?.removeEventListener("click", handleDotClick);
        document.removeEventListener("click", handleDocClick);
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
        const c = dotsContainerRef.current;
        if (c) {
          c.innerHTML = "";
        }
      };
    } catch {
      onErrorRef.current?.();
    }
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
          const { account_id, product_id, path } = msg.data;
          const parts = [account_id, product_id, path].filter(Boolean);
          const label = parts.length > 0 ? `s3://${parts.join("/")}` : "";
          const href =
            account_id && product_id
              ? `/${account_id}/${product_id}`
              : "";
          const newPoint: LocationPoint = {
            id: nextPointId++,
            lat: msg.data.lat,
            lng: msg.data.lon,
            timestamp: Date.now(),
            label,
            href,
          };
          // Cap array to prevent unbounded growth under burst traffic
          pointsRef.current =
            prev.length >= MAX_POINTS
              ? [...prev.slice(prev.length - MAX_POINTS + 1), newPoint]
              : [...prev, newPoint];
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
    <>
      <div
        ref={wrapperRef}
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
