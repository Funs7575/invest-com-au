"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface FloatingRightCTAProps {
  href: string;
  label: string;
  storageKey: string;
  showAfterPx?: number;
  variant?: "coral" | "ink";
  trackingContext?: string;
  mobileOnly?: boolean;
}

export default function FloatingRightCTA({
  href,
  label,
  storageKey,
  showAfterPx = 600,
  variant = "coral",
  trackingContext,
  mobileOnly = false,
}: FloatingRightCTAProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(`floatingCta:${storageKey}:dismissed`) === "true";
    } catch {
      return false;
    }
  });
  const [near, setNear] = useState(true);

  useEffect(() => {
    if (dismissed) return;
    const onScroll = () => {
      const y = window.scrollY;
      setVisible(y > showAfterPx);

      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setNear(docHeight - y < 220);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [dismissed, showAfterPx]);

  if (dismissed) return null;

  const bg =
    variant === "ink"
      ? "bg-slate-900 hover:bg-slate-800 active:bg-slate-950"
      : "bg-amber-600 hover:bg-amber-700 active:bg-amber-800";

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(`floatingCta:${storageKey}:dismissed`, "true");
    } catch {
    }
  };

  return (
    <div
      aria-hidden={!visible}
      className={`fixed z-40 right-3 sm:right-5 transition-all duration-300 ease-out ${
        mobileOnly ? "lg:hidden" : ""
      } ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 pointer-events-none translate-y-4"
      } ${near ? "bottom-[calc(env(safe-area-inset-bottom,0)+5.5rem)]" : "bottom-[calc(env(safe-area-inset-bottom,0)+1rem)]"}`}
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
    >
      <div className="flex items-center gap-1.5">
        <Link
          href={href}
          onClick={() => {
            if (trackingContext && typeof window !== "undefined" && "gtag" in window) {
              try {
                (window as unknown as { gtag: (...args: unknown[]) => void }).gtag(
                  "event",
                  "floating_cta_click",
                  { context: trackingContext, label, href },
                );
              } catch {
              }
            }
          }}
          className={`group flex items-center gap-2 ${bg} text-white text-sm font-bold rounded-full pl-5 pr-4 py-3 shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/25 transition-all active:scale-[0.97]`}
        >
          <span>{label}</span>
          <svg
            className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.6}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m0 0-5-5m5 5-5 5" />
          </svg>
        </Link>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="w-8 h-8 rounded-full bg-white/95 hover:bg-white border border-slate-200 shadow text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
