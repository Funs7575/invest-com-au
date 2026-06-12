"use client";

/**
 * Grant alerts signup (CR-04b v1 — CAPITAL_RAISING_OPPORTUNITIES.md).
 *
 * Free deadline/new-program alerts by industry + state, captured through
 * the existing /api/email-capture pipeline (dedup, rate limits, consent
 * handling) with source "grant_alerts" and the preferences in context.
 * Sends ride the existing newsletter rails; the paid tier from the
 * strategy doc layers on later without changing this capture shape.
 *
 * Grants are not financial products, so no AFSL surface is created here —
 * host pages already carry GRANTS_WARNING.
 */

import { useState, type FormEvent } from "react";
import Icon from "@/components/Icon";
import { isValidEmailClient, isDisposableEmail } from "@/lib/validate-email";

const INDUSTRIES = [
  "Tech / Software",
  "Manufacturing",
  "Energy / Resources",
  "Agriculture / Food",
  "Health / Biotech",
  "Retail / Consumer",
  "Services",
  "Other",
] as const;

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

export default function GrantAlertsSignup({ sourcePage }: { sourcePage: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    // Honeypot — bots fill every input; real users never see this field.
    if (String(fd.get("website") || "")) {
      setDone(true);
      return;
    }
    if (!isValidEmailClient(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (isDisposableEmail(email)) {
      setError("Please use a real email address — disposable inboxes aren't supported.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: "grant_alerts",
          context: {
            kind: "grant_alerts",
            industry: String(fd.get("industry") || ""),
            state: String(fd.get("state") || ""),
            source_page: sourcePage,
          },
        }),
      });
      if (!res.ok) throw new Error("capture failed");
      setDone(true);
    } catch {
      setError("Something went wrong saving your alert. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 flex items-start gap-3">
        <Icon name="check-circle" size={18} className="text-emerald-600 mt-0.5 shrink-0" aria-hidden />
        <div>
          <p className="font-extrabold text-slate-900 text-sm">Grant alerts on</p>
          <p className="text-sm text-slate-700 mt-0.5">
            We&rsquo;ll email you when major programs matching your industry and state open or
            approach their closing dates. Unsubscribe anytime from any email.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Icon name="clipboard-list" size={16} className="text-amber-600" aria-hidden />
        <h3 className="font-extrabold text-slate-900">Grant deadline alerts</h3>
        <span className="text-[10px] uppercase tracking-wider font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full px-2 py-0.5">
          Free
        </span>
      </div>
      <p className="text-sm text-slate-600 mb-4">
        Programs open and close all year. Get an email when grants matching your industry and
        state open, change, or near their deadline.
      </p>
      <div className="grid sm:grid-cols-3 gap-2 mb-2">
        <label className="block sm:col-span-1">
          <span className="sr-only">Email address</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="you@business.com.au"
            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
          />
        </label>
        <label className="block">
          <span className="sr-only">Industry</span>
          <select name="industry" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white" defaultValue="">
            <option value="" disabled>
              Industry
            </option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="sr-only">State</span>
          <select name="state" className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white" defaultValue="">
            <option value="" disabled>
              State
            </option>
            {STATES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </label>
      </div>
      {/* Honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {error && (
        <p role="alert" className="text-xs text-red-700 mb-2">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-extrabold px-4 py-2.5"
      >
        {submitting ? "Saving…" : "Get grant alerts"}
        <Icon name="arrow-right" size={14} aria-hidden />
      </button>
      <p className="text-[11px] text-slate-500 mt-2">
        Free email alerts — no spam, unsubscribe anytime. Program details and eligibility are
        always confirmed by the administering agency.
      </p>
    </form>
  );
}
