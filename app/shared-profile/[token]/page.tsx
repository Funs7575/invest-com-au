/**
 * /shared-profile/[token]
 *
 * Public read-only view of an investor's shared profile snapshot. Anyone
 * with the link can view it — the token is the auth factor.
 *
 * The page renders the investor's goals, quiz result, watchlist, and latest
 * portfolio health score. It also links the viewer to /find-advisor to help
 * them find a match.
 *
 * Security: no user data is exposed beyond what the investor chose to include
 * when they generated the share link. consumed_at is stamped once on first view.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getProfileShare } from "@/lib/profile-share";
import type { InvestorGoals, QuizResult, HealthScore, WatchlistItem } from "@/lib/profile-share";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const result = await getProfileShare(token);
  if (!result) return { title: "Profile share not found — Invest.com.au" };
  const name = result.snapshot.goals?.display_name;
  return {
    title: name
      ? `${name}'s investor profile — Invest.com.au`
      : "Shared investor profile — Invest.com.au",
    description: "Read-only view of an investor's goals, quiz results and watchlist.",
    robots: { index: false, follow: false },
  };
}

export default async function SharedProfilePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await getProfileShare(token);
  if (!result) notFound();

  const { snapshot, wasConsumedPreviously, expiresAt } = result;
  const name = snapshot.goals?.display_name ?? "This investor";

  return (
    <main className="min-h-screen bg-slate-50 py-8 md:py-14">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <header className="mb-8">
          <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 mb-4 inline-block">
            ← Invest.com.au
          </Link>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            {name}&apos;s investor profile
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Read-only snapshot shared by the investor. Expires{" "}
            {new Date(expiresAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}.
          </p>
          {wasConsumedPreviously && (
            <p className="text-xs text-amber-600 mt-1.5">
              This link has been viewed before.
            </p>
          )}
        </header>

        <div className="space-y-4">
          {/* Goals */}
          <GoalsCard goals={snapshot.goals} />

          {/* Quiz */}
          {snapshot.quiz && <QuizCard quiz={snapshot.quiz} />}

          {/* Watchlist */}
          {snapshot.watchlist.length > 0 && <WatchlistCard items={snapshot.watchlist} />}

          {/* Health score */}
          {snapshot.health && <HealthCard health={snapshot.health} />}
        </div>

        {/* CTA */}
        <div className="mt-8 rounded-2xl bg-violet-50 border border-violet-100 p-5 md:p-7 text-center">
          <p className="text-sm text-slate-600 mb-4">
            Looking for the right advisor to work with this investor?
          </p>
          <Link
            href="/find-advisor"
            className="inline-block bg-violet-700 text-white font-bold px-6 py-3 rounded-xl hover:bg-violet-800 transition-colors text-sm"
          >
            Find a financial advisor →
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate-400 text-center">
          This is a read-only factual snapshot of investor preferences — not personal financial advice.
          <br />
          <Link href={`${SITE_URL}/privacy`} className="underline hover:text-slate-600">
            Privacy policy
          </Link>
        </p>
      </div>
    </main>
  );
}

