"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/tracking";
import Icon from "@/components/Icon";
import { useSubscription } from "@/lib/hooks/useSubscription";

const MIN_ENGAGEMENT_MS = 15_000; // Must be on page 15s before popup can fire
const MOBILE_INACTIVITY_MS = 30_000; // 30s inactivity on mobile
const MOBILE_SCROLL_DEPTH = 0.35; // Must scroll 35%+ of page on mobile

export default function ExitIntentPopup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [emailSent, setEmailSent] = useState(false);
  const pageLoadTime = useRef(Date.now());
  const maxScrollDepth = useRef(0);
  const { isPro } = useSubscription();

  const isEngagedEnough = useCallback(() => {
    const timeOnPage = Date.now() - pageLoadTime.current;
    return timeOnPage >= MIN_ENGAGEMENT_MS;
  }, []);

  const showPopup = useCallback(() => {
    if (typeof window === "undefined") return;
    if (isPro) return; // Ad-free: skip popup for Pro users
    if (sessionStorage.getItem("exitIntentShown") === "true") return;
    if (localStorage.getItem("exitIntentDismissed") === "true") return;
    if (window.location.pathname.startsWith("/admin")) return;
    if (window.location.pathname === "/quiz") return;
    if (!isEngagedEnough()) return;

    setVisible(true);
    sessionStorage.setItem("exitIntentShown", "true");
  }, [isEngagedEnough, isPro]);

  useEffect(() => {
    // Track scroll depth for mobile trigger
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const depth = scrollTop / docHeight;
        if (depth > maxScrollDepth.current) {
          maxScrollDepth.current = depth;
        }
      }
    };

    // Desktop: exit intent when mouse leaves viewport at top
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        showPopup();
      }
    };

    // Mobile: show after inactivity, but only if user has scrolled enough
    let inactivityTimer: ReturnType<typeof setTimeout>;
    const resetInactivity = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        if (window.innerWidth < 768 && maxScrollDepth.current >= MOBILE_SCROLL_DEPTH) {
          showPopup();
        }
      }, MOBILE_INACTIVITY_MS);
    };

    // Mobile: also trigger on back-button / visibility change (user switching tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && window.innerWidth < 768) {
        // User is leaving — mark for next visit or show on return
        if (isEngagedEnough() && maxScrollDepth.current >= MOBILE_SCROLL_DEPTH) {
          showPopup();
        }
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("touchstart", resetInactivity, { passive: true });
    document.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("scroll", resetInactivity, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);
    resetInactivity();

    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("touchstart", resetInactivity);
      document.removeEventListener("scroll", handleScroll);
      document.removeEventListener("scroll", resetInactivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimeout(inactivityTimer);
    };
  }, [showPopup, isEngagedEnough]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem("exitIntentDismissed", "true");
  }, []);

  // Escape key to close modal + focus trap
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
      // Focus trap: cycle through focusable elements inside the modal
      if (e.key === "Tab") {
        const modal = document.querySelector('[role="dialog"]');
        if (!modal) return;
        const focusable = modal.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    // Auto-focus the close button when modal appears
    const closeBtn = document.querySelector<HTMLElement>('[role="dialog"] button[aria-label="Close"]');
    closeBtn?.focus();
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [visible, handleDismiss]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@") || !consent) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "exit-intent" }),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus("success");
        setEmailSent(!!data.emailSent);
        setEmail("");
        trackEvent('pdf_opt_in', { source: 'exit-intent' });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-popup-title"
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors text-slate-500"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Dark accent header */}
        <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 px-6 pt-6 pb-8 text-white text-center">
          <Icon name="bar-chart" size={36} className="text-slate-200 mx-auto mb-3" />
          <h2 id="exit-popup-title" className="text-xl font-extrabold mb-1">Wait — Before You Go</h2>
          <p className="text-sm text-slate-200">
            Get our free 2026 broker fee comparison PDF. See exactly what every platform charges.
          </p>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 -mt-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            {status === "success" ? (
              <div className="text-center py-4">
                <div className="mb-2">{emailSent ? <Icon name="check-circle" size={28} className="text-slate-600 mx-auto" /> : <Icon name="mail" size={28} className="text-slate-700 mx-auto" />}</div>
                <h3 className="font-bold text-lg mb-1">
                  {emailSent ? 'Check Your Inbox!' : 'You\'re Signed Up!'}
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  {emailSent
                    ? 'We\'ve sent the fee comparison to your email.'
                    : 'We\'ll send you the fee comparison shortly.'}
                </p>
                <Link
                  href="/quiz"
                  className="inline-block px-5 py-2.5 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors"
                >
                  Take the Broker Quiz →
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    Free PDF
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    No spam
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    Unsubscribe anytime
                  </span>
                </div>
                <input
                  type="email"
                  placeholder="you@email.com"
                  aria-label="Email address for fee audit"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700/40 focus:border-blue-700"
                />
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    required
                    className="mt-0.5 w-4 h-4 rounded accent-slate-700 shrink-0"
                  />
                  <span className="text-xs text-slate-500 leading-tight">
                    I agree to receive the PDF and occasional broker updates.{" "}
                    <Link href="/privacy" className="underline hover:text-slate-900">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={status === "loading" || !consent}
                  className="w-full px-4 py-3 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-60"
                >
                  {status === "loading" ? "Sending..." : "Get Free Fee Comparison PDF →"}
                </button>
                {status === "error" && (
                  <div className="text-center">
                    <p className="text-xs text-red-500 mb-1">
                      Something went wrong.
                    </p>
                    <button
                      type="button"
                      onClick={() => setStatus("idle")}
                      className="text-xs text-slate-600 underline hover:text-slate-900"
                    >
                      Try again
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Alternative CTA */}
          <div className="text-center mt-3">
            <Link
              href="/quiz"
              className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
            >
              Or take our free 60-second broker quiz →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
