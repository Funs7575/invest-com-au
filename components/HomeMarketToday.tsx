import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import DealExpiryCountdown from "@/components/DealExpiryCountdown";

/**
 * "Today's market" — single homepage band combining the three former
 * market strips (HomeRateOfTheDay + InvestScoreGauge + RateChangesToday)
 * into one card: gauge left, standout rate + latest changes right.
 *
 * Each data source fails soft and independently; the band renders null
 * only when none of the three has anything to show. One compliance
 * footnote covers the whole band.
 */

const SEGMENT_COLORS = [
  "#ef4444", // Very Cautious  (0–25)
  "#f97316", // Cautious       (25–40)
  "#eab308", // Neutral        (40–55)
  "#22c55e", // Constructive   (55–70)
  "#10b981", // Positive       (70–85)
  "#06b6d4", // Very Positive  (85–100)
] as const;

function scoreColor(score: number): string {
  if (score < 25) return SEGMENT_COLORS[0];
  if (score < 40) return SEGMENT_COLORS[1];
  if (score < 55) return SEGMENT_COLORS[2];
  if (score < 70) return SEGMENT_COLORS[3];
  if (score < 85) return SEGMENT_COLORS[4];
  return SEGMENT_COLORS[5];
}

function needleTransform(score: number): string {
  const angle = (score / 100) * 180 - 90; // -90° = left, +90° = right
  return `rotate(${angle}, 100, 100)`;
}

interface ScoreData {
  score: number;
  label: string;
  components: {
    rateLevel?: number;
    rateMomentum?: number;
    platformActivity?: number;
    marketBreadth?: number;
  } | null;
}

interface RateOfTheDay {
  slug: string;
  name: string;
  valueDisplay: string;
  typeLabel: "rate" | "deal";
  dealText: string | null;
  dealExpiry: string | null;
}

interface ChangeRow {
  broker_slug: string;
  broker_name: string;
  product_kind: string;
  new_rate_bps: number;
  delta_bps: number;
  direction: "up" | "down" | "new";
  logged_at: string;
}

const PRODUCT_LABELS: Record<string, string> = {
  savings_account: "Savings",
  term_deposit: "Term Deposit",
};

function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(2) + "%";
}

async function fetchScore(): Promise<ScoreData | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("invest_score_daily")
      .select("score, label, components")
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return {
      score: data.score,
      label: data.label,
      components: data.components as ScoreData["components"],
    };
  } catch {
    return null;
  }
}

async function fetchRateOfTheDay(): Promise<RateOfTheDay | null> {
  try {
    const admin = createAdminClient();
    const { data: setting } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", "rate_of_the_day_broker_slug")
      .maybeSingle();
    if (!setting?.value) return null;

    const supabase = await createClient();
    const { data: broker } = await supabase
      .from("brokers")
      .select("slug, name, platform_type, asx_fee, deal, deal_text, deal_expiry")
      .eq("slug", setting.value)
      .eq("status", "active")
      .maybeSingle();
    if (!broker) return null;

    const isRateType =
      broker.platform_type === "savings_account" ||
      broker.platform_type === "term_deposit";
    return {
      slug: broker.slug,
      name: broker.name,
      valueDisplay: broker.asx_fee ?? "—",
      typeLabel: isRateType ? "rate" : "deal",
      dealText: broker.deal && broker.deal_text ? broker.deal_text : null,
      dealExpiry: broker.deal ? broker.deal_expiry : null,
    };
  } catch {
    return null;
  }
}

async function fetchChanges(): Promise<ChangeRow[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("rate_change_log")
      .select("broker_slug, broker_name, product_kind, new_rate_bps, delta_bps, direction, logged_at")
      .order("logged_at", { ascending: false })
      .limit(4);
    return (data ?? []) as ChangeRow[];
  } catch {
    return [];
  }
}