function GoalsCard({ goals }: { goals: InvestorGoals | null }) {
  if (!goals) {
    return (
      <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Goals & profile</h2>
        <p className="text-sm text-slate-500">No profile data shared.</p>
      </section>
    );
  }

  const flags: string[] = [];
  if (goals.is_fhb) flags.push("First home buyer");
  if (goals.is_pre_retiree) flags.push("Pre-retiree");
  if (goals.is_business_owner) flags.push("Business owner");
  if (goals.is_cross_border) flags.push("Cross-border investor");
  if (goals.is_hnw) flags.push("High-net-worth");

  const BUDGET_LABELS: Record<string, string> = {
    small: "Up to $50K",
    medium: "$50K–$250K",
    large: "$250K–$1M",
    whale: "$1M+",
  };
  const EXP_LABELS: Record<string, string> = {
    beginner: "Beginner",
    intermediate: "Intermediate",
    pro: "Experienced",
  };

  return (
    <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800 mb-3">Goals & profile</h2>
      <dl className="space-y-2.5 text-sm">
        {goals.primary_vertical && (
          <div className="flex gap-3">
            <dt className="text-slate-500 w-36 shrink-0">Primary interest</dt>
            <dd className="font-medium text-slate-800 capitalize">{goals.primary_vertical}</dd>
          </div>
        )}
        {goals.budget_band && (
          <div className="flex gap-3">
            <dt className="text-slate-500 w-36 shrink-0">Investment size</dt>
            <dd className="font-medium text-slate-800">
              {BUDGET_LABELS[goals.budget_band] ?? goals.budget_band}
            </dd>
          </div>
        )}
        {goals.experience_level && (
          <div className="flex gap-3">
            <dt className="text-slate-500 w-36 shrink-0">Experience</dt>
            <dd className="font-medium text-slate-800">
              {EXP_LABELS[goals.experience_level] ?? goals.experience_level}
            </dd>
          </div>
        )}
        {flags.length > 0 && (
          <div className="flex gap-3">
            <dt className="text-slate-500 w-36 shrink-0">Characteristics</dt>
            <dd>
              <div className="flex flex-wrap gap-1.5">
                {flags.map((f) => (
                  <span
                    key={f}
                    className="text-xs bg-violet-50 text-violet-800 border border-violet-100 rounded-full px-2.5 py-0.5 font-medium"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

function QuizCard({ quiz }: { quiz: QuizResult }) {
  return (
    <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800 mb-3">Quiz result</h2>
      <dl className="space-y-2.5 text-sm">
        {quiz.inferred_vertical && (
          <div className="flex gap-3">
            <dt className="text-slate-500 w-36 shrink-0">Inferred focus</dt>
            <dd className="font-medium text-slate-800 capitalize">{quiz.inferred_vertical}</dd>
          </div>
        )}
        {quiz.top_match_slug && (
          <div className="flex gap-3">
            <dt className="text-slate-500 w-36 shrink-0">Top match</dt>
            <dd className="font-medium text-slate-800">{quiz.top_match_slug}</dd>
          </div>
        )}
        {quiz.completed_at && (
          <div className="flex gap-3">
            <dt className="text-slate-500 w-36 shrink-0">Completed</dt>
            <dd className="text-slate-600">
              {new Date(quiz.completed_at).toLocaleDateString("en-AU")}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

function WatchlistCard({ items }: { items: WatchlistItem[] }) {
  const grouped = items.reduce<Record<string, WatchlistItem[]>>((acc, item) => {
    const key = item.item_type;
    const existing = acc[key] ?? [];
    existing.push(item);
    acc[key] = existing;
    return acc;
  }, {});

  return (
    <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800 mb-3">
        Watchlist ({items.length} item{items.length !== 1 ? "s" : ""})
      </h2>
      <div className="space-y-3">
        {Object.entries(grouped).map(([type, group]) => (
          <div key={type}>
            <p className="text-xs uppercase tracking-wide text-slate-400 font-medium mb-1.5 capitalize">
              {type}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {group.map((item) => (
                <span
                  key={`${item.item_type}:${item.item_slug}`}
                  className="text-xs bg-slate-100 text-slate-700 rounded-full px-2.5 py-0.5 font-medium"
                >
                  {item.display_name ?? item.item_slug}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HealthCard({ health }: { health: HealthScore }) {
  const dimensions: { label: string; value: number; color: string }[] = [
    { label: "Diversification", value: health.diversification, color: "bg-violet-500" },
    { label: "Cost efficiency", value: health.cost, color: "bg-blue-500" },
    { label: "Risk alignment", value: health.risk_alignment, color: "bg-emerald-500" },
    { label: "Engagement", value: health.engagement, color: "bg-amber-500" },
  ];

  return (
    <section className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Portfolio health</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            As of {new Date(health.scored_month + "-01").toLocaleDateString("en-AU", { month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className="text-3xl font-extrabold text-slate-900">{health.overall}</span>
          <span className="text-sm text-slate-400 ml-1">/ 100</span>
        </div>
      </div>
      <div className="space-y-2.5">
        {dimensions.map((d) => (
          <div key={d.label} className="flex items-center gap-3 text-sm">
            <span className="text-slate-500 w-32 shrink-0">{d.label}</span>
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${d.color}`}
                style={{ width: `${Math.min(100, d.value)}%` }}
              />
            </div>
            <span className="text-slate-600 text-xs w-8 text-right tabular-nums">{d.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
