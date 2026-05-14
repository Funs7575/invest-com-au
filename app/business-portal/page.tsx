/**
 * Business owner dashboard home (W2 Phase 3).
 *
 * Shows business profile summary + grants tracker + R&D claims placeholder
 * + sell-business prep links. Compliance posture: factual computation +
 * comparison-driven content only. No "you should claim X" copy.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business dashboard — Invest.com.au",
  robots: "noindex, nofollow",
};

interface BusinessRow {
  id: number;
  business_name: string;
  legal_name: string | null;
  abn: string | null;
  industry: string | null;
  employees_band: string | null;
  revenue_band: string | null;
  primary_state: string | null;
  status: string;
}

export default async function BusinessPortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/account/login?redirect=/business-portal");
  }

  const { data } = await supabase
    .from("business_accounts")
    .select("id, business_name, legal_name, abn, industry, employees_band, revenue_band, primary_state, status")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!data) {
    redirect("/account/upgrade/business");
  }

  const account = data as BusinessRow;

  return (
    <main className="bg-slate-50 min-h-[60vh]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <header className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-700 mb-1">
              <span aria-hidden className="mr-1.5">🏢</span>
              Business workspace
            </p>
            <h1 className="text-2xl font-bold text-slate-900">
              {account.business_name}
            </h1>
            {account.legal_name && account.legal_name !== account.business_name && (
              <p className="text-sm text-slate-600 mt-0.5">{account.legal_name}</p>
            )}
          </div>
          <Link
            href="/account/upgrade/business?edit=1"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-2"
          >
            Edit business profile
          </Link>
        </header>

        {/* Profile summary */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Profile</h2>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-xs text-slate-500 uppercase tracking-wider">Status</dt>
              <dd className="text-slate-900 font-medium mt-0.5">{account.status}</dd>
            </div>
            {account.abn && (
              <div>
                <dt className="text-xs text-slate-500 uppercase tracking-wider">ABN</dt>
                <dd className="text-slate-900 font-medium mt-0.5">{account.abn}</dd>
              </div>
            )}
            {account.industry && (
              <div>
                <dt className="text-xs text-slate-500 uppercase tracking-wider">Industry</dt>
                <dd className="text-slate-900 font-medium mt-0.5">{account.industry}</dd>
              </div>
            )}
            {account.primary_state && (
              <div>
                <dt className="text-xs text-slate-500 uppercase tracking-wider">State</dt>
                <dd className="text-slate-900 font-medium mt-0.5">{account.primary_state}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* Grants */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-baseline justify-between gap-2 mb-3">
            <h2 className="text-sm font-semibold text-slate-900">Grants tracker</h2>
            <Link
              href="/grants/eligibility-quiz"
              className="text-xs text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
            >
              Run eligibility quiz →
            </Link>
          </div>
          <p className="text-sm text-slate-600">
            Eligibility checks for EMDG (export), R&D Tax Incentive, and Industry Growth Program. Take the eligibility quiz once and your answers persist here for follow-up review.
          </p>
          <p className="text-xs text-slate-500 italic mt-3">
            General eligibility info only — confirm with your accountant or business.gov.au before claiming.
          </p>
        </section>

        {/* Sell business prep */}
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Selling your business</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link
                href="/sell-business/valuation"
                className="text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
              >
                Run a valuation →
              </Link>
              <span className="text-slate-600 ml-2">EBITDA-multiple estimate</span>
            </li>
            <li>
              <Link
                href="/sell-business/checklist"
                className="text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
              >
                Sale-prep checklist →
              </Link>
              <span className="text-slate-600 ml-2">due-diligence prep + CGT concessions</span>
            </li>
            <li>
              <Link
                href="/advisors/business-brokers"
                className="text-emerald-700 hover:text-emerald-900 underline underline-offset-2"
              >
                Find a business broker →
              </Link>
              <span className="text-slate-600 ml-2">verified AU brokers</span>
            </li>
          </ul>
        </section>

        <p className="text-xs text-slate-500 italic text-center">
          Invest.com.au provides general information and comparison content — not advice tailored to your business. See your accountant or financial advisor for personalised guidance.
        </p>
      </div>
    </main>
  );
}
