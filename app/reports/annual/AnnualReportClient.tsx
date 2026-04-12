"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { CURRENT_YEAR } from "@/lib/seo";

export default function AnnualReportClient() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/report-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Request failed");
      }

      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 md:p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-extrabold text-slate-900 text-lg mb-1">Check Your Inbox</h3>
        <p className="text-sm text-slate-600">
          We&apos;ll send the full State of Investing {CURRENT_YEAR} PDF to <strong>{email}</strong> shortly.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 md:p-8 text-white">
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="file-text" size={20} className="text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Free Download</span>
          </div>
          <h3 className="text-xl md:text-2xl font-extrabold mb-2">
            Download the Full {CURRENT_YEAR} Report
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            Get all 50+ pages of data, charts, and analysis. Includes detailed fee comparisons,
            platform rankings, emerging trends, and our predictions for the year ahead.
          </p>
        </div>

        <div className="w-full md:w-80 shrink-0">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
              />
            </div>
            {status === "error" && errorMsg && (
              <p className="text-xs text-red-400">{errorMsg}</p>
            )}
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full px-4 py-3 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "loading" ? "Sending..." : "Send Me the Report"}
            </button>
            <p className="text-[0.69rem] text-slate-400 text-center">
              No spam. Unsubscribe any time. We respect your privacy.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
