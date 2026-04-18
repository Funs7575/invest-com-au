"use client";

import { useState } from "react";
import Icon from "@/components/Icon";

interface Props {
  slug: string;
  gated: boolean;
  directUrl: string | null;
}

/**
 * Gated-report email capture.
 *
 * - If the report is ungated, renders a direct-download link.
 * - If gated, renders name+email form that POSTs to /api/report-leads
 *   and on success reveals the download link (plus auto-opens it in
 *   a new tab for convenience).
 */
export default function ReportGate({ slug, gated, directUrl }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Direct download — no gate
  if (!gated) {
    if (!directUrl) {
      return (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
          <p className="text-sm text-slate-500">
            Report is being finalised. Check back soon.
          </p>
        </div>
      );
    }
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
          <Icon name="file-text" size={22} className="text-emerald-600" />
        </div>
        <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-2">
          Free download
        </h2>
        <p className="text-sm text-slate-600 mb-5">
          No registration required — download the full report.
        </p>
        <a
          href={directUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm md:text-base px-6 py-3 rounded-lg"
        >
          Download PDF
          <Icon name="download" size={16} />
        </a>
      </div>
    );
  }

  // Post-submission state
  if (downloadUrl) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
          <Icon name="check-circle" size={22} className="text-emerald-600" />
        </div>
        <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-2">
          Your report is ready
        </h2>
        <p className="text-sm text-slate-600 mb-5">
          We&rsquo;ll also email a copy to{" "}
          <strong>{email}</strong>.
        </p>
        <a
          href={downloadUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm md:text-base px-6 py-3 rounded-lg"
        >
          Download PDF
          <Icon name="download" size={16} />
        </a>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/report-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_slug: slug, name, email }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        report_url?: string | null;
        error?: string;
      };
      if (!data.success) {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setDownloadUrl(data.report_url || "/research");
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 max-w-md mx-auto"
    >
      <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
        <Icon name="download" size={22} className="text-amber-600" />
      </div>
      <h2 className="text-lg md:text-xl font-extrabold text-slate-900 text-center mb-2">
        Download free report
      </h2>
      <p className="text-sm text-slate-600 text-center mb-5">
        Enter your details and we&rsquo;ll email you the PDF.
      </p>
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
            Full name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={200}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
          />
        </div>
      </div>
      {error && (
        <div
          className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3 mt-3"
          role="alert"
        >
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm px-4 py-3 rounded-lg disabled:bg-slate-400"
      >
        {submitting ? "Submitting..." : "Get the report"}
        {!submitting && <Icon name="arrow-right" size={14} />}
      </button>
      <p className="text-[10px] text-slate-500 mt-3 leading-relaxed text-center">
        We&rsquo;ll occasionally email you related research. Unsubscribe any
        time. Your details are never sold.
      </p>
    </form>
  );
}
