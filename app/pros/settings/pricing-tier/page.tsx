import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

// eslint-disable-next-line no-restricted-imports -- Pro settings surface: pending/active professionals may not be visible to anon-RLS; mirrors pros/settings/intake/page.tsx pattern.
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/seo";
import {
  getSuccessPricingMultiplierBps,
  type PricingTier,
} from "@/lib/briefs/pricing-tier";

import PricingTierForm from "./PricingTierForm";

export const metadata: Metadata = {
  title: "Pricing tier — Invest.com.au",
  description: "Choose how you pay for accepted Match Requests.",
  alternates: { canonical: `${SITE_URL}/pros/settings/pricing-tier` },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProsPricingTierPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/account/login?redirect=/pros/settings/pricing-tier");
  }

  const admin = createAdminClient();
  const { data: pro } = await admin
    .from("professionals")
    .select("id, name, pricing_tier")
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .in("status", ["active", "pending"])
    .maybeSingle();

  if (!pro) {
    redirect("/pros/join");
  }

  const currentTier = (pro.pricing_tier as PricingTier | null) ?? "standard";
  const multiplierBps = getSuccessPricingMultiplierBps();
  const multiplier = (multiplierBps / 10_000).toFixed(2);

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <nav className="text-xs text-slate-500 mb-4">
        <Link href="/account" className="hover:underline">
          Account
        </Link>
        <span className="mx-2">/</span>
        <Link href="/pros/billing" className="hover:underline">
          Pros
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">Pricing tier</span>
      </nav>

      <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
        Pricing tier
      </h1>
      <p className="text-sm text-slate-600 mb-6 leading-relaxed">
        Choose how you pay for accepted Match Requests. The default Standard
        tier charges credits at acceptance. The Success-Only tier charges
        nothing at acceptance — you pay {multiplier}× the standard cost at
        outcome time, but only if the consumer confirms the engagement
        completed.
      </p>

      <PricingTierForm
        professionalId={pro.id as number}
        currentTier={currentTier}
        successMultiplier={multiplier}
      />

      <div className="mt-8 rounded-xl bg-slate-50 border border-slate-200 p-5 text-sm text-slate-700 leading-relaxed">
        <h2 className="text-sm font-bold text-slate-900 mb-2">How this works</h2>
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Standard:</strong> pay credits at brief-accept time. If the
            engagement doesn&apos;t happen, the cost is sunk.
          </li>
          <li>
            <strong>Success-Only:</strong> pay nothing at accept. Pay{" "}
            {multiplier}× the standard cost only when the consumer marks the
            outcome &quot;completed&quot;. No outcome submitted, no fee.
          </li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Switching tiers applies to new accepts only — already-accepted briefs
          keep their tier from acceptance time.
        </p>
      </div>
    </main>
  );
}
