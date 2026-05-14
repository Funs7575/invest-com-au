import type { Metadata } from "next";

import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("admin:pro-affiliate");

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pro affiliate program — Admin",
  robots: "noindex, nofollow",
};

interface LeaderboardRow {
  pro_slug: string;
  pro_kind: "professional" | "team";
  credits_earned: number;
}

async function loadOverview(): Promise<{
  leaderboard: LeaderboardRow[];
  totalClicksToday: number;
  conversionRate: number;
}> {
  const admin = createAdminClient();
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [creditsRes, clicksTodayRes, signupsTodayRes] = await Promise.all([
      admin
        .from("pro_affiliate_credits")
        .select("pro_slug, pro_kind, credits_awarded"),
      admin
        .from("pro_affiliate_clicks")
        .select("id", { count: "exact", head: true })
        .gte("clicked_at", since),
      admin
        .from("pro_affiliate_clicks")
        .select("id", { count: "exact", head: true })
        .gte("clicked_at", since)
        .not("attributed_user_id", "is", null),
    ]);

    // Aggregate credits in memory — table is small and pre-aggregation
    // would need a Postgres function. Build the top-10 sorted by total.
    const totals = new Map<string, LeaderboardRow>();
    for (const row of (creditsRes.data ?? []) as {
      pro_slug?: string;
      pro_kind?: "professional" | "team";
      credits_awarded?: number;
    }[]) {
      if (!row.pro_slug || !row.pro_kind) continue;
      const key = `${row.pro_slug}|${row.pro_kind}`;
      const existing = totals.get(key) ?? {
        pro_slug: row.pro_slug,
        pro_kind: row.pro_kind,
        credits_earned: 0,
      };
      existing.credits_earned += Number(row.credits_awarded ?? 0);
      totals.set(key, existing);
    }
    const leaderboard = Array.from(totals.values())
      .sort((a, b) => b.credits_earned - a.credits_earned)
      .slice(0, 10);

    const totalClicksToday = Number(clicksTodayRes.count ?? 0);
    const signupsToday = Number(signupsTodayRes.count ?? 0);
    const conversionRate =
      totalClicksToday > 0 ? signupsToday / totalClicksToday : 0;

    return { leaderboard, totalClicksToday, conversionRate };
  } catch (err) {
    log.warn("loadOverview failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return { leaderboard: [], totalClicksToday: 0, conversionRate: 0 };
  }
}

export default async function AdminProAffiliatePage() {
  const { leaderboard, totalClicksToday, conversionRate } = await loadOverview();

  return (
    <main className="px-6 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Pro affiliate program</h1>
      <p className="text-sm text-slate-500 mt-1">
        Overview of share-link performance and credit awards.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-slate-500 text-sm">Clicks today</p>
          <p className="text-2xl font-bold text-amber-600">{totalClicksToday}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-slate-500 text-sm">Conversion rate (24h)</p>
          <p className="text-2xl font-bold text-emerald-600">
            {(conversionRate * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-slate-500 text-sm">Tracked pros</p>
          <p className="text-2xl font-bold text-slate-900">{leaderboard.length}</p>
        </div>
      </div>

      <section className="mt-8 bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">
            Top 10 pros by credits earned
          </h2>
        </div>
        {leaderboard.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">
            No credit awards yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2">#</th>
                <th className="text-left px-4 py-2">Pro</th>
                <th className="text-left px-4 py-2">Kind</th>
                <th className="text-right px-4 py-2">Credits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {leaderboard.map((row, idx) => (
                <tr key={`${row.pro_slug}-${row.pro_kind}`}>
                  <td className="px-4 py-2 text-slate-500">{idx + 1}</td>
                  <td className="px-4 py-2 font-medium text-slate-900">
                    {row.pro_slug}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{row.pro_kind}</td>
                  <td className="px-4 py-2 text-right font-semibold text-emerald-600">
                    {row.credits_earned}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
