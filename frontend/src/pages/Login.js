// src/pages/Login.js

import { useLocation } from "react-router-dom";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { useGesture } from "@use-gesture/react";

import TextInput from "../components/TextInput";
import PrimaryButton from "../components/PrimaryButton";
import GoogleButton from "../components/GoogleButton";

import { signInWithGoogle } from "../auth";
import { getToken, getUser, setAuth } from "../utils/auth";

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
  fit = 1,
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
  autoRotate = true,
  autoRotateDegPerSec = 5,
  autoRotateIdleDelayMs = 1000,

  // ✅ Phone/Tablet: disable click + drag + popup
  disableInteractionMaxWidth = 1024,

  // ✅ Desktop/Laptop: viewer-frame shifted to right area (visual anchor)
  viewerFrameShiftEnabled = true,

  // ✅ Use the real form panel as "left boundary" (prevents overlap)
  safeLeftSelector = '[data-auth-panel="true"]',
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
      const cr = entries?.[0]?.contentRect;
      if (!cr) return;

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
    const overlay = enlargeStateRef.current.overlay;
    if (overlay?.parentElement) overlay.remove();

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

      // ✅ REAL SAFE LEFT EDGE (form panel right edge)
      let safeMinX = rootR.left + 12;
      const formEl = safeLeftSelector ? document.querySelector(safeLeftSelector) : null;
      const formR = formEl?.getBoundingClientRect?.();
      if (formR && formR.width > 0) {
        safeMinX = Math.max(safeMinX, formR.right + 12);
      } else if (viewerFrameShiftEnabled) {
        safeMinX = Math.max(safeMinX, rootR.left + rootR.width / 2 + 12);
      }

      const safeInset = 12;
      const safeMaxX = rootR.right - safeInset;
      const safeMinY = rootR.top + safeInset;
      const safeMaxY = rootR.bottom - safeInset;

      const safeW = Math.max(1, safeMaxX - safeMinX);
      const safeH = Math.max(1, safeMaxY - safeMinY);

      // Responsive size: follows frame + viewport, clamped
      const desiredFromFrame =
        frameR && frameR.width > 0 && frameR.height > 0 ? Math.min(frameR.width, frameR.height) : Math.min(rootR.width, rootR.height);
      const desiredFromViewport = Math.min(window.innerWidth, window.innerHeight) - viewerPad * 2;

      let size = Math.min(desiredFromFrame, desiredFromViewport, safeW, safeH, 900);
      size = Math.max(size, 320);

      const centerX = frameR ? frameR.left + frameR.width / 2 : safeMinX + safeW / 2;
      const centerY = frameR ? frameR.top + frameR.height / 2 : safeMinY + safeH / 2;

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
    [closeEnlarge, colorFilter, enlargeTransitionMs, grayscale, openedImageBorderRadius, viewerFrameShiftEnabled, safeLeftSelector]
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

      // ✅ Phone/tablet: rotate-only (ignore pauses)
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
        rotateY(calc(var(--rot-y) * (var(--offset-x) + ((var(--item-size-x) - 1) / 2))))
        rotateX(calc(var(--rot-x) * (var(--offset-y) - ((var(--item-size-y) - 1) / 2))))
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
  UI: SPINNER + ICONS
====================== */

