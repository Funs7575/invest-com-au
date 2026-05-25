"use client";

/**
 * FamilyOfficeReferralForm
 *
 * Lead-capture form for the family-office hub's "Do I need a family office?"
 * diagnostic. Routes through the EXISTING /api/submit-lead endpoint — no new
 * billing infrastructure. Passes diagnostic answers as qualification_data so
 * advisors see context in their notification email.
 *
 * Factual / general-information only — no personal financial advice is given.
 * Relies on the GENERAL_ADVICE_WARNING disclosure rendered on the parent page.
 */

import { useState, type FormEvent } from "react";
import { submitLead } from "@/lib/submit-lead-client";
import { isValidEmailClient, isDisposableEmail } from "@/lib/validate-email";
import { trackEvent } from "@/lib/tracking";

interface Props {
  advisorType: string;
  diagnosticAnswers: Record<string, string | undefined>;
  onSuccess: () => void;
  onCancel: () => void;
}

const STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

export default function FamilyOfficeReferralForm({
  advisorType,
  diagnosticAnswers,
  onSuccess,
  onCancel,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const name = String(fd.get("name") ?? "").trim();
    const phone = String(fd.get("phone") ?? "").trim();
    const state = String(fd.get("state") ?? "").trim();
    const wealthBand = String(fd.get("wealth_band") ?? "").trim();

    // Honeypot — never filled by real users
    if (String(fd.get("website") ?? "")) {
      onSuccess();
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
      await submitLead({
        lead_type: "advisor",
        user_email: email,
        user_name: name || undefined,
        user_phone: phone || undefined,
        user_location_state: state || undefined,
        user_intent: {
          need: advisorType,
          context: [
            `wealth: ${diagnosticAnswers.wealth ?? "unknown"}`,
            `complexity: ${diagnosticAnswers.complexity ?? "unknown"}`,
            `goal: ${diagnosticAnswers.goal ?? "unknown"}`,
            ...(wealthBand ? [`wealth_band_self_reported: ${wealthBand}`] : []),
          ],
        },
        source_page: `/family-office|advisor_type=${advisorType}|wealth=${diagnosticAnswers.wealth ?? ""}|complexity=${diagnosticAnswers.complexity ?? ""}|goal=${diagnosticAnswers.goal ?? ""}`,
      });

      trackEvent(
        "family_office_referral_submitted",
        {
          advisor_type: advisorType,
          wealth: diagnosticAnswers.wealth,
          complexity: diagnosticAnswers.complexity,
          goal: diagnosticAnswers.goal,
        },
        "/family-office",
      );

      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-slate-200 rounded-xl bg-white p-4 md:p-5 mt-4"
    >
      <p className="text-xs font-bold uppercase tracking-wide text-slate-600 mb-3">
        Your details
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xs font-semibold text-slate-700 mb-1">Name</span>
          <input
            name="name"
            type="text"
            autoComplete="name"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-semibold text-slate-700 mb-1">
            Email <span className="text-red-500">*</span>
          </span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-semibold text-slate-700 mb-1">Phone</span>
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </label>

        <label className="block">
          <span className="block text-xs font-semibold text-slate-700 mb-1">State</span>
          <select
            name="state"
            defaultValue=""
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">Select state</option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="block text-xs font-semibold text-slate-700 mb-1">
            Approximate investable assets (optional)
          </span>
          <select
            name="wealth_band"
            defaultValue=""
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">Prefer not to say</option>
            <option value="under_1m">Under $1 million</option>
            <option value="1m_5m">$1 million – $5 million</option>
            <option value="5m_20m">$5 million – $20 million</option>
            <option value="20m_plus">$20 million +</option>
          </select>
        </label>
      </div>

      {/* Honeypot */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-amber-300 text-slate-900 font-extrabold text-sm px-5 py-2.5 transition-colors"
        >
          {submitting ? "Sending…" : "Send enquiry"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>

      <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
        By submitting you agree to be contacted by a verified specialist. We never share
        your details with third parties beyond the matched adviser. This is a referral
        service only — general information, not personal financial advice.
      </p>
    </form>
  );
}
