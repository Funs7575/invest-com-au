"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import type { LeadMagnet } from "@/lib/lead-magnets";

interface LeadMagnetCaptureProps {
  magnet: LeadMagnet;
}

export default function LeadMagnetCapture({ magnet }: LeadMagnetCaptureProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/newsletter-segments/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), segment: magnet.segmentSlug }),
      });
      if (res.ok) {
        setStatus("success");
      } else if (res.status === 429) {
        setErrorMsg("Too many requests — please try again later.");
        setStatus("error");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(
          (data as { error?: string }).error ?? "Something went wrong. Please try again."
        );
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error — please check your connection.");
      setStatus("error");
    }
  }

  return (
    <section className="py-10 bg-white border-t border-slate-200">
      <div className="container-custom max-w-4xl">
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="w-16 h-16 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Icon name={magnet.coverIcon} size={28} className="text-amber-700" />
          </div>

          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1">
              Free download
            </p>
            <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-1">
              {magnet.title}
            </h2>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              {magnet.description}
            </p>

            {status === "success" ? (
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <a
                  href={magnet.downloadUrl}
                  download
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-sm px-5 py-2.5 rounded-lg transition-colors"
                >
                  <Icon name="download" size={14} />
                  Download Now
                </a>
                <p className="text-xs text-slate-500">
                  Also check your inbox — we sent a copy to{" "}
                  <span className="font-medium">{email}</span>.
                </p>
              </div>
            ) : (
              <>
                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col sm:flex-row gap-2 max-w-sm"
                  aria-label={`Download ${magnet.title}`}
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    aria-label="Email address for download"
                    className="flex-1 px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-extrabold disabled:opacity-60 transition-colors whitespace-nowrap"
                  >
                    {status === "loading" ? "Sending…" : "Get Free PDF"}
                  </button>
                </form>

                {status === "error" && (
                  <p className="text-xs text-red-600 mt-2" role="alert">
                    {errorMsg}
                  </p>
                )}

                <p className="text-[11px] text-slate-400 mt-2">
                  No spam. Unsubscribe any time.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
