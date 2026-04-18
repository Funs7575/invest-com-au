"use client";

import { useState } from "react";
import Icon from "@/components/Icon";

interface Props {
  claimType: "broker" | "advisor" | "listing";
  targetSlug: string;
  targetName: string;
}

/**
 * "Are you [Name]? Claim this listing" CTA.
 *
 * Renders a prominent call-to-action at the bottom of broker and
 * advisor profile pages. On click opens an inline form modal that
 * posts to /api/claim-listing. Admin reviews the claim and grants
 * ownership manually — this does not auto-approve.
 */
export default function ClaimListingButton({
  claimType,
  targetSlug,
  targetName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/claim-listing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim_type: claimType,
          target_slug: targetSlug,
          full_name: fullName,
          email,
          company_role: role || undefined,
          phone: phone || undefined,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!data.success) {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <section className="py-10 bg-slate-50 border-t border-slate-200">
      <div className="container-custom max-w-3xl">
        <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Icon name="shield-check" size={20} className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-1">
                Are you {targetName}?
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                Claim this profile to update your details, respond to
                reviews, and connect with the investors searching for you on
                Invest.com.au. We verify every claim before granting ownership.
              </p>

              {submitted ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-900">
                  <strong>Thanks — claim received.</strong> Our team will
                  verify your identity and be in touch within 2 business days.
                </div>
              ) : !open ? (
                <button
                  onClick={() => setOpen(true)}
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors"
                >
                  Claim this listing
                  <Icon name="arrow-right" size={14} />
                </button>
              ) : (
                <form onSubmit={onSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                        Full name *
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        maxLength={120}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                        Email *
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
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                        Role at {targetName}
                      </label>
                      <input
                        type="text"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        maxLength={120}
                        placeholder="e.g. Head of Digital, CEO, Marketing"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        maxLength={40}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {error && (
                    <div
                      className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3"
                      role="alert"
                    >
                      {error}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-5 py-2.5 rounded-lg disabled:bg-slate-400"
                    >
                      {submitting ? "Submitting..." : "Submit claim"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="text-sm font-semibold text-slate-600 hover:text-slate-800 px-3"
                    >
                      Cancel
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    We&rsquo;ll verify your identity and match to the
                    registered contact for this profile. Only the authorised
                    representative can claim.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
