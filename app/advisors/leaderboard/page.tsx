import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";
import Icon from "@/components/Icon";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const monthLabel = new Date().toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return {
    title: `Top Advisors Leaderboard — ${monthLabel} | Invest.com.au`,
    description:
      "Australia's top-ranked financial advisors: scored on client ratings, response time, community contribution, and profile completeness — updated monthly.",
    alternates: { canonical: "/advisors/leaderboard" },
    openGraph: {
      title: "Top Advisors Leaderboard",
      description: "Monthly rankings for Australia's most active and highly-rated financial advisors.",
      images: [{ url: "/api/og?title=Top+Advisors+Leaderboard&subtitle=Monthly+Rankings&type=default", width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image" },
  };
}

type LeaderboardEntry = {
  rank: number;
  score: number;
  review_count: number;
  avg_rating: number | null;
  badge_count: number;
  response_score: number;
  profile_score: number;
  year_month: string;
  forum_answers_count: number;
  post_engagement_score: number;
  brief_completions_count: number;
  professional: {
    id: number;
    name: string;
    slug: string;
    photo_url: string | null;
    type: string;
    location_display: string | null;
    verified: boolean;
    firm_name: string | null;
  };
};

function getCurrentYearMonth(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatYearMonth(ym: string): string {
  const [year, month] = ym.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

function nextMonthLabel(ym: string): string {
  const [year, month] = ym.split("-");
  const date = new Date(Number(year), Number(month), 1);
  return date.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-amber-400 text-slate-900 font-extrabold text-lg shadow-md">1</span>;
  if (rank === 2) return <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-400 text-white font-extrabold text-lg shadow-md">2</span>;
  if (rank === 3) return <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-amber-700 text-white font-extrabold text-lg shadow-md">3</span>;
  return <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold text-sm">{rank}</span>;
}

function Avatar({ src, name, size }: { src: string | null; name: string; size: number }) {
  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-extrabold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const ym = getCurrentYearMonth();

  const proJoin = `professional:professionals!advisor_leaderboard_monthly_professional_id_fkey(
         id, name, slug, photo_url, type, location_display, verified, firm_name
       )`;

  // Community-signal columns ship with the ecosystem migration — fall back
  // to the legacy column set if they don't exist yet.
  const extendedResult = await supabase
    .from("advisor_leaderboard_monthly")
    .select(
      `rank, score, review_count, avg_rating, badge_count, response_score, profile_score, year_month,
       forum_answers_count, post_engagement_score, brief_completions_count, ${proJoin}`,
    )
    .eq("year_month", ym)
    .order("rank", { ascending: true })
    .limit(20);

  let rows: unknown[] = extendedResult.data ?? [];
  if (extendedResult.error) {
    const legacyResult = await supabase
      .from("advisor_leaderboard_monthly")
      .select(
        `rank, score, review_count, avg_rating, badge_count, response_score, profile_score, year_month, ${proJoin}`,
      )
      .eq("year_month", ym)
      .order("rank", { ascending: true })
      .limit(20);
    rows = legacyResult.data ?? [];
  }

  type RawRow = Record<string, unknown> & { professional: unknown };
  const entries: LeaderboardEntry[] = (rows as RawRow[]).flatMap((row) => {
    if (!row.professional || Array.isArray(row.professional)) return [];
    return [{
      rank: row.rank as number,
      score: row.score as number,
      review_count: row.review_count as number,
      avg_rating: row.avg_rating as number | null,
      badge_count: row.badge_count as number,
      response_score: row.response_score as number,
      profile_score: row.profile_score as number,
      year_month: row.year_month as string,
      forum_answers_count: (row.forum_answers_count as number | undefined) ?? 0,
      post_engagement_score: (row.post_engagement_score as number | undefined) ?? 0,
      brief_completions_count: (row.brief_completions_count as number | undefined) ?? 0,
      professional: row.professional as LeaderboardEntry["professional"],
    }];
  });

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor", url: absoluteUrl("/advisors") },
    { name: "Leaderboard" },
  ]);

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  const leaderboardFaq = faqJsonLd([
    {
      q: "How are advisors ranked on the leaderboard?",
      a: "Advisors are ranked using a composite monthly score that combines verified client ratings and review count, response time to enquiries, profile completeness, earned platform badges, and community contribution — answering investor questions on the forum, engagement with their published insights, and completed squad briefs. The score resets on the 1st of each month.",
    },
    {
      q: "What criteria determine an advisor's ranking?",
      a: "The ranking algorithm weighs five factors: client ratings and review count, CPD hours and professional development activity, response time to client enquiries, profile completeness and verifications, and earned badges. Advisors who keep their profiles up to date, respond quickly, and accumulate genuine client reviews naturally score higher.",
    },
    {
      q: "Are the top-ranked advisors the best choice for me?",
      a: "A high leaderboard rank indicates strong platform engagement, client satisfaction, and professional development — but the best advisor for you also depends on your personal goals, location, and the specialist area you need (e.g. SMSF, retirement planning, or property investment). Use the leaderboard as a starting point, then review individual advisor profiles before reaching out.",
    },
    {
      q: "How can advisors improve their ranking?",
      a: "Advisors can improve their ranking by asking satisfied clients to leave verified reviews on invest.com.au, completing CPD hours, filling out their profile completely (including photo, bio, and credentials), responding promptly to new client enquiries, and earning platform badges for verified qualifications and experience milestones.",
    },
    {
      q: "Are all advisors on the leaderboard verified?",
      a: "Yes — only verified advisors registered on invest.com.au are included in the monthly leaderboard. Verification includes confirming AFSL authorisation details and identity. Advisors displaying the 'Verified' badge have completed invest.com.au's additional profile verification process.",
    },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {leaderboardFaq && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(leaderboardFaq) }} />}

      {/* Hero */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-400 py-14 px-4">
        <div className="max-w-3xl mx-auto text-center text-white">
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            <Icon name="star" size={14} className="text-yellow-300" />
            <span>{formatYearMonth(ym)} Leaderboard</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-3 tracking-tight">
            Top Advisors
          </h1>
          <p className="text-teal-100 text-lg max-w-xl mx-auto">
            Earn your rank through client leads, CPD hours, and genuine client ratings. Rankings update every month.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {entries.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                <Icon name="award" size={32} className="text-amber-500" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Rankings update monthly</h2>
            <p className="text-slate-500">
              Check back in {nextMonthLabel(ym)} for the latest results.
            </p>
          </div>
        ) : (
          <>
            {/* Podium — top 3 */}
            {podium.length > 0 && (
              <div className="mb-10">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-5 text-center">Top Performers</h2>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch">
                  {podium.map((entry) => {
                    const typeLabel = PROFESSIONAL_TYPE_LABELS[entry.professional.type as keyof typeof PROFESSIONAL_TYPE_LABELS] || entry.professional.type;
                    return (
                      <Link
                        key={entry.professional.id}
                        href={`/advisor/${entry.professional.slug}`}
                        className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col items-center text-center hover:shadow-md hover:border-teal-300 transition-all group"
                      >
                        <div className="mb-2">
                          <RankBadge rank={entry.rank} />
                        </div>
                        <Avatar src={entry.professional.photo_url} name={entry.professional.name} size={72} />
                        <div className="mt-3">
                          <div className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors leading-snug">{entry.professional.name}</div>
                          {entry.professional.firm_name && (
                            <div className="text-xs text-slate-500 mt-0.5">{entry.professional.firm_name}</div>
                          )}
                          <div className="mt-1.5 inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-xs font-medium px-2.5 py-0.5 rounded-full">
                            {typeLabel}
                          </div>
                          {entry.professional.location_display && (
                            <div className="text-xs text-slate-500 mt-1">{entry.professional.location_display}</div>
                          )}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 w-full flex justify-around text-center">
                          <div>
                            <div className="text-lg font-extrabold text-slate-900">{entry.score}</div>
                            <div className="text-[0.62rem] text-slate-500">Score</div>
                          </div>
                          {entry.avg_rating != null && (
                            <div>
                              <div className="text-lg font-extrabold text-amber-500">{Number(entry.avg_rating).toFixed(1)}</div>
                              <div className="text-[0.62rem] text-slate-500">Rating</div>
                            </div>
                          )}
                          <div>
                            <div className="text-lg font-extrabold text-slate-900">{entry.badge_count}</div>
                            <div className="text-[0.62rem] text-slate-500">Badges</div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rest of top 20 */}
            {rest.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                  <h2 className="text-sm font-semibold text-slate-600">Positions 4–{entries.length}</h2>
                </div>
                <ul className="divide-y divide-slate-100">
                  {rest.map((entry) => {
                    const typeLabel = PROFESSIONAL_TYPE_LABELS[entry.professional.type as keyof typeof PROFESSIONAL_TYPE_LABELS] || entry.professional.type;
                    return (
                      <li key={entry.professional.id}>
                        <Link
                          href={`/advisor/${entry.professional.slug}`}
                          className="flex items-center gap-4 px-5 py-3.5 hover:bg-teal-50/40 transition-colors group"
                        >
                          <div className="shrink-0 w-9 flex justify-center">
                            <RankBadge rank={entry.rank} />
                          </div>
                          <Avatar src={entry.professional.photo_url} name={entry.professional.name} size={40} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-slate-900 group-hover:text-teal-700 transition-colors">{entry.professional.name}</span>
                              {entry.professional.verified && (
                                <span className="text-[0.6rem] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Verified</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>{typeLabel}</span>
                              {entry.professional.location_display && (
                                <>
                                  <span className="text-slate-300">·</span>
                                  <span>{entry.professional.location_display}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-5 text-right text-xs">
                            <div className="hidden sm:block">
                              <div className="font-bold text-slate-700">{entry.badge_count}</div>
                              <div className="text-[0.6rem] text-slate-500">Badges</div>
                            </div>
                            {entry.avg_rating != null && (
                              <div className="hidden sm:block">
                                <div className="font-bold text-amber-500">{Number(entry.avg_rating).toFixed(1)}</div>
                                <div className="text-[0.6rem] text-slate-500">Rating</div>
                              </div>
                            )}
                            <div>
                              <div className="font-extrabold text-teal-600">{entry.score}</div>
                              <div className="text-[0.6rem] text-slate-500">Score</div>
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Community contribution highlights — only when signals exist */}
            {entries.some((e) => e.forum_answers_count > 0 || e.post_engagement_score > 0 || e.brief_completions_count > 0) && (
              <div className="mt-8 bg-white border border-slate-200 rounded-2xl p-6">
                <h2 className="text-sm font-bold text-slate-900 mb-1">Community contribution this month</h2>
                <p className="text-xs text-slate-500 mb-4">
                  Engagement counts toward the score — answering investor questions, publishing insights, and completing squad briefs.
                </p>
                <ul className="space-y-2">
                  {entries
                    .filter((e) => e.forum_answers_count > 0 || e.post_engagement_score > 0 || e.brief_completions_count > 0)
                    .slice(0, 5)
                    .map((e) => (
                      <li key={e.professional.id} className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <Link href={`/advisor/${e.professional.slug}`} className="font-semibold text-slate-800 hover:text-teal-700">
                          {e.professional.name}
                        </Link>
                        {e.forum_answers_count > 0 && (
                          <span className="bg-teal-50 text-teal-700 border border-teal-100 rounded-full px-2 py-0.5">
                            {e.forum_answers_count} forum answer{e.forum_answers_count === 1 ? "" : "s"}
                          </span>
                        )}
                        {e.post_engagement_score > 0 && (
                          <span className="bg-violet-50 text-violet-700 border border-violet-100 rounded-full px-2 py-0.5">
                            {e.post_engagement_score} post reaction{e.post_engagement_score === 1 ? "" : "s"}
                          </span>
                        )}
                        {e.brief_completions_count > 0 && (
                          <span className="bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-2 py-0.5">
                            {e.brief_completions_count} brief{e.brief_completions_count === 1 ? "" : "s"} completed
                          </span>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* How ranking works */}
            <div className="mt-10 bg-teal-50 border border-teal-200 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-teal-900 mb-2">How rankings are calculated</h2>
              <ul className="text-sm text-teal-800 space-y-1.5 list-disc list-inside">
                <li>Client ratings and review count</li>
                <li>CPD hours and professional development</li>
                <li>Response time to client enquiries</li>
                <li>Profile completeness and verifications</li>
                <li>Earned badges and platform activity</li>
                <li>Community contribution — forum answers, insight-post engagement, completed squad briefs</li>
              </ul>
              <p className="text-xs text-teal-600 mt-3">
                Rankings reset on the 1st of each month. Only verified advisors on invest.com.au are included.
                The score measures platform engagement and client satisfaction — it is not a rating of advice
                quality, and a high rank is not a recommendation for your circumstances.
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
