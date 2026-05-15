import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

// eslint-disable-next-line no-restricted-imports -- Advisor billing surface: a pending/active professional may not be visible under anon-RLS (the "Public can view active" policy only covers status='active' + visible profiles). We need to find the row by auth_user_id OR email regardless of status, so service-role is required. The page redirects unauthenticated visitors first and only loads its own row.
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { MARKETPLACE_CREDIT_PACKS } from "@/lib/advisor-credit-packs";
import {
  getProSubscription,
  SUBSCRIPTION_CONFIGS,
  type ProSubscriptionTier,
  type ProSubscriptionStatus,
} from "@/lib/pro-subscription";
import BillingClient from "./BillingClient";
import ProOnboardingTour from "@/components/onboarding/ProOnboardingTour";

export const metadata: Metadata = {
  title: "Match Request credits — Invest.com.au",
  description:
    "Top up your Match Request credits and manage auto-recharge for the Invest.com.au marketplace.",
  alternates: { canonical: `${SITE_URL}/pros/billing` },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface ProRow {
  id: number;
  name: string;
  email: string;
  credit_balance_cents: number;
  lifetime_credit_cents: number | null;
  lifetime_lead_spend_cents: number | null;
  auto_recharge_enabled: boolean;
  auto_recharge_threshold_credits: number;
  auto_recharge_pack_slug: string | null;
  stripe_default_payment_method: string | null;
}

export default async function ProsBillingPage() {
  // Resolve the calling advisor via the Supabase auth cookie. We use the
  // server client so the auth.uid() check goes through the session.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/account/login?redirect=/pros/billing");
  }

  // Use the admin client to find the matching professionals row. The
  // session client can't see pending advisors due to RLS scoping.
  const admin = createAdminClient();
  const { data: pro } = await admin
    .from("professionals")
    .select(
      "id, name, email, credit_balance_cents, lifetime_credit_cents, lifetime_lead_spend_cents, auto_recharge_enabled, auto_recharge_threshold_credits, auto_recharge_pack_slug, stripe_default_payment_method",
    )
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .in("status", ["active", "pending"])
    .maybeSingle();

  if (!pro) {
    redirect("/pros/join");
  }
  const advisor = pro as ProRow;
  void cookies();

  const subscription = await getProSubscription(advisor.id);
  const subscriptionTiers = (
    ["free", "starter", "growth", "scale"] as ProSubscriptionTier[]
  ).map((tier) => ({
    tier,
    monthlyPriceCents: SUBSCRIPTION_CONFIGS[tier].monthlyPriceCents,
    perks: SUBSCRIPTION_CONFIGS[tier].perks,
  }));

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Pros" },
    { name: "Billing" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <ProOnboardingTour />
      <div className="min-h-screen bg-slate-50 py-6 md:py-12">
        <div className="container-custom max-w-3xl">
          <header className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              Match Request credits
            </h1>
            <p className="text-sm md:text-base text-slate-500 mt-1.5 leading-relaxed">
              Top up to accept Match Requests on the Invest.com.au marketplace. 1 credit = A$1.
            </p>
          </header>

          <BillingClient
            advisorName={advisor.name}
            balanceCents={advisor.credit_balance_cents ?? 0}
            lifetimeCreditCents={advisor.lifetime_credit_cents ?? 0}
            lifetimeSpendCents={advisor.lifetime_lead_spend_cents ?? 0}
            autoRechargeEnabled={advisor.auto_recharge_enabled}
            autoRechargeThresholdCredits={advisor.auto_recharge_threshold_credits}
            autoRechargePackSlug={advisor.auto_recharge_pack_slug}
            hasSavedCard={Boolean(advisor.stripe_default_payment_method)}
            packs={[...MARKETPLACE_CREDIT_PACKS]}
            subscriptionTier={subscription.tier}
            subscriptionStatus={subscription.status as ProSubscriptionStatus}
            subscriptionTiers={subscriptionTiers}
          />
        </div>
      </div>
    </>
  );
}
