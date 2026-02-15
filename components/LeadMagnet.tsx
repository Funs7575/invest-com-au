"use client";

import { useState } from "react";

export default function LeadMagnet() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

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
    <div className="rounded-xl p-6 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white shadow-lg">
      <div className="text-xs font-bold uppercase tracking-wider mb-2 text-amber-100">
        Free Download
      </div>
      <h3 className="text-xl font-extrabold mb-2">2026 Fee Audit PDF</h3>
      <p className="text-sm text-amber-50 mb-4 leading-relaxed">
        See exactly what every Australian broker charges — brokerage, FX fees,
        inactivity fees, and hidden costs. Compare side-by-side in one document.
      </p>

      {status === "success" ? (
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
          <div className="text-lg font-bold mb-1">Check your inbox!</div>
          <p className="text-sm text-amber-50">
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
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full px-4 py-2.5 bg-brand text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60"
          >
            {status === "loading" ? "Sending..." : "Get the Free PDF"}
          </button>
          {status === "error" && (
            <p className="text-xs text-red-200 text-center">
              Something went wrong. Please try again.
            </p>
          )}
          <p className="text-[0.65rem] text-amber-100 text-center">
            No spam. Unsubscribe any time.
          </p>
        </form>
      )}
    </div>
  );
}
