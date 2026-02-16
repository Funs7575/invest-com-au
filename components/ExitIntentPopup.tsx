"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/tracking";

export default function ExitIntentPopup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const showPopup = useCallback(() => {
    // Don't show if already shown this session, or if dismissed permanently
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("exitIntentShown") === "true") return;
    if (localStorage.getItem("exitIntentDismissed") === "true") return;
    // Don't show on admin pages or quiz (mid-flow)
    if (window.location.pathname.startsWith("/admin")) return;
    if (window.location.pathname === "/quiz") return;

    setVisible(true);
    sessionStorage.setItem("exitIntentShown", "true");
  }, []);

  useEffect(() => {
    // Exit intent: mouse leaves viewport at top
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        showPopup();
      }
    };

    // Mobile fallback: show after 45 seconds of inactivity or back button
    let inactivityTimer: ReturnType<typeof setTimeout>;
    const resetInactivity = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        // Only on mobile
        if (window.innerWidth < 768) {
          showPopup();
        }
      }, 45000);
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("touchstart", resetInactivity, { passive: true });
    document.addEventListener("scroll", resetInactivity, { passive: true });
    resetInactivity();

    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("touchstart", resetInactivity);
      document.removeEventListener("scroll", resetInactivity);
      clearTimeout(inactivityTimer);
    };
  }, [showPopup]);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem("exitIntentDismissed", "true");
  }, []);

  // Escape key to close modal
  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
    };
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
        setStatus("success");
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
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 px-6 pt-6 pb-8 text-white text-center">
          <div className="text-4xl mb-3">📊</div>
          <h2 id="exit-popup-title" className="text-xl font-extrabold mb-1">Wait — Before You Go</h2>
          <p className="text-sm text-amber-300">
            Get our free 2026 broker fee comparison PDF. See exactly what every platform charges.
          </p>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 -mt-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            {status === "success" ? (
              <div className="text-center py-4">
                <div className="text-3xl mb-2">✅</div>
                <h3 className="font-bold text-lg mb-1">Check Your Inbox!</h3>
                <p className="text-sm text-slate-600 mb-4">
                  We&apos;ve sent the fee comparison PDF to your email.
                </p>
                <Link
                  href="/quiz"
                  className="inline-block px-5 py-2.5 bg-amber-500 text-slate-900 text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors"
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    required
                    className="mt-0.5 w-4 h-4 rounded accent-amber-500 shrink-0"
                  />
                  <span className="text-[0.65rem] text-slate-500 leading-tight">
                    I agree to receive the PDF and occasional broker updates.{" "}
                    <Link href="/privacy" className="underline hover:text-amber-600">
                      Privacy Policy
                    </Link>
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={status === "loading" || !consent}
                  className="w-full px-4 py-3 bg-amber-500 text-slate-900 text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-60"
                >
                  {status === "loading" ? "Sending..." : "Get Free Fee Comparison PDF →"}
                </button>
                {status === "error" && (
                  <p className="text-xs text-red-500 text-center">
                    Something went wrong. Please try again.
                  </p>
                )}
              </form>
            )}
          </div>

          {/* Alternative CTA */}
          <div className="text-center mt-3">
            <Link
              href="/quiz"
              className="text-sm text-slate-500 hover:text-amber-600 transition-colors"
            >
              Or take our free 60-second broker quiz →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
