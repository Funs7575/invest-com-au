"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/tracking";
import { isValidEmailClient as isValidEmail } from "@/lib/validate-email";

export default function LeadMagnet() {
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [emailSent, setEmailSent] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("is-visible"); observer.unobserve(el); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const emailError = emailTouched && email.length > 0 && !isValidEmail(email)
    ? "Please enter a valid email address"
    : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailTouched(true);
    if (!email || !isValidEmail(email) || !consent) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "lead-magnet-fee-audit" }),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus("success");
        setEmailSent(!!data.emailSent);
        setEmail("");
        trackEvent('pdf_opt_in', { source: 'lead-magnet' });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div ref={ref} className="rounded-xl p-3.5 md:p-6 bg-slate-50 border border-slate-200 shadow-sm lead-magnet-enter">
      <div className="text-[0.62rem] md:text-xs font-bold uppercase tracking-wider mb-1 md:mb-2 text-slate-700">
        Free Download
      </div>
      <h3 className="text-base md:text-xl font-extrabold mb-1 md:mb-2 text-slate-900">2026 Fee Audit PDF</h3>
      <p className="text-xs md:text-sm text-slate-600 mb-2.5 md:mb-4 leading-relaxed">
        <span className="hidden md:inline">See exactly what every Australian broker charges — brokerage, FX fees, inactivity fees, and hidden costs. Compare side-by-side in one document.</span>
        <span className="md:hidden">Every broker&apos;s fees compared side-by-side — brokerage, FX, inactivity &amp; hidden costs.</span>
      </p>

      {status === "success" ? (
        <div className="bg-slate-100 border border-slate-200 rounded-lg p-3 md:p-4 text-center">
          <div className="text-sm md:text-lg font-bold mb-0.5 md:mb-1 text-slate-900">
            {emailSent ? 'Check your inbox!' : 'You\'re signed up!'}
          </div>
          <p className="text-xs md:text-sm text-slate-600">
            {emailSent
              ? 'We\'ve sent the 2026 Fee Audit to your email.'
              : 'We\'ll send you the 2026 Fee Audit shortly.'}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-2.5 md:space-y-3">
          <div>
            <input
              type="email"
              placeholder="you@email.com"
              autoComplete="email"
              aria-label="Email address for fee audit PDF"
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "lead-email-error" : undefined}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              required
              className={`w-full px-3 md:px-4 py-2.5 rounded-lg border text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700/40 focus:border-blue-700 ${
                emailError ? 'border-red-400' : 'border-slate-200'
              }`}
            />
            <div aria-live="polite" aria-atomic="true" className="min-h-[1.25rem]">
              {emailError && (
                <p id="lead-email-error" className="text-xs text-red-500 mt-0.5">{emailError}</p>
              )}
            </div>
          </div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
              className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-slate-700 shrink-0"
            />
            <span className="text-[0.69rem] md:text-xs text-slate-500 leading-tight">
              I agree to receive the Fee Audit PDF and updates.{" "}
              <Link href="/privacy" className="underline hover:text-slate-900">
                Privacy Policy
              </Link>
              . Unsubscribe anytime.
            </span>
          </label>
          <button
            type="submit"
            disabled={status === "loading" || !consent || !!emailError}
            className="w-full px-4 py-2.5 md:py-3 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-60"
          >
            {status === "loading" ? "Sending..." : "Get the Free PDF"}
          </button>
          <p className="text-[0.56rem] md:text-[0.62rem] text-slate-400 text-center flex items-center justify-center gap-1">
            <svg className="w-2.5 h-2.5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            No spam, ever. One email with your PDF.
          </p>
          <div aria-live="assertive" aria-atomic="true">
            {status === "error" && (
              <p className="text-xs text-red-500 text-center">
                Something went wrong. Please try again.
              </p>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