function Spinner({ size = 18 }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function EyeOpenIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function EyeClosedIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 2.42-4.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6.4 6.4C4.1 8.1 2.5 12 2.5 12s3.5 7 9.5 7c1.56 0 2.96-.29 4.2-.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9.8 4.22A10.2 10.2 0 0 1 12 5c6 0 9.5 7 9.5 7s-1.34 2.67-4.02 4.62" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ======================
  TERMS MODAL (PORTAL + SCROLL LOCK)
====================== */

function getFocusable(root) {
  if (!root) return [];
  const nodes = root.querySelectorAll(
    [
      'a[href]:not([tabindex="-1"])',
      "button:not([disabled]):not([tabindex='-1'])",
      "textarea:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ].join(",")
  );
  return Array.from(nodes).filter((el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length));
}

function TermsModal({ open, onClose, onAgree, agreed, setAgreed, loading }) {
  const modalRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement;

    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById("root");

    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      rootAriaHidden: root?.getAttribute("aria-hidden"),
      rootInert: root?.inert,
    };

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    if (root) {
      root.setAttribute("aria-hidden", "true");
      if ("inert" in root) root.inert = true;
    }

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const focusables = getFocusable(modalRef.current);
      if (!focusables.length) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey) {
        if (active === first || !modalRef.current.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    requestAnimationFrame(() => {
      const focusables = getFocusable(modalRef.current);
      (focusables[0] || modalRef.current)?.focus?.();
    });

    return () => {
      document.removeEventListener("keydown", onKeyDown);

      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;

      if (root) {
        if (prev.rootAriaHidden == null) root.removeAttribute("aria-hidden");
        else root.setAttribute("aria-hidden", prev.rootAriaHidden);
        if ("inert" in root) root.inert = !!prev.rootInert;
      }

      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/40" onClick={() => !loading && onClose()} aria-hidden="true" />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-title"
        tabIndex={-1}
        className="relative w-full max-w-[760px] rounded-[22px] border-4 border-black bg-white shadow-[0_18px_0_rgba(0,0,0,0.18)] overflow-hidden"
      >
        <div className="p-5 sm:p-6 border-b border-black/10">
          <h2 id="terms-title" className="text-[18px] sm:text-[20px] font-extrabold tracking-[0.12em]">
            TERMS & CONDITIONS
          </h2>
          <p className="text-[13px] text-black/60 mt-2">Please review and accept to continue.</p>
        </div>

        <div className="p-5 sm:p-6 max-h-[55vh] overflow-y-auto text-[13px] sm:text-[14px] leading-relaxed text-black/75">
          <p className="font-bold text-black/80 mb-2">Summary</p>
          <ul className="list-disc list-inside space-y-2">
            <li>CheckIn supports student well-being using journaling and PHQ-9 self-assessment.</li>
            <li>
              CheckIn is <span className="font-semibold">not</span> a diagnostic tool and does not replace professional care.
            </li>
            <li>Use the platform respectfully. Do not attempt unauthorized access or misuse.</li>
            <li>If you are in immediate danger, contact emergency services or your local hotline.</li>
          </ul>
        </div>

        <div className="p-5 sm:p-6 border-t border-black/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <label className="flex items-center gap-2 text-[13px] font-bold">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="accent-greenBorder" disabled={loading} />
            I agree to the Terms & Conditions
          </label>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2 text-[13px] font-extrabold rounded-[12px] border-2 border-black bg-white hover:bg-black/5
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={!agreed || loading}
              onClick={onAgree}
              className={`px-5 py-2 text-[13px] font-extrabold rounded-[12px] border-2 border-black flex items-center gap-2 justify-center
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-black/25 ${
                            agreed && !loading ? "bg-black text-white hover:opacity-90 active:scale-[0.99]" : "bg-black/30 text-white cursor-not-allowed"
                          }`}
            >
              {loading ? (
                <>
                  <Spinner size={16} />
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

  return createPortal(content, document.body);
}


      function NoticeModal({ open, message, showSignupHint, onClose, disabled }) {
        const modalRef = useRef(null);

        useEffect(() => {
          if (!open) return;

          const onKeyDown = (e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              if (!disabled) onClose();
            }
          };

          document.addEventListener("keydown", onKeyDown);
          requestAnimationFrame(() => modalRef.current?.focus?.());

          return () => document.removeEventListener("keydown", onKeyDown);
        }, [open, onClose, disabled]);

        if (!open) return null;

        const content = (
          <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 sm:p-6">
            <div
              className="absolute inset-0 bg-black/45"
              onClick={() => !disabled && onClose()}
              aria-hidden="true"
            />

            <div
              ref={modalRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="notice-title"
              className="relative w-full max-w-[520px] rounded-[22px] border-4 border-black bg-white shadow-[0_18px_0_rgba(0,0,0,0.18)] overflow-hidden"
            >
              <div className="p-5 sm:p-6 border-b border-black/10">
                <h2 id="notice-title" className="text-[16px] sm:text-[18px] font-extrabold tracking-[0.12em]">
                  NOTICE
                </h2>
                <p className="text-[13px] text-black/60 mt-2">Please read this message.</p>
              </div>

              <div className="p-5 sm:p-6 text-[13px] sm:text-[14px] leading-relaxed text-black/80">
                <p className="break-words">{message || "—"}</p>

                {showSignupHint && (
                  <div className="mt-4">
                    <Link
                      to="/sign-up"
                      className="inline-flex font-extrabold underline underline-offset-4 decoration-black/50 hover:decoration-black/80"
                      onClick={() => !disabled && onClose()}
                    >
                      Go to Sign up with Google →
                    </Link>
                  </div>
                )}
              </div>

              <div className="p-5 sm:p-6 border-t border-black/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={disabled}
                  className="px-5 py-2 text-[13px] font-extrabold rounded-[12px] border-2 border-black bg-white hover:bg-black/5
                            focus:outline-none focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-60"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        );

        return createPortal(content, document.body);
      }


/* ======================
  HELPERS
====================== */

function redirectByRole(navigate, role) {
  if (role === "Admin") return navigate("/admin");
  if (role === "Consultant") return navigate("/consultant");
  return navigate("/");
}

function isBlank(v) {
  return !v || v.trim().length === 0;
}

function isEmailLike(v) {
  const s = (v || "").trim();
  // lightweight email-ish check (we only need to know if user typed an email)
  return s.includes("@");
}

// Allowed username chars: letters, numbers, dot, underscore
const USERNAME_RE = /^[A-Za-z0-9._'-]+(?:\s+[A-Za-z0-9._'-]+)*$/;



/* ======================
  LOGIN
====================== */

export default function Login() {
  const navigate = useNavigate();
  const USERNAME_RE = /^[A-Za-z0-9._]+$/;

  const isEmailLike = (v) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  };

  const [rememberMe, setRememberMe] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [noticeMsg, setNoticeMsg] = useState("");

  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");

  const [emailErr, setEmailErr] = useState("");
  const [passErr, setPassErr] = useState("");

  const [showPass, setShowPass] = useState(false);

  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [termsLoading, setTermsLoading] = useState(false);

  const pendingActionRef = useRef(null);

  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const [emailTouched, setEmailTouched] = useState(false);
  const [passTouched, setPassTouched] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const [showGoogleSignupHint, setShowGoogleSignupHint] = useState(false);


  const emailWrapRef = useRef(null);
  const passWrapRef = useRef(null);

  const location = useLocation();

  const clearNotice = () => {
    setNoticeOpen(false);
    setNoticeMsg("");
    setShowGoogleSignupHint(false);
  };

  const showNotice = (msg, opts = {}) => {
    setNoticeMsg(msg || "");
    setShowGoogleSignupHint(!!opts.showSignupHint);
    setNoticeOpen(true);
  };


  useEffect(() => {
    const saved = localStorage.getItem("termsAccepted") === "true";
    setTermsAccepted(saved);
    setTermsChecked(false);

    const token = getToken();
    const user = getUser();
    if (token && user?.role) redirectByRole(navigate, user.role);
  }, [navigate]);

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

  const focusFirstInvalid = (first) => {
    const ref = first === "email" ? emailWrapRef : passWrapRef;
    const el = ref.current?.querySelector("input, textarea, select");
    el?.focus?.();
  };

  const onEmailChange = (e) => {
    const v = e.target.value;
    setEmailOrUsername(v);
    if (!isBlank(v)) setEmailErr("");
    if (noticeOpen || showGoogleSignupHint) clearNotice();
  };


  const onPassChange = (e) => {
    const v = e.target.value;
    setPassword(v);
    if (!isBlank(v)) setPassErr("");
    if (noticeOpen || showGoogleSignupHint) clearNotice();
  };


  const inputGlow = ({ focused, invalid }) => {
    if (!focused && !invalid) return "";
    if (invalid) return "ring-2 ring-red-400 shadow-[0_0_0_4px_rgba(248,113,113,0.18)] border-transparent";
    return "ring-2 ring-[#B9FF66] shadow-[0_0_0_4px_rgba(185,255,102,0.22)] border-transparent";
  };

  const emailInvalid = (emailTouched || attemptedSubmit) && (isBlank(emailOrUsername) || !!emailErr);
  const passInvalid = (passTouched || attemptedSubmit) && (isBlank(password) || !!passErr);


  const validate = () => {
    setAttemptedSubmit(true);
    setEmailTouched(true);
    setPassTouched(true);

    const raw = (emailOrUsername || "").trim();
    const eBlank = isBlank(raw);
    const pBlank = isBlank(password);

    let nextEmailErr = eBlank ? "This field can’t be blank" : "";
    let nextPassErr = pBlank ? "This field can’t be blank" : "";

    // ✅ Username: no special characters (only if NOT email)
    if (!eBlank && !isEmailLike(raw)) {
      if (!USERNAME_RE.test(raw)) {
        nextEmailErr =
          "Username can only contain letters, numbers, dot (.) and underscore (_)";
      }
    }

    setEmailErr(nextEmailErr);
    setPassErr(nextPassErr);

    if (nextEmailErr) return { ok: false, first: "email" };
    if (nextPassErr) return { ok: false, first: "pass" };
    return { ok: true, first: null };
  };


  

  const handleEmailLogin = async () => {
    if (submitting) return;

    const v = validate();
    if (!v.ok) {
      focusFirstInvalid(v.first);
      return;
    }

    await requireTermsThen(async () => {
      if (submitting) return;

      setSubmitting(true);
      clearNotice();
      
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailOrUsername: emailOrUsername.trim(),
            password,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Login failed");

        // ✅ Remember me handling (local vs session)
        setAuth(data.token, data.user, rememberMe);
        window.dispatchEvent(new Event("auth:changed"));

        redirectByRole(navigate, data.user.role);
      } catch (err) {
        const msg = err?.message || "Login failed";

        setAttemptedSubmit(true);
        setEmailTouched(true);
        setPassTouched(true);

        if (/invalid|incorrect|wrong|credential|401/i.test(msg)) {
          const common = "Invalid username or password";
          showNotice(common);
          setEmailErr(common);
          setPassErr(common);
        } else {
          showNotice(msg);
        }
      } finally {
        setSubmitting(false);
      }
    });
  };


  const handleGoogleLogin = async () => {
    if (submitting) return;

    await requireTermsThen(async () => {
      if (submitting) return;

      setSubmitting(true);
      clearNotice();
      setShowGoogleSignupHint(false);

      try {
        const firebaseUser = await signInWithGoogle();

        const payload = {
          googleId: firebaseUser?.uid,
          email: firebaseUser?.email,
          fullName: firebaseUser?.displayName || "Google User",
        };

        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));

        // ✅ If backend indicates user isn't registered yet
        if (!res.ok) {
          const msg = (data?.message || "").toLowerCase();

          const looksLikeNotRegistered =
            res.status === 404 ||
            res.status === 400 ||
            msg.includes("not found") ||
            msg.includes("no account") ||
            msg.includes("not registered") ||
            msg.includes("signup") ||
            msg.includes("sign up");

          if (looksLikeNotRegistered) {
            showNotice(
              "Looks like this is your first time here. Please sign up with Google to complete your account setup.",
              { showSignupHint: true }
            );
            return;
          }

          throw new Error(data.message || "Google login failed");
        }

        setAuth(data.token, data.user, rememberMe);
        window.dispatchEvent(new Event("auth:changed"));
        
        redirectByRole(navigate, data.user.role);
      } catch (err) {
        showNotice(err?.message || "Google login failed");
      } finally {
        setSubmitting(false);
      }
    });
  };


  const uiPatchStyles = `
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
        ["--nav-h"]: "20px",
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
      <NoticeModal
        open={noticeOpen}
        message={noticeMsg}
        showSignupHint={showGoogleSignupHint}
        onClose={clearNotice}
        disabled={submitting}
      />
      
      {/* BACKGROUND DOME */}
      <div className="absolute inset-0 z-0">
        <DomeGallery fit={1} autoRotate autoRotateDegPerSec={5} autoRotateIdleDelayMs={1000} disableInteractionMaxWidth={1024} />
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

      {/* ✅ LEFT CLICK BLOCKER (desktop only) */}
      <div className="hidden xl:block absolute inset-y-0 left-0 z-20 w-1/2" style={{ pointerEvents: "auto" }} aria-hidden="true" />

      {/* ✅ FOREGROUND CONTENT (Signup-style: pointer-events-none wrapper) */}
      <div className="relative z-30 mx-auto w-full max-w-[1400px] pointer-events-none px-[clamp(16px,3.4vw,90px)]">
        <div className="min-h-[calc(100vh-var(--nav-h))] py-[clamp(18px,4vh,64px)] flex items-center">
          <div className="w-full grid grid-cols-1 xl:grid-cols-2 items-center gap-[clamp(18px,3.2vw,64px)]">
            {/* LEFT: FORM */}
            <section
              data-auth-panel="true"
              className="w-full mx-auto xl:mx-0 xl:justify-self-start"
              style={{ maxWidth: "560px", pointerEvents: "auto" }}
            >
              <div className="relative rounded-[22px] bg-white/35 border border-black/10 shadow-[0_18px_60px_rgba(0,0,0,0.12)] px-5 sm:px-6 py-6 sm:py-7">
                <h1 className="text-[28px] sm:text-[36px] font-black tracking-[.22em] sm:tracking-[.26em] leading-tight text-black drop-shadow-sm">
                  WELCOME
                </h1>
                <p className="text-[13px] sm:text-[15px] text-black/80 mt-2">Welcome. Please enter your details.</p>

                <div className="mt-5 flex flex-col gap-4">
                  <div ref={emailWrapRef}>
                    <TextInput
                      label="Email or Username"
                      type="text"
                      placeholder="Enter your email or username"
                      value={emailOrUsername}
                      onChange={onEmailChange}
                      disabled={submitting}
                      autoComplete="username"
                      spellCheck={false}
                      autoCorrect="off"
                      autoCapitalize="none"
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => {
                        setEmailFocused(false);
                        setEmailTouched(true);
                        if (isBlank(emailOrUsername)) setEmailErr("This field can’t be blank");
                      }}
                      inputClassName={inputGlow({ focused: emailFocused, invalid: emailInvalid })}
                    />
                    <div className="min-h-[18px] mt-1">
                      <p className={`text-[12px] font-bold text-red-700 transition-opacity duration-150 ${emailErr ? "opacity-100" : "opacity-0"}`}>
                        {emailErr || "—"}
                      </p>
                    </div>
                  </div>

                  <div ref={passWrapRef}>
                    <div className="relative">
                      <TextInput
                        label="Password"
                        type={showPass ? "text" : "password"}
                        placeholder="********"
                        value={password}
                        onChange={onPassChange}
                        disabled={submitting}
                        autoComplete="current-password"
                        spellCheck={false}
                        autoCorrect="off"
                        autoCapitalize="none"
                        onFocus={() => setPassFocused(true)}
                        onBlur={() => {
                          setPassFocused(false);
                          setPassTouched(true);
                          if (isBlank(password)) setPassErr("This field can’t be blank");
                        }}
                        inputClassName={inputGlow({ focused: passFocused, invalid: passInvalid })}
                      />

                      <button
                        type="button"
                        onClick={() => setShowPass((s) => !s)}
                        className="absolute right-3 top-[38px] sm:top-[40px] text-black/70 hover:text-black rounded-[10px] p-2
                                  focus:outline-none focus-visible:ring-2 focus-visible:ring-black/25 disabled:opacity-50"
                        aria-label={showPass ? "Hide password" : "Show password"}
                        disabled={submitting}
                      >
                        {showPass ? <EyeClosedIcon /> : <EyeOpenIcon />}
                      </button>
                    </div>

                    <div className="min-h-[18px] mt-1">
                      <p className={`text-[12px] font-bold text-red-700 transition-opacity duration-150 ${passErr ? "opacity-100" : "opacity-0"}`}>
                        {passErr || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[13px]">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="accent-greenBorder"
                        disabled={submitting}
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      Remember me
                    </label>

                    <button
                      type="button"
                      className="font-bold hover:underline bg-transparent p-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/25 rounded disabled:opacity-60"
                      onClick={() => navigate("/forgotpassword")}
                      disabled={submitting}
                    >
                      Forgot password
                    </button>
                  </div>

                  <PrimaryButton
                    disabled={submitting}
                    onClick={handleEmailLogin}
                    className={`w-full relative flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-black/25 ${
                      submitting ? "opacity-90 cursor-not-allowed" : "hover:brightness-[0.98] active:scale-[0.99]"
                    }`}
                  >
                    <span className="relative w-full flex items-center justify-center">
                      <span className={`inline-flex items-center justify-center transition-opacity duration-150 ${submitting ? "opacity-0" : "opacity-100"}`}>Login</span>
                      <span
                        className={`absolute inset-0 inline-flex items-center justify-center gap-2 transition-opacity duration-150 ${submitting ? "opacity-100" : "opacity-0"}`}
                        aria-hidden={!submitting}
                      >
                        <span className="inline-flex items-center justify-center w-5 h-5">
                          <Spinner size={16} />
                        </span>
                        <span className="leading-none">Logging in…</span>
                      </span>
                    </span>
                  </PrimaryButton>

                  <div className="google-btn-wrap">
                    <GoogleButton
                      label="Login with Google"
                      onClick={(e) => {
                        e?.preventDefault?.();
                        e?.stopPropagation?.();
                        handleGoogleLogin();
                      }}
                      loading={submitting}
                      disabled={submitting}
                      className="w-full"
                    />
                  </div>

                  <p className="text-[12px] text-black/60 leading-relaxed">
                    By continuing, you agree to CheckIn’s{" "}
                    <button
                      type="button"
                      onClick={() => setShowTerms(true)}
                      className="font-extrabold underline focus:outline-none focus-visible:ring-2 focus-visible:ring-black/25 rounded"
                      disabled={submitting}
                    >
                      Terms & Conditions
                    </button>
                    .
                  </p>

                  <p className="text-[13px] text-black/80">
                    Don&apos;t have an account?{" "}
                    <Link to="/sign-up" className="font-extrabold underline underline-offset-4 decoration-black/50 hover:decoration-black/80 whitespace-nowrap">
                      Sign up for free!
                    </Link>
                  </p>
                </div>
              </div>
            </section>

            {/* RIGHT spacer (keeps dome area on desktop) */}
            <section className="hidden xl:block pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
