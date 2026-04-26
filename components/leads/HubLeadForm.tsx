"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Icon from "@/components/Icon";

type Intent = {
  need: string;
  context?: string[];
};

interface HubLeadFormProps {
  heading: string;
  subheading?: string;
  intent: Intent;
  source: string;
  ctaLabel?: string;
  ctaIntro?: ReactNode;
  /** Optional extra fields to capture (eg. company, dev_spend). Stored as part of source_page metadata. */
  extraFields?: Array<{ name: string; label: string; type?: "text" | "number"; required?: boolean }>;
  /** Show state selector. Defaults to true. */
  showState?: boolean;
}

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

export default function HubLeadForm({
  heading,
  subheading,
  intent,
  source,
  ctaLabel = "Get matched with a specialist",
  ctaIntro,
  extraFields = [],
  showState = true,
}: HubLeadFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const name = String(fd.get("name") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    const state = String(fd.get("state") || "").trim();

    const extras: Record<string, string> = {};
    for (const f of extraFields) {
      const v = String(fd.get(f.name) || "").trim();
      if (v) extras[f.name] = v;
    }

    try {
      const res = await fetch("/api/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_type: "advisor",
          user_email: email,
          user_name: name || undefined,
          user_phone: phone || undefined,
          user_location_state: state || undefined,
          user_intent: intent,
          source_page: source,
          // honeypot field — bots will fill this; humans won't see it
          website: String(fd.get("website") || ""),
          // Capture extras as additional context
          ...(Object.keys(extras).length ? { extra_metadata: extras } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 md:p-8 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center mb-4">
          <Icon name="check" size={22} className="text-white" />
        </div>
        <h3 className="text-xl font-extrabold text-slate-900 mb-2">Thanks — we&rsquo;ll be in touch.</h3>
        <p className="text-sm text-slate-700 max-w-md mx-auto">
          A specialist will reach out within one business day. Check your inbox for a confirmation email.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
      <div className="mb-5">
        <h3 className="text-xl md:text-2xl font-extrabold text-slate-900">{heading}</h3>
        {subheading && <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{subheading}</p>}
        {ctaIntro && <div className="mt-3 text-sm text-slate-700 leading-relaxed">{ctaIntro}</div>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">Your name</span>
          <input
            name="name"
            type="text"
            autoComplete="name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">Email *</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </label>
        <label className="block">
          <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">Phone</span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </label>
        {showState && (
          <label className="block">
            <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">State</span>
            <select
              name="state"
              defaultValue=""
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">Select state</option>
              {STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        )}
        {extraFields.map((f) => (
          <label key={f.name} className="block md:col-span-2">
            <span className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
              {f.label}{f.required ? " *" : ""}
            </span>
            <input
              name={f.name}
              type={f.type || "text"}
              required={f.required}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>
        ))}
      </div>

      {/* Honeypot — visually hidden but reachable to bots */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-amber-300 text-slate-900 font-extrabold text-sm md:text-base px-6 py-3 transition-colors"
      >
        {submitting ? "Submitting…" : ctaLabel}
        {!submitting && <Icon name="arrow-right" size={16} />}
      </button>

      <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
        By submitting you agree to be contacted by a verified specialist. We never share your details with third parties beyond the matched advisor. General advice only — not personal financial product advice.
      </p>
    </form>
  );
}
