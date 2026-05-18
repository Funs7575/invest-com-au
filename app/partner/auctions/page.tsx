import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

// eslint-disable-next-line no-restricted-imports -- partner page is admin-gated above; the wallet read needs broker-cross-cutting access and the partner-link table doesn't exist yet (pre-launch). Will swap to createClient + a dedicated /api/partner/wallet route when the partner-link table ships.
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isFlagEnabled } from "@/lib/feature-flags";
import { getAdminEmails } from "@/lib/admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Partner — Auction self-serve",
  robots: { index: false, follow: false },
};

// FIN_NOTEBOOK Revenue #5 (hybrid auction). Partner-facing scaffold
// behind the `hybrid_auction_partner_self_serve` feature flag — the
// underlying engine (lib/marketplace/auto-bid.ts +
// app/admin/marketplace) is ~90% built; the missing piece is a
// partner-side flow where a broker can self-serve onboarding without
// going through admin. Legal sign-off on the quality-multiplier model
// is the remaining blocker — until that's done, the flag stays off
// in production. The page exists so the funnel can be tested in
// preview / dev.
//
// What this page does today:
//   - 404s when the flag is off (no public surface, no SEO crawl).
//   - Shows the broker's current bid status + wallet balance + a
//     pointer to /admin/marketplace for actions still gated to admin.
//
// What lands next (post legal sign-off):
//   - Bid-setting UI here (category picker, per-category bid input,
//     auto-bid toggle).
//   - Quality-multiplier preview ("your current quality score is 1.4×;
//     your effective rank-bid is $4.20/lead").
//   - Reserve-price acknowledgement modal.

interface PageProps {
  searchParams: Promise<{ broker?: string }>;
}

export default async function PartnerAuctionsPage({ searchParams }: PageProps) {
  const flagOn = await isFlagEnabled("hybrid_auction_partner_self_serve");
  if (!flagOn) notFound();

  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect("/login?next=/partner/auctions");
  }

  // The partner-link table (broker_user_links) doesn't exist yet —
  // pre-launch, admins eyeball this surface by passing ?broker=slug.
  // The real partner experience lands when the partner-link table +
  // self-serve auth ships (separate PR, blocked on legal sign-off on
  // the quality-multiplier model anyway). Until then, gate to admin.
  const adminEmails = getAdminEmails();
  if (!adminEmails.includes(user.email.toLowerCase())) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold text-slate-900">Partner — Auction self-serve</h1>
        <p className="mt-3 text-sm text-slate-600">
          The partner self-serve flow is in private beta while we finalise the quality-multiplier
          model with legal. Email{" "}
          <a href="mailto:partners@invest.com.au" className="underline">
            partners@invest.com.au
          </a>{" "}
          to register interest.
        </p>
      </div>
    );
  }

  const brokerSlug = params.broker;
  if (!brokerSlug) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold text-slate-900">Partner — Auction self-serve</h1>
        <p className="mt-3 text-sm text-slate-600">
          Pre-launch admin preview: pass <code>?broker=&lt;slug&gt;</code> to inspect a specific
          broker&apos;s auction state.
        </p>
      </div>
    );
  }

  const admin = createAdminClient();
  const [brokerRes, walletRes] = await Promise.all([
    admin.from("brokers").select("slug, name").eq("slug", brokerSlug).maybeSingle(),
    admin
      .from("broker_wallets")
      .select("balance_cents, lifetime_spent_cents, currency")
      .eq("broker_slug", brokerSlug)
      .maybeSingle(),
  ]);

  const brokerName = brokerRes.data?.name ?? brokerSlug;
  const wallet = walletRes.data;
  const link = { brokers: { name: brokerName } } as const;

  const balanceDisplay =
    wallet?.balance_cents != null
      ? `$${(wallet.balance_cents / 100).toFixed(2)}`
      : "(no wallet yet)";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Partner · Auction</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          {link?.brokers?.name ?? brokerSlug}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Self-serve auction controls. Bid management UI rolls out behind a feature flag while we
          finalise the quality-multiplier model with legal.
        </p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Wallet</h2>
        <p className="mt-2 text-2xl font-bold text-slate-900">{balanceDisplay}</p>
        <p className="mt-1 text-xs text-slate-500">
          Top-up flow is currently in admin only. Email{" "}
          <a href="mailto:partners@invest.com.au" className="underline">
            partners@invest.com.au
          </a>{" "}
          to top up.
        </p>
        {wallet?.lifetime_spent_cents != null && (
          <p className="mt-1 text-xs text-slate-500">
            Lifetime spend: ${(wallet.lifetime_spent_cents / 100).toFixed(2)} {wallet.currency ?? "AUD"}
          </p>
        )}
      </section>

      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">Bid management</h2>
        <p className="mt-2 text-sm text-slate-600">
          Per-category bidding + auto-bid lands here behind the same feature flag. For now, request
          a change in writing — admin applies it within a business day:
        </p>
        <Link
          href="mailto:partners@invest.com.au?subject=Auction%20bid%20change"
          className="mt-3 inline-flex items-center rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800"
        >
          Email a bid change &rarr;
        </Link>
      </section>

      <p className="mt-8 text-[0.65rem] text-slate-400">
        Operating under ASIC RG 246. Bids reflect lead-cost economics, not personal-advice quality.
        Quality multiplier reflects historical CTR + conversion data, not editorial preference.
      </p>
    </div>
  );
}
