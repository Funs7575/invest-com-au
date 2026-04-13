"use client";

import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/Icon";
import { getStoredUtm } from "@/components/UtmCapture";

/**
 * Exit-intent popup for email capture.
 * Triggers on: mouse leaving viewport (desktop) or 60% scroll depth (mobile).
 * Only shows once per session. Suppressed if user already submitted email elsewhere.
 */
export default function ExitIntentCapture() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const trigger = useCallback(() => {
    if (typeof window === "undefined") return;
    // Don't show if already dismissed, submitted, or previously captured
    if (sessionStorage.getItem("exit_popup_shown")) return;
    if (sessionStorage.getItem("email_captured")) return;
    // Don't show on admin/advisor pages
    if (window.location.pathname.startsWith("/admin") || window.location.pathname.startsWith("/advisor")) return;
    setShow(true);
    sessionStorage.setItem("exit_popup_shown", "1");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("exit_popup_shown") || sessionStorage.getItem("email_captured")) return;

    // Desktop: mouse leaving viewport
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) trigger();
    };

    // Mobile: 60% scroll depth
    const handleScroll = () => {
      const scrollPct = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
      if (scrollPct > 0.6) trigger();
    };

    // Delay before attaching listeners (don't annoy users who just arrived)
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
      window.addEventListener("scroll", handleScroll, { passive: true });
    }, 15000); // 15 seconds

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [trigger]);

  const handleSubmit = async () => {
    // Guard against double-submit while the in-flight request is running
    if (submitting) return;

    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setEmailError(null);
    setSubmitting(true);
    const utm = getStoredUtm();
    try {
      const res = await fetch("/api/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, source: "exit-intent", ...utm }),
      });
      if (!res.ok) {
        // Surface server-side validation / rate-limit errors instead of
        // silently pretending success, which burned users when the old
        // swallow-all catch hid duplicate-email errors.
        setEmailError("Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
      sessionStorage.setItem("email_captured", "1");
    } catch {
      setEmailError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const dismiss = () => {
    setDismissed(true);
    setShow(false);
  };

  // Close on Escape key
  useEffect(() => {
    if (!show) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [show, dismiss]);

  if (!show || dismissed) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={dismiss}>
      <div role="dialog" aria-modal="true" aria-label="Fee comparison signup" className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Icon name="check-circle" size={28} className="text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">You're in!</h2>
            <p className="text-sm text-slate-500">We'll send you the fee comparison and keep you posted when rates change.</p>
            <button onClick={dismiss} className="mt-4 px-4 py-2 text-sm text-slate-600 hover:text-slate-900">No thanks, take me back</button>
          </div>
        ) : (
          <>
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-center">
              <h2 className="text-lg font-bold text-white mb-1">Before you go...</h2>
              <p className="text-sm text-slate-300">Get a free side-by-side fee comparison of every Australian broker — delivered to your inbox.</p>
            </div>
            <div className="p-5">
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (emailError) setEmailError(null); }}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  placeholder="your@email.com"
                  aria-label="Email address"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? "exit-intent-error" : undefined}
                  disabled={submitting}
                  className={`flex-1 px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 disabled:opacity-60 ${emailError ? "border-red-400" : "border-slate-200"}`}
                  autoFocus
                />
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-all shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? "Sending..." : "Send It"}
                </button>
              </div>
              {emailError && (
                <p id="exit-intent-error" role="alert" className="text-xs text-red-600 mt-2">
                  {emailError}
                </p>
              )}
              <p className="text-[0.56rem] text-slate-400 mt-2 text-center">Free. No spam. Unsubscribe anytime.</p>
              <button onClick={dismiss} className="w-full mt-3 text-xs text-slate-400 hover:text-slate-600 text-center">No thanks, I'll pay more in fees</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
