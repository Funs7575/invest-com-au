"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/tracking";
import Icon from "@/components/Icon";
import { getStoredUtm } from "@/components/UtmCapture";

const DISMISS_KEY = "pillarExitDismissed";
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MIN_ENGAGEMENT_MS = 12_000;
const MOBILE_SCROLL_UP_THRESHOLD = -80; // px/frame — fast scroll up

interface VerticalCta {
  headline: string;
  subtext: string;
  href?: string;
  leadCapture?: boolean;
  ctaLabel: string;
  icon: string;
}

const VERTICAL_CTAS: Record<string, VerticalCta> = {
  "share-trading": {
    headline: "Before you go",
    subtext: "Take our 60-second quiz to find your perfect broker",
    href: "/quiz",
    ctaLabel: "Start Free Quiz",
    icon: "target",
  },
  crypto: {
    headline: "Free crypto exchange comparison checklist",
    subtext: "Side-by-side fees, security, and coin coverage for every Australian exchange",
    leadCapture: true,
    ctaLabel: "Get Free Checklist",
    icon: "bitcoin",
  },
  savings: {
    headline: "See how much more interest you could earn",
    subtext: "Our savings calculator shows the real difference between accounts",
    href: "/savings-calculator",
    ctaLabel: "Open Calculator",
    icon: "calculator",
  },
  super: {
    headline: "Is your super fund costing you?",
    subtext: "Small fee differences compound into tens of thousands over your working life",
    href: "/fee-impact",
    ctaLabel: "Check Fee Impact",
    icon: "trending-up",
  },
  cfd: {
    headline: "Free CFD risk management guide",
    subtext: "Position sizing, stop-loss strategies, and margin rules for Australian traders",
    leadCapture: true,
    ctaLabel: "Get Free Guide",
    icon: "shield",
  },
};

export default function PillarExitIntent({ slug }: { slug: string }) {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const pageLoadTime = useRef(Date.now());
  const lastScrollY = useRef(0);
  const lastScrollTime = useRef(0);

  const cta = VERTICAL_CTAS[slug] ?? null;

  const isDismissedRecently = useCallback(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return false;
      const ts = parseInt(raw, 10);
      return Date.now() - ts < DISMISS_DURATION_MS;
    } catch {
      return false;
    }
  }, []);

  const isEngagedEnough = useCallback(() => {
    return Date.now() - pageLoadTime.current >= MIN_ENGAGEMENT_MS;
  }, []);

  const showPopup = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!cta) return;
    if (sessionStorage.getItem("pillarExitShown") === "true") return;
    if (isDismissedRecently()) return;
    if (!isEngagedEnough()) return;

    setVisible(true);
    sessionStorage.setItem("pillarExitShown", "true");
    trackEvent("pillar_exit_intent_shown", { vertical: slug });
  }, [cta, isDismissedRecently, isEngagedEnough, slug]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("pillarExitShown") === "true") return;
    if (isDismissedRecently()) return;

    // Desktop: mouse leaving viewport at top
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) showPopup();
    };

    // Mobile: detect rapid scroll-up (user pulling to go back)
    const handleScroll = () => {
      const now = Date.now();
      const dt = now - lastScrollTime.current;
      if (dt > 0 && dt < 200) {
        const dy = window.scrollY - lastScrollY.current;
        const velocity = dy / dt * 100; // px per 100ms
        if (velocity < MOBILE_SCROLL_UP_THRESHOLD && window.innerWidth < 768) {
          showPopup();
        }
      }
      lastScrollY.current = window.scrollY;
      lastScrollTime.current = now;
    };

    // Delay before attaching listeners
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
      window.addEventListener("scroll", handleScroll, { passive: true });
    }, MIN_ENGAGEMENT_MS);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [showPopup, isDismissedRecently]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch { /* quota */ }
    trackEvent("pillar_exit_intent_dismissed", { vertical: slug });
  }, [slug]);

  // Escape key
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [visible, handleDismiss]);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setStatus("loading");
    try {
      const utm = getStoredUtm();
      const res = await fetch("/api/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: `pillar-exit-${slug}`, ...utm }),
      });
      if (res.ok) {
        setStatus("success");
        trackEvent("pillar_exit_lead_captured", { vertical: slug });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (!visible || !cta) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        role="presentation"
        onClick={handleDismiss}
      />

      {/* Modal: bottom sheet on mobile, centered on desktop */}
      <div
        className="relative bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 md:slide-in-from-bottom-0 md:fade-in md:zoom-in-95 duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pillar-exit-title"
      >
        {/* Drag handle (mobile) */}
        <div className="md:hidden flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="px-5 pt-4 pb-6 md:px-6 md:pt-6 md:pb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <Icon name={cta.icon} size={20} className="text-slate-600" />
            </div>
            <h2 id="pillar-exit-title" className="text-lg font-extrabold text-slate-900">
              {cta.headline}
            </h2>
          </div>

          <p className="text-sm text-slate-600 mb-4">{cta.subtext}</p>

          {cta.leadCapture ? (
            status === "success" ? (
              <div className="text-center py-3">
                <Icon name="check-circle" size={28} className="text-emerald-600 mx-auto mb-2" />
                <p className="font-bold text-sm">Check your inbox!</p>
                <p className="text-xs text-slate-500 mt-1">We&apos;ve sent your free resource.</p>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="space-y-2.5">
                <input
                  type="email"
                  placeholder="you@email.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-label="Email address"
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-700/30 focus:border-slate-700"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full px-4 py-3 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60"
                >
                  {status === "loading" ? "Sending..." : cta.ctaLabel}
                </button>
                {status === "error" && (
                  <p className="text-xs text-red-500 text-center">Something went wrong. Please try again.</p>
                )}
                <p className="text-[0.65rem] text-slate-400 text-center">Free. No spam. Unsubscribe anytime.</p>
              </form>
            )
          ) : (
            <Link
              href={cta.href!}
              onClick={() => trackEvent("pillar_exit_cta_clicked", { vertical: slug, href: cta.href })}
              className="block w-full text-center px-4 py-3 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
            >
              {cta.ctaLabel} &rarr;
            </Link>
          )}

          <button
            onClick={handleDismiss}
            className="w-full mt-3 py-2 min-h-[44px] text-xs text-slate-400 hover:text-slate-600 text-center transition-colors"
          >
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
