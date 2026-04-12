"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface WalkthroughStep {
  /** CSS selector for the target element (e.g. "#kpi-cards", ".campaign-table") */
  target: string;
  title: string;
  description: string;
  /** Where the tooltip appears relative to the target */
  position: "top" | "bottom" | "left" | "right";
}

export interface PageWalkthroughProps {
  steps: WalkthroughStep[];
  /** localStorage key used to remember completion */
  storageKey: string;
  onComplete?: () => void;
}

export interface StartWalkthroughButtonProps {
  storageKey: string;
  onClick?: () => void;
}

/* ------------------------------------------------------------------ */
/*  Geometry helpers                                                    */
/* ------------------------------------------------------------------ */

const PADDING = 8; // px around the target for the spotlight cutout
const TOOLTIP_GAP = 16; // px between spotlight edge and tooltip
const TOOLTIP_MAX_W = 340;

/**
 * Compute the absolute‑positioned tooltip origin so it stays inside the
 * viewport.  Returns { top, left } in **viewport** coordinates (used via
 * `position:fixed`).
 */
function tooltipPosition(
  targetVp: DOMRect,
  position: WalkthroughStep["position"],
  tooltipW: number,
  tooltipH: number,
): { top: number; left: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top = 0;
  let left = 0;

  switch (position) {
    case "bottom":
      top = targetVp.bottom + PADDING + TOOLTIP_GAP;
      left = targetVp.left + targetVp.width / 2 - tooltipW / 2;
      break;
    case "top":
      top = targetVp.top - PADDING - TOOLTIP_GAP - tooltipH;
      left = targetVp.left + targetVp.width / 2 - tooltipW / 2;
      break;
    case "right":
      top = targetVp.top + targetVp.height / 2 - tooltipH / 2;
      left = targetVp.right + PADDING + TOOLTIP_GAP;
      break;
    case "left":
      top = targetVp.top + targetVp.height / 2 - tooltipH / 2;
      left = targetVp.left - PADDING - TOOLTIP_GAP - tooltipW;
      break;
  }

  // Clamp inside viewport
  if (left < 12) left = 12;
  if (left + tooltipW > vw - 12) left = vw - 12 - tooltipW;
  if (top < 12) top = 12;
  if (top + tooltipH > vh - 12) top = vh - 12 - tooltipH;

  return { top, left };
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function PageWalkthrough({
  steps,
  storageKey,
  onComplete,
}: PageWalkthroughProps) {
  const [active, setActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Viewport rect of the current target (null if not found)
  const [spotRect, setSpotRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipSize, setTooltipSize] = useState({ w: TOOLTIP_MAX_W, h: 180 });

  /* ---------- valid steps (target exists in DOM) ---------- */
  const validSteps = useRef<WalkthroughStep[]>([]);

  const resolveValidSteps = useCallback(() => {
    if (typeof window === "undefined") return;
    validSteps.current = steps.filter((s) => document.querySelector(s.target));
  }, [steps]);

  /* ---------- localStorage gate ---------- */
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(storageKey) === "true") return;
    // Small delay so page elements have time to render
    const t = setTimeout(() => {
      resolveValidSteps();
      if (validSteps.current.length > 0) {
        setActive(true);
        setCurrentIndex(0);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [storageKey, resolveValidSteps]);

  /* ---------- measure target + reposition on resize ---------- */
  const measure = useCallback(() => {
    if (!active) return;
    const step = validSteps.current[currentIndex];
    if (!step) return;
    const el = document.querySelector(step.target);
    if (!el) {
      setSpotRect(null);
      return;
    }
    setSpotRect(el.getBoundingClientRect());
  }, [active, currentIndex]);

  // Scroll target into view + measure
  useEffect(() => {
    if (!active) return;
    const step = validSteps.current[currentIndex];
    if (!step) return;
    const el = document.querySelector(step.target);
    if (!el) {
      setSpotRect(null);
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    // Wait for scroll to settle
    const t = setTimeout(measure, 400);
    return () => clearTimeout(t);
  }, [active, currentIndex, measure]);

  // Resize listener
  useEffect(() => {
    if (!active) return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, measure]);

  // Measure tooltip after render
  useEffect(() => {
    if (tooltipRef.current) {
      const r = tooltipRef.current.getBoundingClientRect();
      setTooltipSize({ w: r.width, h: r.height });
    }
  });

  /* ---------- lock body scroll ---------- */
  useEffect(() => {
    if (!active) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [active]);

  /* ---------- keyboard ---------- */
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goBack();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, currentIndex]);

  /* ---------- actions ---------- */
  const finish = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, "true");
    }
    setActive(false);
    onComplete?.();
  }, [storageKey, onComplete]);

  const goNext = useCallback(() => {
    if (currentIndex < validSteps.current.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      finish();
    }
  }, [currentIndex, finish]);

  const goBack = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  }, [currentIndex]);

  /* ---------- render nothing ---------- */
  if (!active || validSteps.current.length === 0) return null;

  const step = validSteps.current[currentIndex];
  const totalSteps = validSteps.current.length;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalSteps - 1;

  // Spotlight cutout rect (viewport coords)
  const cutout = spotRect
    ? {
        x: spotRect.left - PADDING,
        y: spotRect.top - PADDING,
        w: spotRect.width + PADDING * 2,
        h: spotRect.height + PADDING * 2,
        rx: 12,
      }
    : null;

  // Tooltip position (fixed)
  const tp =
    spotRect && step
      ? tooltipPosition(spotRect, step.position, tooltipSize.w, tooltipSize.h)
      : { top: window.innerHeight / 2 - 90, left: window.innerWidth / 2 - TOOLTIP_MAX_W / 2 };

  return (
    <>
      {/* --- inline keyframes --- */}
      <style>{`
        @keyframes wt-pulse {
          0%   { opacity: 0.7; transform: scale(1); }
          50%  { opacity: 0;   transform: scale(1.18); }
          100% { opacity: 0;   transform: scale(1.18); }
        }
        @keyframes wt-fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* --- overlay with SVG cutout --- */}
      <div className="fixed inset-0 z-[9998]" aria-hidden="true">
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <defs>
            <mask id="wt-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {cutout && (
                <rect
                  x={cutout.x}
                  y={cutout.y}
                  width={cutout.w}
                  height={cutout.h}
                  rx={cutout.rx}
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.55)"
            mask="url(#wt-mask)"
          />
        </svg>

        {/* --- pulsing ring --- */}
        {cutout && (
          <div
            className="absolute border-2 border-amber-400 rounded-xl pointer-events-none"
            style={{
              top: cutout.y,
              left: cutout.x,
              width: cutout.w,
              height: cutout.h,
              animation: "wt-pulse 2s ease-out infinite",
            }}
          />
        )}

        {/* Click-catcher to allow clicking the overlay (acts as skip/dismiss) */}
        <div
          className="absolute inset-0 cursor-default"
          onClick={finish}
        />
      </div>

      {/* --- tooltip card --- */}
      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Walkthrough step ${currentIndex + 1} of ${totalSteps}`}
        className="fixed z-[9999] bg-white rounded-xl shadow-xl border border-slate-200/80"
        style={{
          top: tp.top,
          left: tp.left,
          width: TOOLTIP_MAX_W,
          maxWidth: "calc(100vw - 24px)",
          animation: "wt-fadeIn 0.25s ease-out",
        }}
      >
        {/* Progress dots */}
        <div className="flex items-center gap-1.5 px-5 pt-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= currentIndex ? "bg-amber-500 w-5" : "bg-slate-200 w-3"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-5 pt-3 pb-4">
          <p className="text-[0.68rem] font-semibold text-amber-600 uppercase tracking-wide mb-1">
            Step {currentIndex + 1} of {totalSteps}
          </p>
          <h3 className="text-base font-extrabold text-slate-800 mb-1">
            {step.title}
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-5 pb-4">
          <button
            onClick={finish}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={goBack}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors rounded-lg hover:bg-slate-100"
              >
                Back
              </button>
            )}
            <button
              onClick={goNext}
              className="px-4 py-2 text-xs font-bold text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors"
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  StartWalkthroughButton                                             */
/* ------------------------------------------------------------------ */

export function StartWalkthroughButton({
  storageKey,
  onClick,
}: StartWalkthroughButtonProps) {
  const handleClick = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(storageKey);
    }
    onClick?.();
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 border border-amber-300 hover:border-amber-400 bg-transparent hover:bg-amber-50 rounded-lg transition-colors"
    >
      <span aria-hidden="true">📖</span>
      Page Tour
    </button>
  );
}
