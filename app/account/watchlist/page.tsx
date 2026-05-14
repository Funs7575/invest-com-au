import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInvestorProfile } from "@/lib/investor-profiles";
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
    redirect("/account/login?redirect=/account/watchlist");
  }

  const [watchlistRes, investorProfile] = await Promise.all([
    supabase
      .from("user_watchlist_items")
      .select("id, item_type, item_slug, display_name, added_at")
      .eq("user_id", user.id)
      .order("added_at", { ascending: false }),
    getInvestorProfile(user.id),
  ]);

  const { data } = watchlistRes;
  const digestMeta = investorProfile?.meta ?? {};
  const watchlistDigestEnabled = digestMeta.watchlist_digest === true;

  const items = (data ?? []).map((row) => ({
    id: row.id as number,
    item_type: row.item_type as string,
    item_slug: row.item_slug as string,
    display_name: row.display_name as string | null,
    added_at: row.added_at as string,
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
        <nav className="text-xs text-slate-500 mb-3">
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

        <WatchlistClient initialItems={items} />

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