export default async function HomeMarketToday() {
  const [score, rateOfDay, changes] = await Promise.all([
    fetchScore(),
    fetchRateOfTheDay(),
    fetchChanges(),
  ]);

  if (!score && !rateOfDay && changes.length === 0) return null;

  const latestChange = changes[0];
  const dayLabel = latestChange
    ? new Date(latestChange.logged_at).toLocaleDateString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })
    : "Rates, deals and the Invest Score";

  return (
    <section className="container-custom my-6">
      <div className="bg-white border border-slate-200" style={{ borderRadius: 16, overflow: "hidden" }}>
        <div
          className="border-b border-slate-100"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", gap: 12, flexWrap: "wrap" }}
        >
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-ink-400)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Today&apos;s market
            </span>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink-900)", margin: "2px 0 0" }}>
              {dayLabel}
            </h2>
          </div>
          <Link href="/rates/today" style={{ fontSize: 12, fontWeight: 600, color: "var(--color-blue-700)", textDecoration: "none" }}>
            All rate changes →
          </Link>
        </div>

        <div className="home-market-grid" style={{ display: "grid", gridTemplateColumns: score ? "auto 1fr" : "1fr", gap: 0 }}>
          {score && (
            <div
              className="home-market-gauge md:border-r border-slate-100"
              style={{ padding: "16px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}
            >
              <svg
                viewBox="0 0 200 110"
                width={150}
                height={83}
                aria-label={`Invest Score: ${Math.round(score.score)} — ${score.label}`}
                role="img"
              >
                <path
                  d="M 15 100 A 85 85 0 0 1 185 100"
                  fill="none"
                  stroke="rgba(148,163,184,0.25)"
                  strokeWidth={16}
                  strokeLinecap="round"
                />
                <path
                  d="M 15 100 A 85 85 0 0 1 185 100"
                  fill="none"
                  stroke={scoreColor(score.score)}
                  strokeWidth={16}
                  strokeLinecap="round"
                  strokeDasharray={`${(score.score / 100) * 267} 267`}
                />
                <line
                  x1="100"
                  y1="100"
                  x2="100"
                  y2="22"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  transform={needleTransform(score.score)}
                />
                <circle cx="100" cy="100" r="5" fill="currentColor" />
                <text x="100" y="90" fontSize="22" fontWeight="700" fill="currentColor" textAnchor="middle">
                  {Math.round(score.score)}
                </text>
              </svg>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-ink-900)", textAlign: "center" }}>
                The Invest Score
                <span style={{ marginLeft: 6, color: scoreColor(score.score) }}>{score.label}</span>
              </div>
              <Link
                href="/methodology/invest-score"
                style={{ fontSize: 10.5, color: "var(--color-ink-400)", textDecoration: "underline", textUnderlineOffset: 2 }}
              >
                How it&apos;s calculated
              </Link>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            {rateOfDay && (
              <Link
                href={`/broker/${rateOfDay.slug}`}
                className="border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50"
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", textDecoration: "none", flexWrap: "wrap" }}
              >
                <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>⭐</span>
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#b45309" }}>
                  Today&apos;s standout {rateOfDay.typeLabel}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--color-ink-900)" }}>{rateOfDay.name}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "#047857" }}>{rateOfDay.valueDisplay}</span>
                {rateOfDay.dealText && (
                  <span style={{ fontSize: 11, color: "var(--color-ink-500)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>
                    {rateOfDay.dealText}
                  </span>
                )}
                {rateOfDay.dealExpiry && <DealExpiryCountdown dealExpiry={rateOfDay.dealExpiry} variant="standard" />}
                <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 700, color: "#b45309" }}>View →</span>
              </Link>
            )}

            {changes.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", flex: 1 }}>
                {changes.map((c, i) => {
                  const isUp = c.direction === "up";
                  const isNew = c.direction === "new";
                  const accentColor = isUp ? "#16a34a" : isNew ? "#1d4ed8" : "#dc2626";
                  const accentBg = isUp ? "rgba(22,163,74,.12)" : isNew ? "rgba(29,78,216,.12)" : "rgba(220,38,38,.12)";
                  const arrow = isUp ? "↑" : isNew ? "★" : "↓";
                  const productLabel = PRODUCT_LABELS[c.product_kind] ?? c.product_kind;
                  const brokerPath =
                    c.product_kind === "savings_account" || c.product_kind === "term_deposit"
                      ? `/savings/${c.broker_slug}`
                      : `/broker/${c.broker_slug}`;
                  return (
                    <Link
                      key={`${c.broker_slug}-${c.product_kind}-${i}`}
                      href={brokerPath}
                      className={i < changes.length - 1 ? "border-r border-slate-100" : undefined}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", textDecoration: "none" }}
                    >
                      <span
                        style={{
                          fontSize: 15,
                          color: accentColor,
                          background: accentBg,
                          width: 26,
                          height: 26,
                          borderRadius: 99,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          fontWeight: 700,
                        }}
                      >
                        {arrow}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-ink-800)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {c.broker_name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--color-ink-400)", marginTop: 1 }}>
                          {productLabel} ·{" "}
                          <span style={{ color: accentColor, fontWeight: 600 }}>
                            {isNew ? bpsToPercent(c.new_rate_bps) : (isUp ? "+" : "") + bpsToPercent(c.delta_bps)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <p
          className="border-t border-slate-100"
          style={{ fontSize: 10, color: "var(--color-ink-400)", margin: 0, padding: "8px 20px", lineHeight: 1.4 }}
        >
          General information only — a composite of public market signals, not a buy/sell signal.
          Rates and offers change; verify with the provider before making any decision.
        </p>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .home-market-grid { grid-template-columns: 1fr !important; }
          .home-market-gauge { border-right: none !important; border-bottom: 1px solid #f1f5f9; }
        }
      `}</style>
    </section>
  );
}
