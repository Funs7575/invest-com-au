"use client";

import { useState } from "react";
import Link from "next/link";

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
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="rounded-xl p-6 bg-gradient-to-br from-green-600 via-green-700 to-green-800 text-white shadow-lg">
      <div className="text-xs font-bold uppercase tracking-wider mb-2 text-green-100">
        Free Download
      </div>
      <h3 className="text-xl font-extrabold mb-2">2026 Fee Audit PDF</h3>
      <p className="text-sm text-green-50 mb-4 leading-relaxed">
        See exactly what every Australian broker charges — brokerage, FX fees,
        inactivity fees, and hidden costs. Compare side-by-side in one document.
      </p>

      {status === "success" ? (
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
          <div className="text-lg font-bold mb-1">Check your inbox!</div>
          <p className="text-sm text-green-50">
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
            className="w-full px-4 py-2.5 rounded-lg text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/50"
          />
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
              className="mt-0.5 w-4 h-4 rounded border-white/50 accent-slate-900 shrink-0"
            />
            <span className="text-[0.65rem] text-green-50 leading-tight">
              I agree to receive the Fee Audit PDF and occasional updates from Invest.com.au.
              View our{" "}
              <Link href="/privacy" className="underline hover:text-white">
                Privacy Policy
              </Link>
              . You can unsubscribe at any time.
            </span>
          </label>
          <button
            type="submit"
            disabled={status === "loading" || !consent}
            className="w-full px-4 py-2.5 bg-brand text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60"
          >
            {status === "loading" ? "Sending..." : "Get the Free PDF"}
          </button>
          {status === "error" && (
            <p className="text-xs text-red-200 text-center">
              Something went wrong. Please try again.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
