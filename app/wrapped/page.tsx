import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import { buildWrappedCards, wrappedFyForDate, wrappedShareSummary } from "@/lib/wrapped";
import { loadWrappedData } from "@/lib/wrapped-server";
import WrappedDeck from "./WrappedDeck";

export const dynamic = "force-dynamic";

// FY Money Wrapped (RETENTION_MARKETPLACE_MEGA_SESSIONS idea #25): a
// per-user end-of-financial-year recap assembled from saved state only.
// Signed in → swipeable card deck; anonymous → teaser + signup CTA, so
// crawlers and shared links never see a personal number. The public OG
// image (./opengraph-image.tsx) is generic by design; personal numbers
// render only through the authenticated /api/account/wrapped-card PNG.

export async function generateMetadata(): Promise<Metadata> {
  const fy = wrappedFyForDate(new Date());
  return {
    title: `${fy.label} Money Wrapped — your year in money | ${SITE_NAME}`,
    description: `Your ${fy.label} recap, built from your own saved data — tracked balances, goals on track, health score trend, rate alerts and streaks. Australian EOFY, finally with a ritual.`,
    alternates: { canonical: absoluteUrl("/wrapped") },
  };
}

const TEASER_TILES = [
  { kicker: "What you're tracking", masked: "$ ••,•••", note: "holdings, goals + balances" },
  { kicker: "Goals", masked: "• of • on track", note: "projected from your numbers" },
  { kicker: "Health score", masked: "• → •", note: "your trend across the year" },
] as const;

function WrappedTeaser({ fyLabel }: { fyLabel: string }) {
  return (
    <>
      <header className="mb-8 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-600">
          {fyLabel} · Your year in money
        </p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 [text-wrap:balance]">
          {fyLabel} Money Wrapped
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm sm:text-base text-slate-600">
          The end of the financial year, made personal. Wrapped turns the goals, balances,
          alerts and check-ins you save here into a recap worth a scroll — and a share.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3" aria-hidden>
        {TEASER_TILES.map((tile) => (
          <div
            key={tile.kicker}
            className="rounded-2xl bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-900 p-5 text-white shadow-md"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
              {tile.kicker}
            </p>
            <p className="mt-2 text-2xl font-extrabold tracking-tight tnum">{tile.masked}</p>
            <p className="mt-1 text-xs text-white/70">{tile.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <Link
          href="/auth/signup?next=/wrapped"
          className="inline-flex items-center justify-center rounded-full bg-violet-600 px-6 py-3 text-sm font-bold text-white hover:bg-violet-700 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:outline-none transition-colors"
        >
          Create a free account to unwrap yours
        </Link>
        <p className="text-sm text-slate-600">
          Already saving here?{" "}
          <Link
            href="/auth/login?next=/wrapped"
            className="font-semibold text-violet-700 hover:underline"
          >
            Sign in
          </Link>
        </p>
        <p className="mt-2 max-w-sm text-center text-xs text-slate-500">
          Wrapped is private by default — your numbers are only visible to you, and only you
          decide what gets shared.
        </p>
      </div>
    </>
  );
}

export default async function WrappedPage() {
  const now = new Date();
  const fy = wrappedFyForDate(now);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let content: React.ReactNode;

  if (!user) {
    content = <WrappedTeaser fyLabel={fy.label} />;
  } else {
    const data = await loadWrappedData(
      supabase,
      { id: user.id, createdAt: user.created_at ?? null },
      fy,
      now.getTime(),
    );
    const cards = buildWrappedCards(data);

    content = (
      <>
        <header className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-violet-600">
            Your year in money
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            {fy.label} Money Wrapped
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            {data.inProgress
              ? `${data.daysRemaining} ${data.daysRemaining === 1 ? "day" : "days"} until June 30 — here's your year so far.`
              : "Your financial year, recapped from what you saved along the way."}
          </p>
        </header>

        <WrappedDeck
          cards={cards}
          fyLabel={fy.label}
          shareUrl={absoluteUrl("/wrapped")}
          shareSummary={wrappedShareSummary(data)}
          canShare={data.hasAnyData}
        />
      </>
    );
  }

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Money Wrapped", url: absoluteUrl("/wrapped") },
  ]);

  return (
    <main className="min-h-screen bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <div className="mx-auto max-w-xl px-4 py-10 sm:py-14">
        {content}

        <p className="mt-10 text-[11px] leading-relaxed text-slate-500">
          {GENERAL_ADVICE_WARNING} Wrapped is a factual summary of the data you&apos;ve saved on
          invest.com.au — not advice, a recommendation, or a measure of investment performance.
        </p>
      </div>
    </main>
  );
}
