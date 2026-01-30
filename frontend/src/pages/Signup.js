// src/pages/Signup.js  (SINGLE FILE: DomeGallery + Signup)

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { useGesture } from "@use-gesture/react";

import TextInput from "../components/TextInput";
import PrimaryButton from "../components/PrimaryButton";
import GoogleButton from "../components/GoogleButton";
import { signInWithGoogle } from "../auth";

import poster1 from "../assets/poster1.png";
import poster2 from "../assets/poster2.png";
import poster3 from "../assets/poster3.png";
import poster4 from "../assets/poster4.png";
import poster5 from "../assets/poster5.png";
import poster6 from "../assets/poster6.png";
import poster7 from "../assets/poster7.png";
import poster8 from "../assets/poster8.png";

/* ======================
   DOME GALLERY (LOCAL)
====================== */

const DG_DEFAULT_IMAGES = [
  { src: poster1, alt: "Abstract art" },
  { src: poster2, alt: "Modern sculpture" },
  { src: poster3, alt: "Modern" },
  { src: poster4, alt: "Modern Poster4" },
  { src: poster5, alt: "Modern Poster5" },
  { src: poster6, alt: "Modern Poster6" },
  { src: poster7, alt: "Modern Poster7" },
  { src: poster8, alt: "Modern Poster8" },
];

const dgClamp = (v, min, max) => Math.min(Math.max(v, min), max);
const dgWrapAngleSigned = (deg) => {
  const a = (((deg + 180) % 360) + 360) % 360;
  return a - 180;
};

function dgBuildItems(pool, seg) {
  const xCols = Array.from({ length: seg }, (_, i) => -37 + i * 2);
  const evenYs = [-4, -2, 0, 2, 4];
  const oddYs = [-3, -1, 1, 3, 5];

  const coords = xCols.flatMap((x, c) => {
    const ys = c % 2 === 0 ? evenYs : oddYs;
    return ys.map((y) => ({ x, y, sizeX: 2, sizeY: 2 }));
  });

  const totalSlots = coords.length;
  if (!pool?.length) return coords.map((c) => ({ ...c, src: "", alt: "" }));

  const normalizedImages = pool.map((image) => {
    if (typeof image === "string") return { src: image, alt: "" };
    return { src: image?.src || "", alt: image?.alt || "" };
  });

  const usedImages = Array.from({ length: totalSlots }, (_, i) => normalizedImages[i % normalizedImages.length]);

  for (let i = 1; i < usedImages.length; i++) {
    if (usedImages[i].src === usedImages[i - 1].src) {
      for (let j = i + 1; j < usedImages.length; j++) {
        if (usedImages[j].src !== usedImages[i].src) {
          const tmp = usedImages[i];
          usedImages[i] = usedImages[j];
          usedImages[j] = tmp;
          break;
        }
      }
    }
  }

  return coords.map((c, i) => ({ ...c, src: usedImages[i].src, alt: usedImages[i].alt }));
}

