import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import type { Broker } from "@/lib/types";
import { notFound } from "next/navigation";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  SITE_NAME,
  CURRENT_YEAR,
} from "@/lib/seo";
import BrokerLogo from "@/components/BrokerLogo";
import Icon from "@/components/Icon";

export const revalidate = 86400; // ISR: daily

export async function generateStaticParams() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return [];
  }
  const supabase = createStaticClient();
  const { data } = await supabase
    .from("brokers")
    .select("slug")
    .eq("status", "active");
  return (data || []).map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: broker } = await supabase
    .from("brokers")
    .select("name, tagline")
    .eq("slug", slug)
    .single();

  if (!broker) return { title: "Broker Not Found" };

  const title = `${broker.name} Safety Review — Financial Health ${CURRENT_YEAR}`;
  const description = `Is ${broker.name} safe? Regulatory status, financial health indicators, client protection, and safety score for ${CURRENT_YEAR}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/broker/${slug}/safety`),
      siteName: SITE_NAME,
      type: "article",
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
    },
    alternates: {
      canonical: `/broker/${slug}/safety`,
    },
  };
}

/* ── Safety score calculation ── */

function calculateSafetyScore(broker: Broker): number {
  let score = 0;

  // Regulatory status (up to 35 points)
  if (broker.regulated_by) {
    const regs = broker.regulated_by.toLowerCase();
    if (regs.includes("asic")) score += 25;
    if (regs.includes("afsl") || regs.includes("afs licence")) score += 10;
    if (regs.includes("austrac")) score += 5;
    if (regs.includes("fca") || regs.includes("sec") || regs.includes("mas"))
      score += 5;
  }

  // CHESS sponsorship (20 points)
  if (broker.chess_sponsored) score += 20;

  // Years operating (up to 20 points)
  if (broker.year_founded) {
    const yearsOp = CURRENT_YEAR - broker.year_founded;
    if (yearsOp >= 20) score += 20;
    else if (yearsOp >= 10) score += 15;
    else if (yearsOp >= 5) score += 10;
    else if (yearsOp >= 2) score += 5;
  }

  // Rating as proxy for overall quality (up to 10 points)
  if (broker.rating) {
    if (broker.rating >= 4.5) score += 10;
    else if (broker.rating >= 4.0) score += 8;
    else if (broker.rating >= 3.5) score += 5;
    else if (broker.rating >= 3.0) score += 3;
  }

  // Platform type bonuses (up to 5 points)
  if (broker.platform_type === "share_broker") score += 5;

  // Headquarters in regulated jurisdiction (up to 5 points)
  if (broker.headquarters) {
    const hq = broker.headquarters.toLowerCase();
    if (
      hq.includes("australia") ||
      hq.includes("sydney") ||
      hq.includes("melbourne")
    )
      score += 5;
    else if (
      hq.includes("uk") ||
      hq.includes("london") ||
      hq.includes("united states") ||
      hq.includes("new york")
    )
      score += 4;
    else if (hq.includes("singapore") || hq.includes("hong kong"))
      score += 3;
  }

  // Cap at 100
  return Math.min(score, 100);
}

function getScoreColor(score: number): {
  bg: string;
  text: string;
  ring: string;
  label: string;
} {
  if (score >= 80)
    return {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      ring: "ring-emerald-200",
      label: "Strong",
    };
  if (score >= 50)
    return {
      bg: "bg-amber-50",
      text: "text-amber-700",
      ring: "ring-amber-200",
      label: "Moderate",
    };
  return {
    bg: "bg-red-50",
    text: "text-red-700",
    ring: "ring-red-200",
    label: "Caution",
  };
}

function getGaugeGradient(score: number): string {
  if (score >= 80) return "from-emerald-400 to-emerald-600";
  if (score >= 50) return "from-amber-400 to-amber-600";
  return "from-red-400 to-red-600";
}

/* ── Check / Cross helper ── */
function StatusBadge({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <svg
          className="w-5 h-5 text-emerald-500 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      ) : (
        <svg
          className="w-5 h-5 text-slate-300 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      )}
      <span className={ok ? "text-slate-900" : "text-slate-500"}>{label}</span>
    </div>
  );
}

