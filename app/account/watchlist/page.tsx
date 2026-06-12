import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInvestorProfile } from "@/lib/investor-profiles";
import { isFlagEnabled } from "@/lib/feature-flags";
import { HOUSEHOLDS_FLAG, getHouseholdContextForUser } from "@/lib/households";
import WatchlistAlertsToggle from "./WatchlistAlertsToggle";
import WatchlistClient from "./WatchlistClient";
import DigestToggle from "./DigestToggle";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Watchlist — My Account",
  robots: "noindex, nofollow",
};

export default async function WatchlistPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=/account/watchlist");
  }

  // Household sharing is dormant unless the flag is on AND an accepted partner
  // exists. When on, select household_id too so we can seed the share toggle.
  const householdFlag = await isFlagEnabled(HOUSEHOLDS_FLAG, {
    userKey: user.email ?? null,
    segment: "user",
  });

  const [watchlistRes, investorProfile, householdCtx] = await Promise.all([
    supabase
      .from("user_watchlist_items")
      .select(
        householdFlag
          ? "id, item_type, item_slug, display_name, added_at, household_id"
          : "id, item_type, item_slug, display_name, added_at",
      )
      .eq("user_id", user.id)
      .order("added_at", { ascending: false }),
    getInvestorProfile(user.id),
    householdFlag ? getHouseholdContextForUser(user.id) : Promise.resolve(null),
  ]);

  const { data } = watchlistRes;
  const digestMeta = investorProfile?.meta ?? {};
  const watchlistDigestEnabled = digestMeta.watchlist_digest === true;
  const householdEnabled = householdFlag && !!householdCtx?.partner;

  const rawItems = ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
    id: row.id as number,
    item_type: row.item_type as string,
    item_slug: row.item_slug as string,
    display_name: (row.display_name as string | null) ?? null,
    added_at: row.added_at as string,
    shared: householdFlag ? row.household_id != null : false,
  }));

  // Enrich watched brokers with their current best-rate snapshot when
  // the broker is a savings_account or term_deposit. Surfaces the live
  // rate next to the watched item so the watchlist isn't just a list of
  // links — it actually shows what changed. Lazy + bounded: only fires
  // when at least one broker is watched, never blocks if the lookup fails.
  const watchedBrokerSlugs = rawItems
    .filter((i) => i.item_type === "broker")
    .map((i) => i.item_slug);
  const currentRateBpsBySlug: Record<string, number> = {};
  if (watchedBrokerSlugs.length > 0) {
    const { data: brokerRows } = await supabase
      .from("brokers")
      .select("id, slug, platform_type")
      .in("slug", watchedBrokerSlugs)
      .in("platform_type", ["savings_account", "term_deposit"]);

    const rateBrokerIds = (brokerRows ?? []).map((b) => b.id as number);
    if (rateBrokerIds.length > 0) {
      const { data: snapshots } = await supabase
        .from("savings_rate_snapshots")
        .select("broker_id, rate_bps, captured_at")
        .in("broker_id", rateBrokerIds)
        .order("captured_at", { ascending: false });

      const bestByBrokerId = new Map<number, number>();
      for (const snap of snapshots ?? []) {
        const bid = snap.broker_id as number;
        if (!bestByBrokerId.has(bid)) {
          bestByBrokerId.set(bid, snap.rate_bps as number);
        }
      }

      for (const b of brokerRows ?? []) {
        const rate = bestByBrokerId.get(b.id as number);
        if (rate != null) currentRateBpsBySlug[b.slug as string] = rate;
      }
    }
  }

  const items = rawItems.map((i) => ({
    ...i,
    current_rate_bps: currentRateBpsBySlug[i.item_slug] ?? null,
  }));

  const { data: alertPref } = await supabase
    .from("watchlist_alert_preferences")
    .select("alerts_opted_in")
    .eq("user_id", user.id)
    .maybeSingle();
  const alertsOptedIn = alertPref?.alerts_opted_in ?? false;

  return (
    <div className="py-6 md:py-10">
      <div className="container-custom max-w-3xl">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-3">
          <Link href="/account" className="hover:text-slate-900">
            ← My account
          </Link>
        </nav>
        <div className="flex items-baseline justify-between mb-5 flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Watchlist</h1>
            <p className="text-sm text-slate-500">
              {items.length === 0
                ? "No items yet"
                : `${items.length} item${items.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        <WatchlistAlertsToggle initialOptedIn={alertsOptedIn} hasItems={items.length > 0} />

        <WatchlistClient initialItems={items} householdEnabled={householdEnabled} />

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Email notifications</h2>
          <div className="space-y-4">
            <DigestToggle
              digestKey="watchlist_digest"
              label="Weekly watchlist digest"
              description="Get a weekly summary of price movements and news for items on your watchlist."
              initialEnabled={watchlistDigestEnabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
