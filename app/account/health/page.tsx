import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { computeUserHealthScore, type HealthScoreInput } from "@/lib/user-health-score";
import { computeCurrentStreak } from "@/lib/streak";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import PortfolioStressTest from "@/components/PortfolioStressTest";
import EtfOverlapDetector from "@/components/EtfOverlapDetector";

export const metadata: Metadata = {
  title: "Financial Health Score | Invest.com.au",
  description: "A factual snapshot of your investing activity: diversification, costs, goal progress, and engagement.",
  robots: { index: false },
};

const GRADE_CONFIG = {
  A: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", label: "Excellent" },
  B: { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe", label: "Good" },
  C: { color: "#d97706", bg: "#fffbeb", border: "#fde68a", label: "Fair" },
  D: { color: "#ea580c", bg: "#fff7ed", border: "#fed7aa", label: "Needs attention" },
  E: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "Getting started" },
} as const;

const SUB_SCORE_INFO = {
  diversification: { label: "Diversification", desc: "Based on your holdings count, exchange spread, and concentration." },
  cost:            { label: "Cost efficiency",  desc: "Based on the fee levels of brokers you've shortlisted." },
  riskAlignment:   { label: "Risk alignment",   desc: "Based on your experience level, goals, and progress." },
  engagement:      { label: "Engagement",       desc: "Based on how consistently you're staying informed." },
};

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div style={{ height: 8, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 99, transition: "width 0.6s ease" }} />
    </div>
  );
}