function DomeGallery({
  images = DG_DEFAULT_IMAGES,
  fit = 25,
  fitBasis = "auto",
  minRadius = 520,
  maxRadius = Infinity,
  padFactor = 0.16,
  maxVerticalRotationDeg = 6,
  dragSensitivity = 20,
  enlargeTransitionMs = 260,
  segments = 20,
  dragDampening = 2,
  openedImageBorderRadius = "22px",
  imageBorderRadius = "25px",
  grayscale = false,
  colorFilter = "saturate(1.15) contrast(1.06)",
  autoRotate = false,
  autoRotateDegPerSec = 10,
  autoRotateIdleDelayMs = 1000,

  // Phone/Tablet: disable click + drag + popup
  disableInteractionMaxWidth = 1024,

  // Desktop/Laptop: keep anchored popup in the same "viewer-frame" position
  viewerFrameShiftEnabled = true,
}) {
  const rootRef = useRef(null);
  const mainRef = useRef(null);
  const sphereRef = useRef(null);
  const frameRef = useRef(null);
  const viewerRef = useRef(null);
  const scrimRef = useRef(null);

  const rotationRef = useRef({ x: 0, y: 0 });
  const startRotRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef(null);

  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const inertiaRAF = useRef(null);
  const pointerTypeRef = useRef("mouse");

  const openingRef = useRef(false);
  const focusedElRef = useRef(null);
  const openStartedAtRef = useRef(0);

  const enlargeStateRef = useRef({ overlay: null });

  const autoRAF = useRef(null);
  const lastTsRef = useRef(0);
  const pauseUntilRef = useRef(0);

  const items = useMemo(() => dgBuildItems(images, segments), [images, segments]);

  const [interactionsDisabled, setInteractionsDisabled] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    const mqSmall = window.matchMedia(`(max-width: ${disableInteractionMaxWidth}px)`);
    const mqTouch = window.matchMedia("(hover: none) and (pointer: coarse)");
    return mqSmall.matches || mqTouch.matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const mqSmall = window.matchMedia(`(max-width: ${disableInteractionMaxWidth}px)`);
    const mqTouch = window.matchMedia("(hover: none) and (pointer: coarse)");
    const recompute = () => setInteractionsDisabled(mqSmall.matches || mqTouch.matches);

    if (mqSmall.addEventListener) mqSmall.addEventListener("change", recompute);
    else mqSmall.addListener(recompute);

    if (mqTouch.addEventListener) mqTouch.addEventListener("change", recompute);
    else mqTouch.addListener(recompute);

    recompute();

    return () => {
      if (mqSmall.removeEventListener) mqSmall.removeEventListener("change", recompute);
      else mqSmall.removeListener(recompute);

      if (mqTouch.removeEventListener) mqTouch.removeEventListener("change", recompute);
      else mqTouch.removeListener(recompute);
    };
  }, [disableInteractionMaxWidth]);

  const applyTransform = useCallback((xDeg, yDeg) => {
    const el = sphereRef.current;
    if (!el) return;
    el.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${xDeg}deg) rotateY(${yDeg}deg)`;
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver((entries) => {
      if (!entries?.length || !entries[0]?.contentRect) return;

      const cr = entries[0].contentRect;
      const w = Math.max(1, cr.width);
      const h = Math.max(1, cr.height);
      const minDim = Math.min(w, h);
      const aspect = w / h;

      let basis;
      switch (fitBasis) {
        case "min":
          basis = minDim;
          break;
        case "max":
          basis = Math.max(w, h);
          break;
        case "width":
          basis = w;
          break;
        case "height":
          basis = h;
          break;
        default:
          basis = aspect >= 1.3 ? w : minDim;
      }

      let radius = basis * fit;
      radius = Math.min(radius, h * 1.28);
      radius = dgClamp(radius, minRadius, maxRadius);

      const viewerPad = Math.max(10, Math.round(minDim * padFactor));

      root.style.setProperty("--radius", `${Math.round(radius)}px`);
      root.style.setProperty("--viewer-pad", `${viewerPad}px`);
      root.style.setProperty("--tile-radius", imageBorderRadius);
      root.style.setProperty("--enlarge-radius", openedImageBorderRadius);
      root.style.setProperty("--image-filter", grayscale ? "grayscale(1)" : "none");
      root.style.setProperty("--color-filter", colorFilter);

      applyTransform(rotationRef.current.x, rotationRef.current.y);
    });

    ro.observe(root);
    return () => ro.disconnect();
  }, [applyTransform, fit, fitBasis, minRadius, maxRadius, padFactor, grayscale, imageBorderRadius, openedImageBorderRadius, colorFilter]);

  const stopInertia = useCallback(() => {
    if (!inertiaRAF.current) return;
    cancelAnimationFrame(inertiaRAF.current);
    inertiaRAF.current = null;
  }, []);

  const startInertia = useCallback(
    (vx, vy) => {
      const MAX_V = 1.4;
      let vX = dgClamp(vx, -MAX_V, MAX_V) * 80;
      let vY = dgClamp(vy, -MAX_V, MAX_V) * 80;

      let frames = 0;
      const d = dgClamp(dragDampening ?? 0.6, 0, 1);
      const frictionMul = 0.94 + 0.055 * d;
      const stopThreshold = 0.015 - 0.01 * d;
      const maxFrames = Math.round(90 + 270 * d);

      const step = () => {
        vX *= frictionMul;
        vY *= frictionMul;

        if (Math.abs(vX) < stopThreshold && Math.abs(vY) < stopThreshold) {
          inertiaRAF.current = null;
          return;
        }
        if (++frames > maxFrames) {
          inertiaRAF.current = null;
          return;
        }

        const nextX = dgClamp(rotationRef.current.x - vY / 200, -maxVerticalRotationDeg, maxVerticalRotationDeg);
        const nextY = dgWrapAngleSigned(rotationRef.current.y + vX / 200);

        rotationRef.current = { x: nextX, y: nextY };
        applyTransform(nextX, nextY);

        inertiaRAF.current = requestAnimationFrame(step);
      };

      stopInertia();
      inertiaRAF.current = requestAnimationFrame(step);
    },
    [applyTransform, dragDampening, maxVerticalRotationDeg, stopInertia]
  );

  const cleanupEnlarge = useCallback(() => {
    const st = enlargeStateRef.current;
    if (st.overlay?.parentElement) st.overlay.remove();

    const el = focusedElRef.current;
    if (el) el.style.visibility = "";

    enlargeStateRef.current = { overlay: null };
    focusedElRef.current = null;
    openingRef.current = false;
    rootRef.current?.removeAttribute("data-enlarging");
  }, []);

  const closeEnlarge = useCallback(() => {
    if (performance.now() - openStartedAtRef.current < 180) return;

    const overlay = enlargeStateRef.current.overlay;
    const el = focusedElRef.current;

    if (!overlay) {
      cleanupEnlarge();
      return;
    }

    overlay.style.transition = `transform ${enlargeTransitionMs}ms ease, opacity ${enlargeTransitionMs}ms ease`;
    overlay.style.opacity = "0";
    overlay.style.transform = "translate(0px, 0px) scale(0.94)";

    window.setTimeout(() => {
      if (el) el.style.visibility = "";
      cleanupEnlarge();
      pauseUntilRef.current = performance.now() + autoRotateIdleDelayMs;
    }, enlargeTransitionMs + 40);
  }, [cleanupEnlarge, enlargeTransitionMs, autoRotateIdleDelayMs]);

  const openAnchoredModal = useCallback(
    (parent, el) => {
      const rootEl = rootRef.current;
      const rootR = rootEl?.getBoundingClientRect();
      if (!rootR) return;

      const frameR = frameRef.current?.getBoundingClientRect();

      const cs = getComputedStyle(rootEl);
      const padStr = cs.getPropertyValue("--viewer-pad") || "40";
      const viewerPad = dgClamp(parseInt(padStr, 10) || 40, 10, 120);

      // ✅ Safe region: keep popup inside the RIGHT HALF (no overlap into form)
      const safeInset = 12;
      const safeMinX = viewerFrameShiftEnabled ? rootR.left + rootR.width / 2 + safeInset : rootR.left + safeInset;
      const safeMaxX = rootR.right - safeInset;
      const safeMaxY = rootR.bottom - safeInset;
      const safeMinY = rootR.top + safeInset;

      const safeW = Math.max(1, safeMaxX - safeMinX);
      const safeH = Math.max(1, safeMaxY - safeMinY);

      // Desired size: follow frame, but clamp to safe right-half area + viewport.
      const desiredFromFrame = frameR && frameR.width > 0 && frameR.height > 0 ? Math.min(frameR.width, frameR.height) : Math.min(rootR.width, rootR.height);
      const desiredFromViewport = Math.min(window.innerWidth, window.innerHeight) - viewerPad * 2;

      let size = Math.min(desiredFromFrame, desiredFromViewport, safeW, safeH, 900);
      size = Math.max(size, 320);

      // Center point: frame center if available, otherwise safe area center
      const centerX = frameR ? frameR.left + frameR.width / 2 : safeMinX + safeW / 2;
      const centerY = frameR ? frameR.top + frameR.height / 2 : safeMinY + safeH / 2;

      // Convert to root-relative, then clamp so it never crosses safe region
      let left = Math.round(centerX - size / 2 - rootR.left);
      let top = Math.round(centerY - size / 2 - rootR.top);

      const minLeft = Math.round(safeMinX - rootR.left);
      const maxLeft = Math.round(safeMaxX - rootR.left - size);
      const minTop = Math.round(safeMinY - rootR.top);
      const maxTop = Math.round(safeMaxY - rootR.top - size);

      left = dgClamp(left, minLeft, Math.max(minLeft, maxLeft));
      top = dgClamp(top, minTop, Math.max(minTop, maxTop));

      const overlay = document.createElement("div");
      overlay.className = "dg-enlarge dg-enlarge--anchored";
      overlay.style.position = "absolute";
      overlay.style.left = `${left}px`;
      overlay.style.top = `${top}px`;
      overlay.style.width = `${Math.round(size)}px`;
      overlay.style.height = `${Math.round(size)}px`;
      overlay.style.opacity = "0";
      overlay.style.zIndex = "30";
      overlay.style.willChange = "transform, opacity";
      overlay.style.transformOrigin = "50% 50%";
      overlay.style.borderRadius = `var(--enlarge-radius, ${openedImageBorderRadius})`;
      overlay.style.overflow = "hidden";
      overlay.style.boxShadow = "0 18px 60px rgba(0,0,0,.14)";
      overlay.style.pointerEvents = "auto";
      overlay.style.transform = "translate(0px, 0px) scale(0.94)";

      const rawSrc = parent?.dataset?.src || el.querySelector("img")?.src || "";
      const rawAlt = parent?.dataset?.alt || el.querySelector("img")?.alt || "";

      const img = document.createElement("img");
      img.src = rawSrc;
      img.alt = rawAlt;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "contain";
      img.style.background = "white";
      img.style.filter = `${grayscale ? "grayscale(1)" : "none"} ${colorFilter}`;
      overlay.appendChild(img);

      overlay.addEventListener("click", (e) => {
        e.stopPropagation();
        closeEnlarge();
      });

      viewerRef.current?.appendChild(overlay);

      enlargeStateRef.current = { overlay };
      rootRef.current?.setAttribute("data-enlarging", "true");

      requestAnimationFrame(() => {
        overlay.style.transition = `transform ${enlargeTransitionMs}ms ease, opacity ${enlargeTransitionMs}ms ease`;
        overlay.style.opacity = "1";
        overlay.style.transform = "translate(0px, 0px) scale(1)";
        window.setTimeout(() => {
          openingRef.current = false;
        }, enlargeTransitionMs + 30);
      });
    },
    [closeEnlarge, colorFilter, enlargeTransitionMs, grayscale, openedImageBorderRadius, viewerFrameShiftEnabled]
  );

  const openItemFromElement = useCallback(
    (el) => {
      if (!el || openingRef.current || focusedElRef.current) return;
      if (interactionsDisabled) return;

      openingRef.current = true;
      openStartedAtRef.current = performance.now();
      pauseUntilRef.current = performance.now() + autoRotateIdleDelayMs;

      const parent = el.parentElement;
      if (!parent) {
        openingRef.current = false;
        return;
      }

      focusedElRef.current = el;
      openAnchoredModal(parent, el);
    },
    [autoRotateIdleDelayMs, interactionsDisabled, openAnchoredModal]
  );

  useGesture(
    {
      onDragStart: ({ event }) => {
        if (interactionsDisabled) return;
        if (focusedElRef.current) return;

        stopInertia();
        pointerTypeRef.current = event.pointerType || "mouse";

        draggingRef.current = true;
        movedRef.current = false;

        startRotRef.current = { ...rotationRef.current };
        startPosRef.current = { x: event.clientX, y: event.clientY };

        pauseUntilRef.current = performance.now() + autoRotateIdleDelayMs;
      },

      onDrag: ({ event, last, velocity: velArr = [0, 0], direction: dirArr = [0, 0], movement }) => {
        if (interactionsDisabled) return;
        if (focusedElRef.current || !draggingRef.current || !startPosRef.current) return;

        const dxTotal = event.clientX - startPosRef.current.x;
        const dyTotal = event.clientY - startPosRef.current.y;

        const absX = Math.abs(dxTotal);
        const absY = Math.abs(dyTotal);

        const touch = pointerTypeRef.current === "touch";
        const likelyScroll = touch && absY > absX * 1.25 && absY > 8;

        if (!movedRef.current) {
          const dist2 = dxTotal * dxTotal + dyTotal * dyTotal;
          if (dist2 > 16 * 16) movedRef.current = true;
        }

        if (!likelyScroll) {
          if (touch) event.preventDefault();

          const nextX = dgClamp(startRotRef.current.x - dyTotal / dragSensitivity, -maxVerticalRotationDeg, maxVerticalRotationDeg);
          const nextY = startRotRef.current.y + dxTotal / dragSensitivity;

          const cur = rotationRef.current;
          if (cur.x !== nextX || cur.y !== nextY) {
            rotationRef.current = { x: nextX, y: nextY };
            applyTransform(nextX, nextY);
          }
        }

        if (!last) return;

        draggingRef.current = false;

        let [vMagX, vMagY] = velArr;
        const [dirX, dirY] = dirArr;
        let vx = vMagX * dirX;
        let vy = vMagY * dirY;

        if (Math.abs(vx) < 0.001 && Math.abs(vy) < 0.001 && Array.isArray(movement)) {
          const [mx, my] = movement;
          vx = (mx / dragSensitivity) * 0.02;
          vy = (my / dragSensitivity) * 0.02;
        }

        if (!likelyScroll && (Math.abs(vx) > 0.005 || Math.abs(vy) > 0.005)) startInertia(vx, vy);

        startPosRef.current = null;
        movedRef.current = false;
        pauseUntilRef.current = performance.now() + autoRotateIdleDelayMs;
      },
    },
    { target: mainRef, eventOptions: { passive: false }, drag: { filterTaps: true, threshold: 6 } }
  );

  useEffect(() => {
    const scrim = scrimRef.current;
    if (!scrim) return;

    const onClick = () => closeEnlarge();
    scrim.addEventListener("click", onClick);

    const onKey = (e) => e.key === "Escape" && closeEnlarge();
    window.addEventListener("keydown", onKey);

    return () => {
      scrim.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [closeEnlarge]);

  useEffect(() => {
    if (!autoRotate) return;

    const tick = (ts) => {
      autoRAF.current = requestAnimationFrame(tick);

      if (!sphereRef.current) return;

      if (!interactionsDisabled) {
        if (draggingRef.current) return;
        if (focusedElRef.current) return;
        if (openingRef.current) return;

        const now = performance.now();
        if (now < pauseUntilRef.current) return;
      }

      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;

      const delta = autoRotateDegPerSec * dt;
      const nextY = dgWrapAngleSigned(rotationRef.current.y + delta);

      rotationRef.current = { ...rotationRef.current, y: nextY };
      applyTransform(rotationRef.current.x, rotationRef.current.y);
    };

    autoRAF.current = requestAnimationFrame(tick);
    return () => {
      if (autoRAF.current) cancelAnimationFrame(autoRAF.current);
      autoRAF.current = null;
      lastTsRef.current = 0;
    };
  }, [autoRotate, autoRotateDegPerSec, applyTransform, interactionsDisabled]);

  const cssStyles = `
    .sphere-root {
      --radius: 520px;
      --viewer-pad: 40px;
      --circ: calc(var(--radius) * 3.14);
      --rot-y: calc((360deg / var(--segments-x)) / 2);
      --rot-x: calc((360deg / var(--segments-y)) / 2);
      --item-width: calc(var(--circ) / var(--segments-x));
      --item-height: calc(var(--circ) / var(--segments-y));
      --tile-radius: 26px;
      --enlarge-radius: 22px;
      --image-filter: none;
      --color-filter: saturate(1.15) contrast(1.06);
    }

    .sphere-root * { box-sizing: border-box; }
    .sphere, .sphere-item, .item__image { transform-style: preserve-3d; }

    .dg-bg {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background:
        radial-gradient(1100px 720px at 16% 16%,
          rgba(185,255,102,0.62) 0%,
          rgba(214,255,173,0.38) 32%,
          rgba(255,255,255,0.00) 70%
        ),
        radial-gradient(980px 720px at 78% 40%,
          rgba(214,255,173,0.44) 0%,
          rgba(236,255,223,0.24) 38%,
          rgba(255,255,255,0.00) 72%
        ),
        radial-gradient(900px 700px at 50% 55%,
          rgba(255,255,255,1) 0%,
          rgba(250,252,248,1) 58%,
          rgba(245,250,244,1) 100%
        );
    }

    .dg-bg::after{
      content:"";
      position:absolute;
      inset:0;
      pointer-events:none;
      opacity: .35;
      background:
        radial-gradient(circle at 1px 1px, rgba(0,0,0,0.10) 1px, rgba(0,0,0,0) 1.6px);
      background-size: 22px 22px;
      mix-blend-mode: soft-light;
    }

    .stage {
      width: 100%;
      height: 100%;
      display: grid;
      place-items: center;
      position: absolute;
      inset: 0;
      margin: auto;
      perspective: calc(var(--radius) * 2);
      perspective-origin: 50% 46%;
      z-index: 2;
    }

    .sphere {
      transform: translateZ(calc(var(--radius) * -1));
      will-change: transform;
      position: absolute;
    }

    .sphere-item {
      width: calc(var(--item-width) * var(--item-size-x));
      height: calc(var(--item-height) * var(--item-size-y));
      position: absolute;
      top: -999px; bottom: -999px; left: -999px; right: -999px;
      margin: auto;
      transform-origin: 50% 50%;
      backface-visibility: hidden;
      transition: transform 300ms;
      transform:
        rotateY(calc(var(--rot-y) * (var(--offset-x) + ((var(--item-size-x) - 1) / 2)) + var(--rot-y-delta, 0deg)))
        rotateX(calc(var(--rot-x) * (var(--offset-y) - ((var(--item-size-y) - 1) / 2)) + var(--rot-x-delta, 0deg)))
        translateZ(var(--radius));
    }

    .item__image {
      position: absolute;
      inset: clamp(7px, 1.1vw, 12px);
      border-radius: var(--tile-radius, 12px);
      overflow: hidden;
      cursor: pointer;
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
      pointer-events: auto;
      transform: translateZ(0);
      box-shadow: 0 14px 30px rgba(0,0,0,.16);
      outline: none;
      background: rgba(255,255,255,.92);
      transition: transform 160ms ease, box-shadow 160ms ease;
    }

    .sphere-root[data-interactions="off"] .item__image {
      cursor: default;
      pointer-events: none;
      box-shadow: 0 14px 30px rgba(0,0,0,.14);
    }

    @media (hover: hover) and (pointer: fine) {
      .sphere-root:not([data-interactions="off"]) .item__image:hover {
        transform: translateZ(0) scale(1.025);
        box-shadow: 0 20px 44px rgba(0,0,0,.20);
      }
    }

    .sphere-root:not([data-interactions="off"]) .item__image:active { transform: translateZ(0) scale(0.99); }

    .item__image:focus-visible {
      outline: 3px solid rgba(0,0,0,.20);
      outline-offset: 3px;
    }

    .dg-tile-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      pointer-events: none;
      user-select: none;
      -webkit-user-drag: none;
      filter: var(--image-filter) var(--color-filter);
    }

    .viewer { pointer-events: none; }
    .sphere-root[data-enlarging="true"] .viewer { pointer-events: auto; }

    .sphere-root[data-enlarging="true"] .scrim {
      opacity: 1 !important;
      pointer-events: auto !important;
      cursor: zoom-out;
    }

    .scrim {
      background:
        radial-gradient(900px 600px at 30% 30%, rgba(185,255,102,0.30) 0%, rgba(185,255,102,0.16) 38%, rgba(255,255,255,0.10) 78%),
        rgba(255,255,255,0.08);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }

    .dg-vignette {
      position: absolute;
      inset: 0;
      z-index: 3;
      pointer-events: none;
      background:
        radial-gradient(circle at 50% 50%,
          rgba(255,255,255,0.00) 58%,
          rgba(185,255,102,0.12) 78%,
          rgba(185,255,102,0.26) 100%
        );
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssStyles }} />
      <div
        ref={rootRef}
        className="sphere-root relative w-full h-full"
        data-interactions={interactionsDisabled ? "off" : "on"}
        style={{
          ["--segments-x"]: segments,
          ["--segments-y"]: segments,
          ["--tile-radius"]: imageBorderRadius,
          ["--enlarge-radius"]: openedImageBorderRadius,
          ["--image-filter"]: grayscale ? "grayscale(1)" : "none",
          ["--color-filter"]: colorFilter,
        }}
      >
        <main
          ref={mainRef}
          className="absolute inset-0 grid place-items-center overflow-hidden select-none bg-transparent"
          style={{
            touchAction: interactionsDisabled ? "auto" : "pan-y",
            WebkitUserSelect: "none",
          }}
        >
          <div className="dg-bg" />

          <div className="stage">
            <div ref={sphereRef} className="sphere">
              {items.map((it, i) => (
                <div
                  key={`${it.x},${it.y},${i}`}
                  className="sphere-item absolute m-auto"
                  data-src={it.src}
                  data-alt={it.alt}
                  data-offset-x={it.x}
                  data-offset-y={it.y}
                  data-size-x={it.sizeX}
                  data-size-y={it.sizeY}
                  style={{
                    ["--offset-x"]: it.x,
                    ["--offset-y"]: it.y,
                    ["--item-size-x"]: it.sizeX,
                    ["--item-size-y"]: it.sizeY,
                  }}
                >
                  <div
                    className="item__image absolute block overflow-hidden"
                    role={interactionsDisabled ? undefined : "button"}
                    tabIndex={interactionsDisabled ? -1 : 0}
                    aria-label={it.alt || "Open image"}
                    onClick={(e) => {
                      if (interactionsDisabled) return;
                      if (draggingRef.current) return;
                      if (openingRef.current) return;
                      openItemFromElement(e.currentTarget);
                    }}
                    onKeyDown={(e) => {
                      if (interactionsDisabled) return;
                      if (e.key !== "Enter" && e.key !== " ") return;
                      e.preventDefault();
                      if (draggingRef.current) return;
                      if (openingRef.current) return;
                      openItemFromElement(e.currentTarget);
                    }}
                  >
                    <img src={it.src} draggable={false} alt={it.alt} className="dg-tile-img" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dg-vignette" />

          <div ref={viewerRef} className="viewer absolute inset-0 z-20 flex items-center justify-center" style={{ padding: "var(--viewer-pad)" }}>
            <div ref={scrimRef} className="scrim absolute inset-0 z-10 opacity-0 transition-opacity duration-300" />

            <div
              ref={frameRef}
              className="viewer-frame h-full aspect-square flex pointer-events-none"
              style={{
                marginLeft: viewerFrameShiftEnabled ? "50%" : "0%",
                transform: viewerFrameShiftEnabled ? "translateX(clamp(0px, 3vw, 70px))" : "translateX(0px)",
              }}
            />
          </div>
        </main>
      </div>
    </>
  );
}

/* ======================
   SIGNUP PAGE
====================== */

const COURSES = [
  "Bachelor of Science in Nursing",
  "Bachelor of Elementary Education (SPED)",
  "Bachelor of Physical Education",
  "Bachelor of Secondary Education",
  "Bachelor of Science in Business Administration (BSBA)",
  "Bachelor of Science in Accounting Information System",
  "Bachelor of Science in Information Technology",
  "Bachelor of Science in Computer Science",
  "Bachelor of Science in Hospitality Management (BSHM)",
  "Bachelor of Science in Tourism Management (BSTM)",
  "Bachelor of Science in Criminology",
  "Bachelor of Arts in English Language",
  "Bachelor of Arts in Psychology",
  "Bachelor of Arts in Political Science",
];

function Spinner({ size = 16 }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function TermsModal({ open, onClose, onAgree, agreed, setAgreed, loading }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center p-3 sm:p-6 overflow-y-auto"
      style={{
        paddingTop: "max(12px, env(safe-area-inset-top))",
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
      }}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        className="relative w-full max-w-[760px] rounded-[22px] border-4 border-black bg-white shadow-[0_18px_0_rgba(0,0,0,0.18)] overflow-hidden flex flex-col"
        style={{ maxHeight: "min(90dvh, 860px)" }}
      >
        <div className="p-5 sm:p-6 border-b border-black/10 bg-white shrink-0">
          <h2 className="text-[18px] sm:text-[20px] font-extrabold tracking-[0.12em]">TERMS & CONDITIONS</h2>
          <p className="text-[13px] text-black/60 mt-2">Please review and accept to create your account.</p>
        </div>

        <div
          className="p-5 sm:p-6 flex-1 min-h-0 overflow-y-auto text-[13px] sm:text-[14px] leading-relaxed text-black/75"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <p className="font-bold text-black/80 mb-2">Summary</p>
          <ul className="list-disc list-inside space-y-2">
            <li>CheckIn supports student well-being using journaling and PHQ-9 self-assessment.</li>
            <li>
              CheckIn is <span className="font-semibold">not</span> a diagnostic tool and does not replace professional care.
            </li>
            <li>Use the platform respectfully. Do not attempt unauthorized access or misuse.</li>
            <li>If you are in immediate danger, contact emergency services or your local hotline.</li>
          </ul>

          <div className="mt-5">
            <p className="font-bold text-black/80 mb-2">Full Terms</p>
            <p className="mb-3">
              By creating an account and using CheckIn, you agree to use the platform only for lawful and appropriate purposes.
            </p>
            <p className="mb-3">CheckIn may store and process information you provide to deliver features and improve performance.</p>
            <p className="mb-3">CheckIn is provided “as is.” We cannot guarantee uninterrupted availability.</p>
            <p>We may update these terms when necessary. Continued use constitutes acceptance of updated terms.</p>
          </div>
        </div>

        <div className="p-5 sm:p-6 border-t border-black/10 bg-white shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <label className="flex items-center gap-2 text-[13px] font-bold">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="accent-greenBorder" />
            I agree to the Terms & Conditions
          </label>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-[13px] font-extrabold rounded-[12px] border-2 border-black bg-white hover:bg-black/5"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!agreed || loading}
              onClick={onAgree}
              className={`px-5 py-2 text-[13px] font-extrabold rounded-[12px] border-2 border-black flex items-center gap-2 justify-center ${
                agreed ? "bg-black text-white hover:opacity-90" : "bg-black/30 text-white cursor-not-allowed"
              }`}
            >
              {loading ? (
                <>
                  <Spinner />
                  Loading
                </>
              ) : (
                "Agree & Continue"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SuccessModal({ open, title = "Success", message, buttonText = "Continue", onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4"
      style={{
        paddingTop: "max(12px, env(safe-area-inset-top))",
        paddingBottom: "max(12px, env(safe-area-inset-bottom))",
      }}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-[520px] rounded-[22px] border-4 border-black bg-white shadow-[0_18px_0_rgba(0,0,0,0.18)] overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-black/10">
          <h2 className="text-[18px] sm:text-[20px] font-extrabold tracking-[0.12em] text-black">
            {title}
          </h2>
          <p className="text-[13px] sm:text-[14px] text-black/70 mt-2 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="p-5 sm:p-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-[13px] font-extrabold rounded-[12px] border-2 border-black bg-black text-white hover:opacity-90"
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}


/* ======================
   COURSE DROPDOWN
====================== */

function CourseDropdown({ label, value, onChange, options, disabled }) {
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0, width: 0, maxHeight: 280 });

  const selectedLabel = value || "Select your course";

  useEffect(() => setMounted(true), []);

  const computePos = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const gap = 10;
    const viewportPad = 10;

    const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPad;
    const spaceAbove = rect.top - gap - viewportPad;

    const desiredMax = 340;
    const openUp = spaceBelow < 200 && spaceAbove > spaceBelow;

    const maxHeight = Math.max(200, Math.min(desiredMax, openUp ? spaceAbove : spaceBelow));

    const top = openUp
      ? Math.max(viewportPad, rect.top - gap - maxHeight)
      : Math.min(window.innerHeight - viewportPad - maxHeight, rect.bottom + gap);

    const left = Math.min(Math.max(viewportPad, rect.left), window.innerWidth - viewportPad - rect.width);

    setPos({ left, top, width: rect.width, maxHeight });
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;

    computePos();

    const onDocDown = (e) => {
      const wrap = wrapRef.current;
      const menu = menuRef.current;
      const t = e.target;
      if (wrap && wrap.contains(t)) return;
      if (menu && menu.contains(t)) return;
      close();
    };

    const onKey = (e) => e.key === "Escape" && close();
    const onResize = () => computePos();
    const onScroll = () => computePos();

    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("touchstart", onDocDown, { passive: true });
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("touchstart", onDocDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, close, computePos]);

  const handlePick = (opt) => {
    onChange({ target: { value: opt } });
    close();
  };

  const menu = open ? (
    <div
      ref={menuRef}
      role="listbox"
      className="z-[9999] rounded-[14px] border-2 border-black bg-white shadow-[0_16px_0_rgba(0,0,0,0.14)] overflow-hidden"
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        width: pos.width,
        maxHeight: pos.maxHeight,
        overscrollBehavior: "contain",
      }}
    >
      <div className="h-full overflow-y-auto" style={{ maxHeight: pos.maxHeight, WebkitOverflowScrolling: "touch" }}>
        <button
          type="button"
          onClick={() => handlePick("")}
          className={`w-full text-left px-4 py-3 text-[14px] hover:bg-black/5 ${!value ? "font-extrabold" : "font-semibold"}`}
        >
          Select your course
        </button>

        {options.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => handlePick(opt)}
              className={`w-full text-left px-4 py-3 text-[14px] hover:bg-black/5 ${
                active ? "bg-black text-white hover:bg-black" : "text-black"
              }`}
              style={{ overflowWrap: "anywhere" }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <div ref={wrapRef} className="relative w-full">
      <span className="block text-[13px] font-extrabold text-black/90 mb-1">{label}</span>

      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={`
          relative w-full text-left rounded-[14px] border-2 border-black bg-white
          px-4 pr-11 py-3 sm:py-[14px]
          text-[14px] sm:text-[15px] leading-snug
          focus:outline-none focus:ring-2 focus:ring-black/20
          ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        <span
          className={`${value ? "text-black" : "text-black/50"} block`}
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {selectedLabel}
        </span>

        <span
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-black transition-transform duration-150 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {mounted ? createPortal(menu, document.body) : null}
    </div>
  );
}

/* ======================
   SIGNUP
====================== */

async function fetchJsonSafe(url, options) {
  const res = await fetch(url, options);
  const raw = await res.text();
  let data = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  return { res, data, raw };
}

export default function Signup() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    studentNumber: "",
    course: "",
    password: "",
    confirmPassword: "",
  });

  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successModalMsg, setSuccessModalMsg] = useState("");
  const successRedirectRef = useRef(null);


  const setField = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [termsLoading, setTermsLoading] = useState(false);

  const pendingActionRef = useRef(null);

  const errorTimerRef = useRef(null);

  const successTimerRef = useRef(null);

  const showSuccess = (msg) => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setSuccess(msg);

    successTimerRef.current = setTimeout(() => {
      setSuccess("");
      successTimerRef.current = null;
    }, 2500);
  };

    const showError = (msg) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setError(msg);

    errorTimerRef.current = setTimeout(() => {
      setError("");
      errorTimerRef.current = null;
    }, 2500);
  };

    useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");

    const prev = {
      htmlOverflowY: html.style.overflowY,
      bodyOverflowY: body.style.overflowY,
      bodyOverflowX: body.style.overflowX,
      rootOverflowY: root?.style.overflowY,
    };

    html.style.overflowY = "auto";
    body.style.overflowY = "auto";
    body.style.overflowX = prev.bodyOverflowX || "hidden";
    if (root) root.style.overflowY = prev.rootOverflowY || "visible";

    return () => {
      html.style.overflowY = prev.htmlOverflowY;
      body.style.overflowY = prev.bodyOverflowY;
      body.style.overflowX = prev.bodyOverflowX;
      if (root) root.style.overflowY = prev.rootOverflowY ?? "";
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("termsAccepted") === "true";
    setTermsAccepted(saved);
    setTermsChecked(false);
  }, []);

  const runPendingIfAny = () => {
    const pending = pendingActionRef.current;
    pendingActionRef.current = null;
    if (typeof pending === "function") pending();
  };

  const handleAgreeTerms = () => {
    setTermsLoading(true);
    setTimeout(() => {
      localStorage.setItem("termsAccepted", "true");
      setTermsAccepted(true);
      setTermsChecked(false);
      setShowTerms(false);
      setTermsLoading(false);
      setTimeout(runPendingIfAny, 0);
    }, 450);
  };

  const requireTermsThen = async (fn) => {
    if (!termsAccepted) {
      pendingActionRef.current = fn;
      setTermsChecked(false);
      setShowTerms(true);
      return;
    }
    await fn();
  };

const handleGoogleSignup = async () => {
  if (loading) return;

  await requireTermsThen(async () => {
    setLoading(true);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setError("");
    setSuccess(""); // keep if you have success state; harmless

    try {
      const course = (form.course || "").trim();
      const studentNumber = (form.studentNumber || "").trim();

      if (!course) throw new Error("Please select your course.");
      if (!studentNumber) throw new Error("Student number is not yet filled up.");

      const studentNumberRegex = /^[0-9]{2}-[0-9]{5}$/;
      if (!studentNumberRegex.test(studentNumber)) throw new Error("Invalid, please try again.");

      const firebaseUser = await signInWithGoogle();

      // ✅ normalize firebase return
      const u = firebaseUser?.user || firebaseUser;

      const payload = {
        googleId: u?.uid,
        email: u?.email,
        fullName: u?.displayName || u?.email?.split("@")?.[0] || "Google User",
        course,
        studentNumber,
        mode: "register",
      };

      const { res, data, raw } = await fetchJsonSafe("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const serverMsg = (data?.message || raw || "Google sign up failed.").toString();
        const m = serverMsg.toLowerCase();

        // ✅ nicer UX for "already exists"
        if (res.status === 409 || (m.includes("email") && (m.includes("exist") || m.includes("already") || m.includes("taken")))) {
          throw new Error("Account already exists. Please log in.");
        }

        if (m.includes("username") && (m.includes("exist") || m.includes("taken") || m.includes("already"))) {
          throw new Error("Username is taken.");
        }

        throw new Error(serverMsg);
      }

      // ✅ SUCCESS: show modal FIRST, then redirect on close
      const msg = "Account successfully created. Please log in.";

      setSuccessModalMsg(msg);

      successRedirectRef.current = () => {
        navigate("/login", {
          state: {
            noticeType: "success",
            noticeMessage: msg,
          },
        });
      };

      setSuccessModalOpen(true);
    } catch (err) {
      showError(err?.message || "Google sign up failed");
    } finally {
      setLoading(false);
    }
  });
};


const handleCreateAccount = async (e) => {
  e.preventDefault();

  await requireTermsThen(async () => {
    setLoading(true);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setError("");

    try {
      const firstName = form.firstName.trim();
      const lastName = form.lastName.trim();
      const fullName = [firstName, lastName].filter(Boolean).join(" ");

      const email = form.email.trim();
      const username = form.username.trim();
      const studentNumber = form.studentNumber.trim();
      const course = (form.course || "").trim();

      if (!firstName || !lastName || !email || !username || !studentNumber || !course || !form.password) {
        throw new Error("Please fill in all required fields.");
      }

      // ✅ Email format
      const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      if (!emailRegex.test(email)) {
        throw new Error("Email is invalid. Please try again.");
      }

      // ✅ Username minimum 6 chars
      if (username.length < 6) {
        throw new Error("Username must be at least 6 characters.");
      }

      // ✅ Student Number validation (generic message only)
      const studentNumberRegex = /^[0-9]{2}-[0-9]{5}$/;
      if (!studentNumberRegex.test(studentNumber)) {
        throw new Error("Invalid, please try again.");
      }

      if (form.password.length < 6) throw new Error("Password must be at least 6 characters.");
      if (form.password !== form.confirmPassword) throw new Error("Passwords do not match.");

      const { res, data, raw } = await fetchJsonSafe("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          firstName,
          lastName,
          email,
          username,
          studentNumber,
          course,
          password: form.password,
        }),
      });

      if (!res.ok) {
        const serverMsg = (data?.message || raw || "Signup failed.").toString().toLowerCase();

        if (serverMsg.includes("email") && (serverMsg.includes("exist") || serverMsg.includes("taken") || serverMsg.includes("already"))) {
          throw new Error("Email is taken.");
        }

        if (serverMsg.includes("username") && (serverMsg.includes("exist") || serverMsg.includes("taken") || serverMsg.includes("already"))) {
          throw new Error("Username is taken.");
        }

        throw new Error(data?.message || raw || "Signup failed.");
      }

      // ✅ IMPORTANT: do NOT store token/user on signup anymore
      // Backend now returns message only.
      // Optional: you can show success then redirect.
      // showError is for errors; if you want a success UI, use your success UI handler instead.
      // For now: just redirect.
      navigate("/login");
    } catch (err) {
      showError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  });
};




  const uiPatchStyles = `
    /* GoogleButton full width */
    .google-btn-wrap { width: 100%; }
    .google-btn-wrap > * { width: 100%; }
    .google-btn-wrap button,
    .google-btn-wrap a,
    .google-btn-wrap [role="button"] {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  `;

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{
        background:
          "radial-gradient(1400px 820px at 14% 12%, rgba(185,255,102,0.55) 0%, rgba(214,255,173,0.28) 36%, rgba(255,255,255,0) 74%), radial-gradient(1200px 760px at 78% 40%, rgba(214,255,173,0.38) 0%, rgba(236,255,223,0.20) 42%, rgba(255,255,255,0) 78%), linear-gradient(#ffffff,#ffffff)",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: uiPatchStyles }} />

      <TermsModal
        open={showTerms}
        onClose={() => {
          pendingActionRef.current = null;
          setShowTerms(false);
          setTermsChecked(false);
        }}
        onAgree={handleAgreeTerms}
        agreed={termsChecked}
        setAgreed={setTermsChecked}
        loading={termsLoading}
      />
      <SuccessModal
        open={successModalOpen}
        title="Account created"
        message={successModalMsg}
        buttonText="Go to Login"
        onClose={() => {
          setSuccessModalOpen(false);

          // ✅ redirect only after user acknowledges
          if (typeof successRedirectRef.current === "function") {
            const go = successRedirectRef.current;
            successRedirectRef.current = null;
            go();
          }
        }}
      />

      {/* BACKGROUND DOME */}
      <div className="absolute inset-0 z-0">
        <DomeGallery
          fit={1}
          autoRotate
          autoRotateDegPerSec={5}
          autoRotateIdleDelayMs={1000}
          disableInteractionMaxWidth={1024}
        />
      </div>

      {/* LEFT BLUR */}
      <div
        className="absolute inset-0 z-10 pointer-events-none w-full xl:w-1/2 xl:inset-y-0 xl:left-0"
        style={{
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          maskImage: "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 86%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage: "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 86%, rgba(0,0,0,0) 100%)",
          background: "linear-gradient(to right, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0.28) 22%, rgba(255,255,255,0) 100%)",
        }}
        aria-hidden="true"
      />

      <div className="hidden xl:block absolute inset-y-0 left-0 z-20 w-1/2" style={{ pointerEvents: "auto" }} aria-hidden="true" />

      {/* FOREGROUND CONTENT */}
      <div className="relative z-30 mx-auto w-full max-w-[1400px] pointer-events-none px-[clamp(16px,3.4vw,90px)] pt-[clamp(22px,5vh,92px)] pb-[clamp(22px,5vh,56px)]">
        <div className="grid grid-cols-1 xl:grid-cols-2 items-start gap-[clamp(18px,3.2vw,64px)]">
          <section className="w-full mx-auto xl:mx-0 xl:justify-self-start" style={{ maxWidth: "560px", pointerEvents: "auto" }}>
            <div
              className="
                relative
                rounded-[22px]
                bg-white/35
                border border-black/10
                shadow-[0_18px_60px_rgba(0,0,0,0.12)]
                px-5 sm:px-6
                py-6 sm:py-7
              "
            >
              <h1 className="text-[28px] sm:text-[36px] font-black tracking-[.22em] sm:tracking-[.26em] leading-tight text-black drop-shadow-sm">
                SIGN UP
              </h1>
              <p className="text-[13px] sm:text-[15px] text-black/80 mt-2">Create your account. It only takes a minute.</p>

              {error && (
                <div className="mt-5 rounded-[16px] border-2 border-black bg-red-50 px-4 py-3 text-[13px]">
                  <b>Error:</b> {error}
                </div>
              )}

              {success && (
                <div className="mt-5 rounded-[16px] border-2 border-black bg-green-50 px-4 py-3 text-[13px]">
                  <b>Success:</b> {success}
                </div>
              )}

              <form className="mt-6 flex flex-col gap-4" onSubmit={handleCreateAccount}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TextInput label="First Name" value={form.firstName} onChange={setField("firstName")} />
                  <TextInput label="Last Name" value={form.lastName} onChange={setField("lastName")} />
                </div>

                <TextInput label="Email" value={form.email} onChange={setField("email")} />
                <TextInput label="Username" value={form.username} onChange={setField("username")} />
                <TextInput label="Student number" value={form.studentNumber} onChange={setField("studentNumber")} />

                <CourseDropdown label="Course" value={form.course} onChange={setField("course")} options={COURSES} disabled={loading} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <TextInput label="Password" type="password" value={form.password} onChange={setField("password")} />
                  <TextInput label="Confirm Password" type="password" value={form.confirmPassword} onChange={setField("confirmPassword")} />
                </div>

                <div className="pt-1 flex flex-col gap-3">
                  <PrimaryButton className="w-full" disabled={loading} type="submit">
                    {loading ? "Creating..." : "Create Account"}
                  </PrimaryButton>
                </div>
              </form>

                <div className="google-btn-wrap mt-3">
                  <GoogleButton
                    label="Sign up with Google"
                    onClick={(e) => {
                      e?.preventDefault?.();
                      e?.stopPropagation?.();
                      handleGoogleSignup();
                    }}
                    loading={loading}
                  />
                </div>

              <p className="text-[13px] text-black/80 mt-4">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-extrabold underline underline-offset-4 decoration-black/50 hover:decoration-black/80 whitespace-nowrap"
                >
                  Login
                </Link>
              </p>
            </div>
          </section>

          <section className="hidden xl:block pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
