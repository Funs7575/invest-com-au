"use client";

import { useState } from "react";

/**
 * Reusable in-page lead-capture form for the foreign-investment country
 * hubs.
 *
 * Posts to the existing /api/email-capture endpoint with:
 *   - source: `${countryCode}-${kind}` (e.g. "uk-pension-transfer")
 *   - context: { country, kind, ...extraFields }
 *
 * The extra fields are configurable per instance — pension transfer
 * needs age + pension type, the FX form needs an amount, the property
 * form needs a budget range. Email is always required.
 *
 * The existing email-capture pipeline already handles dedup, rate
 * limiting, the welcome / drip sequence and Resend notification.
 */

interface ExtraField {
  name: string;
  label: string;
  type?: "text" | "tel" | "number" | "select";
  options?: ReadonlyArray<{ value: string; label: string }>;
  placeholder?: string;
  required?: boolean;
}

interface Props {
  /** Discriminator on what the form is collecting. Used as part of source. */
  kind:
    | "pdf-checklist"
    | "pension-transfer"
    | "fx-quote"
    | "property-budget"
    | "migration-consult";
  /** Country code, e.g. "uk". Stored in context for segmentation. */
  countryCode: string;
  /** Form heading. */
  title: string;
  /** One-line description shown above the fields. */
  body: string;
  /** Button label. */
  ctaLabel: string;
  /** Success-state heading. */
  successHeading: string;
  /** Success-state body. */
  successBody: string;
  /** Extra fields beyond email + name. */
  extraFields?: ReadonlyArray<ExtraField>;
  /** Visual accent — Tailwind colour name (amber, emerald, blue). */
  accent?: "amber" | "emerald" | "blue" | "slate";
}

const ACCENT: Record<NonNullable<Props["accent"]>, { bg: string; ring: string; btn: string; btnHover: string; text: string }> = {
  amber:   { bg: "bg-amber-50",   ring: "border-amber-200",   btn: "bg-amber-500",   btnHover: "hover:bg-amber-400",   text: "text-amber-700" },
  emerald: { bg: "bg-emerald-50", ring: "border-emerald-200", btn: "bg-emerald-600", btnHover: "hover:bg-emerald-500", text: "text-emerald-700" },
  blue:    { bg: "bg-blue-50",    ring: "border-blue-200",    btn: "bg-blue-600",    btnHover: "hover:bg-blue-500",    text: "text-blue-700" },
  slate:   { bg: "bg-slate-50",   ring: "border-slate-200",   btn: "bg-slate-900",   btnHover: "hover:bg-slate-800",   text: "text-slate-700" },
};

export default function CountryLeadForm({
  kind,
  countryCode,
  title,
  body,
  ctaLabel,
  successHeading,
  successBody,
  extraFields = [],
  accent = "amber",
}: Props) {
  const colors = ACCENT[accent];
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting" || status === "success") return;
    if (!email.trim()) {
      setErrorMsg("Email is required.");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          source: `${countryCode}-${kind}`,
          name: name.trim() || undefined,
          context: {
            country: countryCode,
            kind,
            ...extra,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className={`${colors.bg} border ${colors.ring} rounded-2xl p-5 my-4`}>
        <p className={`text-xs font-extrabold uppercase tracking-wider ${colors.text} mb-1`}>Thanks</p>
        <h3 className="text-base font-bold text-slate-900 mb-1">{successHeading}</h3>
        <p className="text-sm text-slate-700">{successBody}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`${colors.bg} border ${colors.ring} rounded-2xl p-5 my-4`}
    >
      <h3 className="text-base font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-700 mb-4">{body}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          autoComplete="name"
        />
        <input
          type="email"
          required
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
          autoComplete="email"
        />
        {extraFields.map((field) => {
          const val = extra[field.name] ?? "";
          if (field.type === "select" && field.options) {
            return (
              <select
                key={field.name}
                value={val}
                onChange={(e) => setExtra((s) => ({ ...s, [field.name]: e.target.value }))}
                required={field.required}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                <option value="">{field.label}</option>
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            );
          }
          return (
            <input
              key={field.name}
              type={field.type ?? "text"}
              required={field.required}
              placeholder={field.placeholder ?? field.label}
              value={val}
              onChange={(e) => setExtra((s) => ({ ...s, [field.name]: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
        <p className="text-[11px] text-slate-500 leading-snug max-w-md">
          We&apos;ll only use this to follow up on this enquiry. No spam. Unsubscribe anytime.
          General information only — always check licensing, fees, risks and suitability.
        </p>
        <button
          type="submit"
          disabled={status === "submitting"}
          className={`shrink-0 ${colors.btn} ${colors.btnHover} text-white font-bold text-sm px-5 py-2.5 rounded-lg disabled:opacity-50 transition-colors`}
        >
          {status === "submitting" ? "Sending…" : ctaLabel}
        </button>
      </div>
      {status === "error" && errorMsg && (
        <p className="text-xs text-red-600 mt-2">{errorMsg}</p>
      )}
    </form>
  );
}