export default async function AccountHealthPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // eslint-disable-next-line react-hooks/purity
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

  const [
    { data: holdings },
    { data: profile },
    { data: goals },
    { data: shortlistedBrokers },
    { data: checkins },
    { data: previousScore },
  ] = await Promise.all([
    supabase.from("investor_holdings").select("ticker, exchange, cost_basis_per_share_cents, shares").eq("auth_user_id", user.id),
    supabase.from("investor_profiles").select("experience_level").eq("auth_user_id", user.id).maybeSingle(),
    supabase.from("investor_goals").select("target_cents, current_balance_cents").eq("auth_user_id", user.id),
    supabase.from("user_shortlisted_brokers").select("broker_slug").eq("user_id", user.id).limit(10),
    supabase.from("user_daily_checkins").select("check_in_date, streak_count").eq("user_id", user.id).gte("check_in_date", thirtyDaysAgo).order("check_in_date", { ascending: false }),
    supabase.from("user_health_score_log").select("overall, diversification, cost, risk_alignment, engagement, scored_month").eq("user_id", user.id).order("scored_month", { ascending: false }).limit(2),
  ]);

  // Compute diversification inputs
  const holdingsList = holdings ?? [];
  const holdingCount = holdingsList.length;
  const distinctExchanges = new Set(holdingsList.map((h) => h.exchange).filter(Boolean)).size;

  let maxConcentrationPct = 0;
  if (holdingCount > 0) {
    const totalValue = holdingsList.reduce((sum, h) => {
      return sum + (Number(h.cost_basis_per_share_cents ?? 0) * Number(h.shares ?? 0));
    }, 0);
    if (totalValue > 0) {
      const values = holdingsList.map((h) => Number(h.cost_basis_per_share_cents ?? 0) * Number(h.shares ?? 0));
      maxConcentrationPct = Math.round((Math.max(...values) / totalValue) * 100);
    }
  }

  // Compute cost input: broker fee score (lower fee = higher score)
  // asx_fee_value typical range: $0 (free) to $30+. Map to 0-100.
  let avgFeeScore: number | null = null;
  if (shortlistedBrokers && shortlistedBrokers.length > 0) {
    const slugs = shortlistedBrokers.map((b) => b.broker_slug);
    const { data: brokerData } = await supabase
      .from("brokers")
      .select("asx_fee_value")
      .in("slug", slugs)
      .eq("status", "active");
    const fees = (brokerData ?? []).map((b) => Number(b.asx_fee_value ?? 30)).filter((f) => !isNaN(f));
    if (fees.length > 0) {
      const avg = fees.reduce((a, b) => a + b, 0) / fees.length;
      // Map: $0 → 100, $30+ → 0, linear
      avgFeeScore = Math.round(Math.max(0, 100 - (avg / 30) * 100));
    }
  }

  // Goals
  const goalsList = goals ?? [];
  const hasGoals = goalsList.length > 0;
  let goalProgressPct: number | null = null;
  if (hasGoals) {
    const progresses = goalsList
      .filter((g) => g.target_cents && Number(g.target_cents) > 0)
      .map((g) => Math.min(100, Math.round((Number(g.current_balance_cents ?? 0) / Number(g.target_cents!)) * 100)));
    if (progresses.length > 0) goalProgressPct = Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length);
  }

  // Engagement
  const checkinList = (checkins ?? []) as { check_in_date: string; streak_count: number }[];
  const activeCheckinsLast30d = checkinList.length;
  const todayIso = new Date().toISOString().slice(0, 10);
  const currentStreak = computeCurrentStreak(checkinList, todayIso);

  const input: HealthScoreInput = {
    holdingCount,
    distinctExchanges,
    maxConcentrationPct,
    avgFeeScore,
    experienceLevel: (profile?.experience_level as HealthScoreInput["experienceLevel"]) ?? null,
    hasGoals,
    goalProgressPct,
    activeCheckinsLast30d,
    currentStreak,
  };

  const score = computeUserHealthScore(input);
  const cfg = GRADE_CONFIG[score.grade];

  // Previous month score for delta
  const prev = (previousScore ?? [])[1] as { overall: number } | undefined;
  const delta = prev ? score.overall - prev.overall : null;

  const subScores: [keyof typeof SUB_SCORE_INFO, number][] = [
    ["diversification", score.diversification],
    ["cost",            score.cost],
    ["riskAlignment",   score.riskAlignment],
    ["engagement",      score.engagement],
  ];

  return (
    <div style={{ background: "var(--color-ink-50)", minHeight: "100vh", paddingTop: 40, paddingBottom: 64 }}>
      <div className="container-custom" style={{ maxWidth: 700 }}>

        <nav style={{ fontSize: 12, color: "var(--color-ink-400)", marginBottom: 24 }}>
          <Link href="/account" style={{ color: "var(--color-ink-400)", textDecoration: "none" }}>Account</Link>
          <span style={{ margin: "0 6px" }}>/</span>
          <span style={{ color: "var(--color-ink-600)" }}>Health Score</span>
        </nav>

        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-ink-900)", marginBottom: 4 }}>Your financial health score</h1>
        <p style={{ fontSize: 13, color: "var(--color-ink-500)", marginBottom: 28 }}>
          A factual snapshot based on your data — diversification, costs, goals, and engagement.
        </p>

        {/* Overall score card */}
        <div className="iv2-card" style={{ padding: 28, marginBottom: 20, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
          <div style={{ width: 88, height: 88, borderRadius: 99, border: `4px solid ${cfg.color}`, background: cfg.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: cfg.color, lineHeight: 1 }}>{score.grade}</span>
            <span style={{ fontSize: 11, color: cfg.color, fontWeight: 600 }}>{score.overall}/100</span>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: "var(--color-ink-900)" }}>{cfg.label}</span>
              {delta !== null && (
                <span style={{ fontSize: 12, fontWeight: 700, color: delta >= 0 ? "#16a34a" : "#dc2626", background: delta >= 0 ? "#f0fdf4" : "#fef2f2", border: `1px solid ${delta >= 0 ? "#bbf7d0" : "#fecaca"}`, borderRadius: 6, padding: "2px 7px" }}>
                  {delta > 0 ? "+" : ""}{delta} vs last month
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: "var(--color-ink-500)", marginTop: 4, marginBottom: 0 }}>
              Overall score across 4 dimensions of your investing profile.
            </p>
          </div>
        </div>

        {/* Sub-score bars */}
        <div className="iv2-card" style={{ padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink-900)", marginBottom: 16 }}>Score breakdown</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {subScores.map(([key, val]) => {
              const info = SUB_SCORE_INFO[key];
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-800)" }}>{info.label}</span>
                      <span style={{ fontSize: 11, color: "var(--color-ink-400)", marginLeft: 8 }}>{info.desc}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: val >= 75 ? "#16a34a" : val >= 50 ? "#2563eb" : "#dc2626", flexShrink: 0, marginLeft: 8 }}>{val}</span>
                  </div>
                  <ScoreBar score={val} color={val >= 75 ? "#16a34a" : val >= 50 ? "#2563eb" : "#dc2626"} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Improvement prompts */}
        <div className="iv2-card" style={{ padding: 24, marginBottom: 20 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink-900)", marginBottom: 12 }}>Add more data to improve your score</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {holdingCount === 0 && (
              <Link href="/account/holdings" style={{ fontSize: 13, color: "var(--color-blue-700)", textDecoration: "none" }}>→ Add your holdings to see your diversification score</Link>
            )}
            {!hasGoals && (
              <Link href="/account/goals" style={{ fontSize: 13, color: "var(--color-blue-700)", textDecoration: "none" }}>→ Set an investment goal to improve your risk alignment score</Link>
            )}
            {avgFeeScore === null && (
              <Link href="/shortlist" style={{ fontSize: 13, color: "var(--color-blue-700)", textDecoration: "none" }}>→ Shortlist brokers to get your cost efficiency score</Link>
            )}
            {activeCheckinsLast30d < 5 && (
              <Link href="/feed" style={{ fontSize: 13, color: "var(--color-blue-700)", textDecoration: "none" }}>→ Check the advisor feed regularly to boost your engagement score</Link>
            )}
          </div>
        </div>

        <p style={{ fontSize: 11, color: "var(--color-ink-400)", lineHeight: 1.5 }}>
          {GENERAL_ADVICE_WARNING} Your health score is a factual summary of the data you&apos;ve shared — not a recommendation or advice about your financial situation.
        </p>

        {/* Portfolio analysis tools */}
        <div className="iv2-card" style={{ padding: 24, marginTop: 20 }}>
          <PortfolioStressTest />
        </div>

        <div className="iv2-card" style={{ padding: 24, marginTop: 12 }}>
          <EtfOverlapDetector />
        </div>

        <div style={{ marginTop: 12, padding: 24 }} className="iv2-card">
          <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink-900)", marginBottom: 8 }}>
            More tools
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Link href="/tools/dividend-calendar" style={{ fontSize: 13, color: "var(--color-blue-700)", textDecoration: "none" }}>
              → ETF Dividend Calendar — track upcoming ex-dates and distribution payments
            </Link>
            <Link href="/tools/etf-overlap" style={{ fontSize: 13, color: "var(--color-blue-700)", textDecoration: "none" }}>
              → ETF Overlap Detector — standalone tool with full holdings table
            </Link>
            <Link href="/tools/portfolio-stress-test" style={{ fontSize: 13, color: "var(--color-blue-700)", textDecoration: "none" }}>
              → Portfolio Stress Test — standalone tool with allocation export
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
