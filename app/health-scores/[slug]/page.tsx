import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import { absoluteUrl, breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import type { Broker, BrokerHealthScore, BrokerHealthScoreHistory } from "@/lib/types";
import {
  summariseTrend,
  normaliseSparklinePoints,
  formatDelta,
} from "@/lib/health-score-trends";

export const revalidate = 3600;

/* ─── Dimension config (mirrors HealthScoresClient) ─── */

const DIMENSIONS = [
  {
    key: "regulatory_score" as const,
    label: "Regulatory",
    weight: 0.25,
    noteKey: "regulatory_notes" as const,
    description:
      "AFSL licensing status, regulatory history, breach disclosures, and compliance with ASIC guidance.",
  },
  {
    key: "client_money_score" as const,
    label: "Client Money",
    weight: 0.25,
    noteKey: "client_money_notes" as const,
    description:
      "How client funds are segregated and protected — CHESS sponsorship, trust accounts, and financial-product holdings.",
  },
  {
    key: "financial_stability_score" as const,
    label: "Financial Stability",
    weight: 0.20,
    noteKey: "financial_stability_notes" as const,
    description:
      "Corporate solvency, NTA buffers, parent-entity support, auditor opinions, and public financial disclosures.",
  },
  {
    key: "platform_reliability_score" as const,
    label: "Platform Reliability",
    weight: 0.15,
    noteKey: "platform_reliability_notes" as const,
    description:
      "Historical uptime, outage frequency, disaster-recovery provisions, and reported system incidents.",
  },
  {
    key: "insurance_score" as const,
    label: "Insurance",
    weight: 0.15,
    noteKey: "insurance_notes" as const,
    description:
      "Professional indemnity, cyber-liability, and other insurance coverage relevant to retail investor protection.",
  },
] as const;

/* ─── SVG score gauge (server-renderable, no client state) ─── */

function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 16) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = (score / 100) * circumference;
  const gaugeColor =
    score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Health score: ${score} out of 100`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="10"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={gaugeColor}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${progress} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2}
        y={size / 2 - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-2xl font-extrabold"
        fill="#0f172a"
      >
        {score}
      </text>
      <text
        x={size / 2}
        y={size / 2 + 18}
        textAnchor="middle"
        className="text-[10px] font-medium"
        fill="#94a3b8"
      >
        / 100
      </text>
    </svg>
  );
}

/* ─── SVG sparkline (server-renderable, no client deps) ─── */

function ScoreSparkline({
  history,
  width = 200,
  height = 48,
}: {
  history: readonly BrokerHealthScoreHistory[];
  width?: number;
  height?: number;
}) {
  const points = normaliseSparklinePoints(history);
  if (points.length < 2) return null;

  const pad = 4;
  const plotW = width - pad * 2;
  const plotH = height - pad * 2;

  const coords = points.map((y, i) => {
    const x = pad + (i / (points.length - 1)) * plotW;
    // y=0 is bottom, SVG y=0 is top → invert
    const svgY = pad + (1 - y) * plotH;
    return `${x},${svgY}`;
  });

  const polyline = coords.join(" ");
  const summary = summariseTrend(history);
  const trendColor =
    !summary || summary.direction === "flat"
      ? "#94a3b8"
      : summary.direction === "up"
        ? "#22c55e"
        : "#ef4444";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Overall score trend"
      className="overflow-visible"
    >
      <polyline
        points={polyline}
        fill="none"
        stroke={trendColor}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Dot at the most recent point */}
      {(() => {
        const lastCoord = coords[coords.length - 1];
        if (!lastCoord) return null;
        const parts = lastCoord.split(",");
        const cx = Number(parts[0] ?? "0");
        const cy = Number(parts[1] ?? "0");
        return <circle cx={cx} cy={cy} r="3" fill={trendColor} />;
      })()}
    </svg>
  );
}

/* ─── Rating label helper ─── */

function ratingLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Average";
  return "Below Average";
}

function ratingColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 65) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-500";
}

function barColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-400";
  return "bg-red-400";
}

/* ─── generateStaticParams ─── */

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return [];
  }
  const supabase = createStaticClient();
  const { data } = await supabase
    .from("broker_health_scores")
    .select("broker_slug")
    .not("broker_slug", "is", null);

  return (data || []).map((row) => ({ slug: row.broker_slug as string }));
}

/* ─── generateMetadata ─── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const [{ data: score }, { data: broker }] = await Promise.all([
    supabase
      .from("broker_health_scores")
      .select("overall_score, afsl_number")
      .eq("broker_slug", slug)
      .single(),
    supabase
      .from("brokers")
      .select("name")
      .eq("slug", slug)
      .single(),
  ]);

  if (!score || !broker) return { title: "Health Score Not Found" };

  const title = `${broker.name} Safety Score ${score.overall_score}/100 — Platform Health Check (${CURRENT_YEAR})`;
  const description = `${broker.name} receives a health score of ${score.overall_score}/100. See the full breakdown across regulatory compliance, client money, financial stability, platform reliability, and insurance.`;

  return {
    title,
    description,
    openGraph: {
      title: `${broker.name} Platform Health Score — ${score.overall_score}/100`,
      description,
      url: `/health-scores/${slug}`,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(`${broker.name} Health Score`)}&subtitle=${encodeURIComponent(`${score.overall_score}/100 — 5-Dimension Safety Breakdown`)}&type=default`,
          width: 1200,
          height: 630,
          alt: `${broker.name} health score`,
        },
      ],
    },
    twitter: { card: "summary_large_image" as const },
    alternates: { canonical: `/health-scores/${slug}` },
  };
}