export default async function BrokerSafetyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: broker } = await supabase
    .from("brokers")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (!broker) notFound();

  const b = broker as Broker;
  const safetyScore = calculateSafetyScore(b);
  const scoreStyle = getScoreColor(safetyScore);
  const gaugeGradient = getGaugeGradient(safetyScore);

  const hasAsic = b.regulated_by?.toLowerCase().includes("asic") || false;
  const hasAfsl =
    b.regulated_by?.toLowerCase().includes("afsl") ||
    b.regulated_by?.toLowerCase().includes("afs licence") ||
    false;
  const hasAustrac =
    b.regulated_by?.toLowerCase().includes("austrac") || false;
  const yearsOperating = b.year_founded
    ? CURRENT_YEAR - b.year_founded
    : null;

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Brokers", url: absoluteUrl("/compare") },
    { name: b.name, url: absoluteUrl(`/broker/${slug}`) },
    { name: "Safety" },
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      {/* Breadcrumbs */}
      <div className="bg-white border-b border-slate-200">
        <div className="container-custom py-3">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500">
            <a href="/" className="hover:text-slate-900 transition-colors">
              Home
            </a>
            <span>/</span>
            <a
              href="/compare"
              className="hover:text-slate-900 transition-colors"
            >
              Brokers
            </a>
            <span>/</span>
            <a
              href={`/broker/${slug}`}
              className="hover:text-slate-900 transition-colors"
            >
              {b.name}
            </a>
            <span>/</span>
            <span className="text-slate-900 font-medium">Safety</span>
          </nav>
        </div>
      </div>

      <div className="container-custom py-8 md:py-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <BrokerLogo broker={b} size="xl" />
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              {b.name} Safety Review
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Financial health assessment for {CURRENT_YEAR}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column: Safety Score */}
          <div className="lg:col-span-1">
            <div
              className={`rounded-xl border p-6 ${scoreStyle.bg} ${scoreStyle.ring} ring-1`}
            >
              <h2 className="text-sm font-bold text-slate-900 mb-4">
                Safety Score
              </h2>

              {/* Gauge visualization */}
              <div className="relative w-32 h-32 mx-auto mb-4">
                <svg viewBox="0 0 120 120" className="w-full h-full">
                  {/* Background track */}
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="10"
                    strokeDasharray="235.6"
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    transform="rotate(135 60 60)"
                  />
                  {/* Score arc */}
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    className={
                      safetyScore >= 80
                        ? "stroke-emerald-500"
                        : safetyScore >= 50
                          ? "stroke-amber-500"
                          : "stroke-red-500"
                    }
                    strokeWidth="10"
                    strokeDasharray="235.6"
                    strokeDashoffset={235.6 - (235.6 * safetyScore * 0.75) / 100}
                    strokeLinecap="round"
                    transform="rotate(135 60 60)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className={`text-3xl font-extrabold ${scoreStyle.text}`}
                  >
                    {safetyScore}
                  </span>
                  <span className="text-xs text-slate-500">/ 100</span>
                </div>
              </div>

              <div className="text-center">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${scoreStyle.bg} ${scoreStyle.text}`}
                >
                  {scoreStyle.label}
                </span>
              </div>

              <p className="text-xs text-slate-500 mt-4 text-center leading-relaxed">
                Based on regulatory status, years operating, CHESS sponsorship,
                and platform reputation.
              </p>
            </div>
          </div>

          {/* Right column: Detail sections */}
          <div className="lg:col-span-2 space-y-6">
            {/* Regulatory Status */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Icon name="shield" size={18} className="text-slate-400" />
                Regulatory Status
              </h2>
              <div className="space-y-3">
                <StatusBadge
                  ok={hasAsic}
                  label="ASIC regulated (Australian Securities & Investments Commission)"
                />
                <StatusBadge
                  ok={hasAfsl}
                  label="Holds Australian Financial Services Licence (AFSL)"
                />
                {b.is_crypto && (
                  <StatusBadge
                    ok={hasAustrac}
                    label="AUSTRAC registered (required for crypto exchanges)"
                  />
                )}
                {b.regulated_by && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">
                      Regulated by
                    </p>
                    <p className="text-sm text-slate-900 font-medium">
                      {b.regulated_by}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Indicators */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Icon name="bar-chart-2" size={18} className="text-slate-400" />
                Financial Indicators
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Year founded</p>
                  <p className="text-sm font-medium text-slate-900">
                    {b.year_founded || "Not disclosed"}
                    {yearsOperating !== null && (
                      <span className="text-slate-500 ml-1">
                        ({yearsOperating} years)
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Headquarters</p>
                  <p className="text-sm font-medium text-slate-900">
                    {b.headquarters || "Not disclosed"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Platform type</p>
                  <p className="text-sm font-medium text-slate-900 capitalize">
                    {b.platform_type?.replace(/_/g, " ") || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">
                    Editorial rating
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    {b.rating ? `${b.rating}/5` : "Not rated"}
                  </p>
                </div>
              </div>
            </div>

            {/* Client Protection */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Icon name="lock" size={18} className="text-slate-400" />
                Client Protection
              </h2>
              <div className="space-y-3">
                <StatusBadge
                  ok={b.chess_sponsored}
                  label="CHESS sponsorship — shares held in your name with ASX"
                />
                <StatusBadge
                  ok={hasAsic}
                  label="Covered by ASIC supervision and dispute resolution"
                />
                <StatusBadge
                  ok={
                    b.platform_type === "share_broker" && b.chess_sponsored
                  }
                  label="Segregated client accounts"
                />
                <StatusBadge
                  ok={hasAsic || hasAfsl}
                  label="Access to Australian Financial Complaints Authority (AFCA)"
                />
              </div>
              {b.chess_sponsored && (
                <div className="mt-4 bg-emerald-50 rounded-lg p-3">
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    <strong>CHESS sponsorship</strong> means your shares are
                    registered directly with the ASX in your name (a Holder
                    Identification Number, or HIN). If the broker were to fail,
                    your shares remain yours and can be transferred to another
                    CHESS-sponsored broker.
                  </p>
                </div>
              )}
            </div>

            {/* Risk Factors */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Icon
                  name="alert-triangle"
                  size={18}
                  className="text-slate-400"
                />
                Risk Factors
              </h2>
              <div className="space-y-3">
                {!hasAsic && !hasAfsl && (
                  <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-lg p-3">
                    <svg
                      className="w-5 h-5 shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      Not regulated by ASIC or holding an AFSL. Exercise
                      caution — you may have limited recourse if something goes
                      wrong.
                    </span>
                  </div>
                )}
                {!b.chess_sponsored &&
                  b.platform_type === "share_broker" && (
                    <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
                      <svg
                        className="w-5 h-5 shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>
                        Not CHESS-sponsored. Shares are held in a custodial
                        (omnibus) account rather than directly in your name.
                        This is common for international brokers but offers less
                        protection if the broker fails.
                      </span>
                    </div>
                  )}
                {yearsOperating !== null && yearsOperating < 3 && (
                  <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
                    <svg
                      className="w-5 h-5 shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      Relatively new platform (founded {b.year_founded}).
                      Newer platforms have shorter track records but are not
                      necessarily less safe.
                    </span>
                  </div>
                )}
                {b.is_crypto && !hasAustrac && (
                  <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-lg p-3">
                    <svg
                      className="w-5 h-5 shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      Crypto exchange without confirmed AUSTRAC registration.
                      Australian crypto exchanges are legally required to
                      register with AUSTRAC.
                    </span>
                  </div>
                )}
                {hasAsic &&
                  b.chess_sponsored &&
                  yearsOperating !== null &&
                  yearsOperating >= 3 && (
                    <div className="flex items-start gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg p-3">
                      <svg
                        className="w-5 h-5 shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>
                        No major risk factors identified. This broker is
                        ASIC-regulated, CHESS-sponsored, and has been operating
                        for {yearsOperating}+ years.
                      </span>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-10 bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500 leading-relaxed">
            <strong>Disclaimer:</strong> This safety assessment is based on
            publicly available information and our editorial methodology. It is
            not financial advice. The safety score is an indicative measure
            based on regulatory status, years of operation, and client
            protection features. Always conduct your own due diligence and
            consult ASIC&apos;s{" "}
            <a
              href="https://moneysmart.gov.au"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-600 underline"
            >
              MoneySmart
            </a>{" "}
            for official guidance.
          </p>
        </div>
      </div>
    </div>
  );
}
