"use client";

import { useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/tracking";

export default function LeadMagnet() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@") || !consent) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "lead-magnet-fee-audit" }),
      });
      if (res.ok) {
        setStatus("success");
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
    <div className="rounded-xl p-6 bg-green-50 border border-green-200 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wider mb-2 text-green-700">
        Free Download
      </div>
      <h3 className="text-xl font-extrabold mb-2 text-slate-900">2026 Fee Audit PDF</h3>
      <p className="text-sm text-slate-600 mb-4 leading-relaxed">
        See exactly what every Australian broker charges — brokerage, FX fees,
        inactivity fees, and hidden costs. Compare side-by-side in one document.
      </p>

      {status === "success" ? (
        <div className="bg-green-100 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-lg font-bold mb-1 text-green-900">Check your inbox!</div>
          <p className="text-sm text-slate-600">
            We&apos;ve sent the 2026 Fee Audit PDF to your email.
          </p>

        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2.5 rounded-lg border border-green-200 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-green-700/30 focus:border-green-700"
          />
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
              className="mt-0.5 w-4 h-4 rounded border-green-300 accent-green-700 shrink-0"
            />
            <span className="text-[0.65rem] text-slate-500 leading-tight">
              I agree to receive the Fee Audit PDF and occasional updates from Invest.com.au.
              View our{" "}
              <Link href="/privacy" className="underline hover:text-green-700">
                Privacy Policy
              </Link>
              . You can unsubscribe at any time.
            </span>
          </label>
          <button
            type="submit"
            disabled={status === "loading" || !consent}
            className="w-full px-4 py-2.5 bg-amber-500 text-slate-900 text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-60"
          >
            {status === "loading" ? "Sending..." : "Get the Free PDF"}
          </button>
          {status === "error" && (
            <p className="text-xs text-red-500 text-center">
              Something went wrong. Please try again.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