/* ─── Page ─── */

export default async function HealthScoreDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const [{ data: score }, { data: broker }, { data: historyRows }] =
    await Promise.all([
      supabase
        .from("broker_health_scores")
        .select("*")
        .eq("broker_slug", slug)
        .single(),
      supabase
        .from("brokers")
        .select("id, name, slug, color, icon, logo_url, rating, status")
        .eq("slug", slug)
        .single(),
      supabase
        .from("broker_health_score_history")
        .select(
          "id, broker_slug, overall_score, regulatory_score, client_money_score, financial_stability_score, platform_reliability_score, insurance_score, captured_at",
        )
        .eq("broker_slug", slug)
        .order("captured_at", { ascending: true })
        .limit(90),
    ]);

  if (!score || !broker) notFound();

  const typedScore = score as BrokerHealthScore;
  const typedBroker = broker as Broker;
  const history = (historyRows ?? []) as BrokerHealthScoreHistory[];
  const trendSummary = summariseTrend(history);

  /* ─── JSON-LD ─── */

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Platform Health Scores", url: absoluteUrl("/health-scores") },
    { name: `${typedBroker.name} Health Score` },
  ]);

  const reviewLd = {
    "@context": "https://schema.org",
    "@type": "Review",
    name: `${typedBroker.name} Platform Safety Review`,
    reviewBody: `${typedBroker.name} receives an overall health score of ${typedScore.overall_score}/100 across 5 safety dimensions.`,
    reviewRating: {
      "@type": "Rating",
      ratingValue: typedScore.overall_score,
      bestRating: 100,
      worstRating: 0,
    },
    author: {
      "@type": "Organization",
      name: "Invest.com.au",
      url: SITE_URL,
    },
    itemReviewed: {
      "@type": "FinancialProduct",
      name: typedBroker.name,
      url: `${SITE_URL}/brokers/${slug}`,
    },
  };

  const lastReviewed = typedScore.last_reviewed_at
    ? new Date(typedScore.last_reviewed_at).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const overallLabel = ratingLabel(typedScore.overall_score);
  const chessText = typedBroker.chess_sponsored
    ? "CHESS-sponsored, meaning your shares are held directly in your name on the ASX Clearing House Electronic Subregister System"
    : "custodial (your shares are held by the broker on your behalf, not directly in your name on the CHESS register)";

  const healthFaqs = [
    {
      q: `Is ${typedBroker.name} safe to use?`,
      a: `${typedBroker.name} receives an overall platform health score of ${typedScore.overall_score}/100 (${overallLabel}) based on 5 safety dimensions: regulatory compliance, client money protection, financial stability, platform reliability, and insurance coverage. The platform is ${chessText}. Always review a broker's Product Disclosure Statement (PDS) and Financial Services Guide (FSG) before investing. This score is general information only and is not financial advice.`,
    },
    {
      q: `What does the ${typedBroker.name} health score measure?`,
      a: `The ${typedBroker.name} health score is a 5-dimension weighted safety assessment: Regulatory (${typedScore.regulatory_score}/100 — AFSL status, breach history), Client Money (${typedScore.client_money_score}/100 — CHESS vs custodial, segregation), Financial Stability (${typedScore.financial_stability_score}/100 — capital adequacy, audit history), Platform Reliability (${typedScore.platform_reliability_score}/100 — uptime, outages, data security), and Insurance (${typedScore.insurance_score}/100 — professional indemnity and fidelity cover). Scores are updated by the Invest.com.au editorial team when new data is available.`,
    },
    {
      q: `What is CHESS sponsorship and does ${typedBroker.name} offer it?`,
      a: typedBroker.chess_sponsored
        ? `Yes, ${typedBroker.name} is CHESS-sponsored. This means your shares are registered directly in your name (via your Holder Identification Number, or HIN) on the ASX Clearing House Electronic Subregister System. If ${typedBroker.name} were to become insolvent, your shares remain yours — they are not assets of the broker. CHESS sponsorship is generally considered the safest way to hold Australian shares.`
        : `${typedBroker.name} uses a custodial model, not CHESS sponsorship. Your shares are held by ${typedBroker.name} in an omnibus account on your behalf. In the event of broker insolvency, you are an unsecured creditor for the value of your holdings, though client money rules require segregation of client assets. CHESS-sponsored accounts provide stronger legal ownership clarity.`,
    },
    {
      q: `How often is the ${typedBroker.name} health score updated?`,
      a: `The ${typedBroker.name} platform health score is updated by the Invest.com.au editorial team as new regulatory, financial, and operational data becomes available — typically quarterly or when a material event occurs (such as a regulatory action, financial report, or platform outage). ${lastReviewed ? `The score was last reviewed on ${lastReviewed}.` : "The last review date is shown on this page."} Score changes are logged in the trend chart above.`,
    },
  ];
  const healthFaqLd = faqJsonLd(healthFaqs);

  return (
    <div className="bg-white min-h-screen">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewLd) }}
      />
      {healthFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(healthFaqLd) }}
        />
      )}

      {/* ── Hero ── */}
      <section className="bg-white border-b border-slate-100">
        <div className="container-custom py-6 md:py-8">
          {/* Breadcrumbs */}
          <nav
            className="text-xs text-slate-500 mb-4 flex items-center gap-1.5"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-slate-600">
              Home
            </Link>
            <span aria-hidden="true">/</span>
            <Link href="/health-scores" className="hover:text-slate-600">
              Platform Health Scores
            </Link>
            <span aria-hidden="true">/</span>
            <span className="text-slate-600">{typedBroker.name}</span>
          </nav>

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <ScoreGauge score={typedScore.overall_score} size={120} />
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1">
                {typedBroker.name} — Platform Health Score
              </h1>
              <p
                className={`text-xl font-bold ${ratingColor(typedScore.overall_score)}`}
              >
                {ratingLabel(typedScore.overall_score)} Safety Rating
              </p>
              {typedScore.afsl_number && (
                <p className="text-xs text-slate-500 mt-2">
                  AFSL {typedScore.afsl_number} (
                  {typedScore.afsl_status || "active"}) &middot;{" "}
                  <a
                    href="https://connectonline.asic.gov.au/RegistrySearch/faces/landing/SearchRegisters.jspx"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-700 hover:underline"
                  >
                    Verify on ASIC &rarr;
                  </a>
                </p>
              )}
              {lastReviewed && (
                <p className="text-xs text-slate-500 mt-1">
                  Last reviewed: {lastReviewed}
                </p>
              )}

              {/* ── Trend sparkline ── */}
              {history.length >= 2 && trendSummary && (
                <div className="mt-3 flex items-center gap-3">
                  <ScoreSparkline history={history} width={120} height={36} />
                  <span
                    className={`text-xs font-semibold tabular-nums ${
                      trendSummary.direction === "up"
                        ? "text-emerald-600"
                        : trendSummary.direction === "down"
                          ? "text-red-500"
                          : "text-slate-500"
                    }`}
                  >
                    {formatDelta(trendSummary.delta)} pts
                  </span>
                  <span className="text-xs text-slate-500">
                    over {trendSummary.count} snapshots
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Content ── */}
      <div className="container-custom py-6 md:py-8 max-w-4xl space-y-8">
        {/* Score breakdown */}
        <section>
          <h2 className="text-xl font-extrabold text-slate-900 mb-4">
            5-Dimension Safety Breakdown
          </h2>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
            {DIMENSIONS.map((d) => {
              const dimScore = typedScore[d.key];
              const note = typedScore[d.noteKey];
              return (
                <div key={d.key} className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-sm font-semibold text-slate-800">
                        {d.label}
                      </span>
                      <span className="ml-2 text-xs text-slate-500">
                        ({(d.weight * 100).toFixed(0)}% weight)
                      </span>
                    </div>
                    <span
                      className={`text-sm font-bold tabular-nums ${ratingColor(dimScore)}`}
                    >
                      {dimScore}
                      <span className="text-slate-300 font-normal">/100</span>
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor(dimScore)}`}
                      style={{ width: `${dimScore}%` }}
                    />
                  </div>
                  {/* Dimension description */}
                  <p className="text-xs text-slate-500">{d.description}</p>
                  {/* Analyst note (always shown on detail page) */}
                  {note && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                      <p className="text-xs font-semibold text-slate-600 mb-1">
                        Analyst Notes
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {note}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Weighted score calculation */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-3">
            How the Overall Score is Calculated
          </h2>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-sm" aria-label="Health score calculation by dimension">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                    Dimension
                  </th>
                  <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-slate-600">
                    Score
                  </th>
                  <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-slate-600">
                    Weight
                  </th>
                  <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-slate-600">
                    Contribution
                  </th>
                </tr>
              </thead>
              <tbody>
                {DIMENSIONS.map((d, i) => {
                  const dimScore = typedScore[d.key];
                  const contribution = dimScore * d.weight;
                  return (
                    <tr
                      key={d.key}
                      className={`border-b border-slate-50 ${i % 2 === 1 ? "bg-slate-50/50" : ""}`}
                    >
                      <td className="px-4 py-3 text-slate-700">{d.label}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {dimScore}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">
                        {(d.weight * 100).toFixed(0)}%
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 font-medium">
                        {contribution.toFixed(1)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td
                    colSpan={3}
                    className="px-4 py-3 font-bold text-slate-900"
                  >
                    Overall Score
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                    {typedScore.overall_score}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Score history table */}
        {history.length >= 2 && (
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-3">
              Score History
            </h2>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm" aria-label="Health score history">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-600">
                      Date
                    </th>
                    <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-slate-600">
                      Overall
                    </th>
                    <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-slate-600 hidden sm:table-cell">
                      Regulatory
                    </th>
                    <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-slate-600 hidden md:table-cell">
                      Client Money
                    </th>
                    <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-slate-600 hidden md:table-cell">
                      Stability
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...history]
                    .sort(
                      (a, b) =>
                        new Date(b.captured_at).getTime() -
                        new Date(a.captured_at).getTime(),
                    )
                    .slice(0, 20)
                    .map((h, i) => (
                      <tr
                        key={h.id}
                        className={`border-b border-slate-50 ${i % 2 === 1 ? "bg-slate-50/50" : ""}`}
                      >
                        <td className="px-4 py-2.5 text-slate-500 text-xs tabular-nums">
                          {new Date(h.captured_at).toLocaleDateString("en-AU", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-900 tabular-nums">
                          {h.overall_score}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-600 tabular-nums hidden sm:table-cell">
                          {h.regulatory_score ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-600 tabular-nums hidden md:table-cell">
                          {h.client_money_score ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-600 tabular-nums hidden md:table-cell">
                          {h.financial_stability_score ?? "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Methodology */}
        <section>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-2">
              Methodology
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Health scores are based on publicly available information
              including AFSL status, corporate structure, client money handling
              practices, CHESS sponsorship, financial reporting, platform uptime
              data, and insurance coverage. Scores are weighted: Regulatory
              (25%), Client Money (25%), Financial Stability (20%), Platform
              Reliability (15%), Insurance (15%). Scores are reviewed quarterly
              by our editorial team. This is for informational purposes only and
              does not constitute financial advice.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-10 border-t border-slate-100 pt-8">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {healthFaqs.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {faq.q}
                  <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Back link */}
        <div className="text-sm mt-6">
          <Link
            href="/health-scores"
            className="text-slate-500 hover:text-slate-700 hover:underline"
          >
            &larr; Back to all platform health scores
          </Link>
        </div>
      </div>
    </div>
  );
}
