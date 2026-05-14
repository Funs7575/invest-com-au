import type { Metadata } from "next";
import { notFound } from "next/navigation";

// eslint-disable-next-line no-restricted-imports -- token-keyed anon read; the helper uses service-role internally for the same reason as N4 outcomes.
import { createAdminClient } from "@/lib/supabase/admin";
import { getQuoteByToken } from "@/lib/expert-teams/fixed-quotes";
import { SITE_URL } from "@/lib/seo";
import QuoteReviewForm from "./QuoteReviewForm";

export const metadata: Metadata = {
  title: "Review your quote — Invest.com.au",
  description: "Review and accept the fixed-price quote from your Pro Squad.",
  alternates: { canonical: `${SITE_URL}/quote` },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function QuoteReviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const quote = await getQuoteByToken(token);
  if (!quote) notFound();

  // Hydrate team name + brief title for display.
  const admin = createAdminClient();
  const [teamRes, briefRes] = await Promise.all([
    admin
      .from("expert_teams")
      .select("name, slug")
      .eq("id", quote.team_id)
      .maybeSingle(),
    admin
      .from("advisor_auctions")
      .select("job_title, slug")
      .eq("id", quote.brief_id)
      .maybeSingle(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-xl mx-auto px-4 py-10 sm:py-16">
        <p className="text-amber-600 text-[11px] font-bold uppercase tracking-widest mb-2">
          Fixed-price quote
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
          {teamRes.data?.name ?? "Your Pro Squad"} has sent you a quote
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          For your Match Request: <strong>{briefRes.data?.job_title ?? "Your request"}</strong>
        </p>
        <QuoteReviewForm
          token={token}
          status={quote.status}
          amountCents={quote.amount_cents}
          scopeItems={quote.scope_items}
          paymentTerms={quote.payment_terms}
          deliveryDaysEstimate={quote.delivery_days_estimate}
          expiresAt={quote.expires_at}
        />
      </div>
    </div>
  );
}
