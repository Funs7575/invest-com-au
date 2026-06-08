import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { createClient } from "@/lib/supabase/server";
import ReportGate from "./ReportGate";
import RelatedContentGrid from "@/components/RelatedContentGrid";

export const revalidate = 3600;

interface ReportRow {
  id: number;
  title: string;
  slug: string;
  sector: string | null;
  summary: string | null;
  sponsor_name: string | null;
  sponsor_logo_url: string | null;
  report_url: string | null;
  gated: boolean | null;
  published_at: string | null;
  status: string | null;
}

const SECTOR_LABELS: Record<string, string> = {
  energy: "Energy",
  smsf: "SMSF",
  foreign_investment: "Foreign Investment",
  mining: "Mining",
  property: "Property",
  hydrogen: "Hydrogen",
  uranium: "Uranium",
};

async function fetchReport(slug: string): Promise<ReportRow | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("sector_reports")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    return (data as ReportRow | null) || null;
  } catch {
    return null;
  }
}

async function fetchRelated(
  sector: string | null,
  excludeSlug: string,
): Promise<ReportRow[]> {
  if (!sector) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("sector_reports")
      .select("id, title, slug, sector, summary, sponsor_name, sponsor_logo_url, gated, published_at, report_url, status")
      .eq("status", "published")
      .eq("sector", sector)
      .neq("slug", excludeSlug)
      .limit(3);
    return (data as ReportRow[] | null) || [];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const report = await fetchReport(slug);
  if (!report) {
    return {
      title: `Research report (${CURRENT_YEAR})`,
      description: "Australian investment research reports.",
    };
  }
  return {
    title: `${report.title} (${CURRENT_YEAR})`,
    description:
      report.summary?.slice(0, 155) ||
      `${report.title} — editorial research from Invest.com.au.`,
    alternates: { canonical: `${SITE_URL}/research/${report.slug}` },
  };
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const report = await fetchReport(slug);
  if (!report) notFound();
  const related = await fetchRelated(report.sector, report.slug);

  const sectorLabel = report.sector
    ? SECTOR_LABELS[report.sector] ?? report.sector
    : null;

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Research", url: `${SITE_URL}/research` },
    { name: report.title },
  ]);

  const researchFaqs = [
    {
      q: `What does the "${report.title}" report cover?`,
      a: report.summary
        ? `${report.summary} ${sectorLabel ? `This report focuses on the ${sectorLabel.toLowerCase()} sector in Australia.` : ""}`
        : `This report — "${report.title}" — is part of Invest.com.au's editorial research series${sectorLabel ? ` covering the ${sectorLabel.toLowerCase()} sector` : ""}. It provides data-driven analysis to help Australian investors understand market dynamics and investment opportunities. Download or read the report for full coverage.`,
    },
    {
      q: `Is "${report.title}" independent research?`,
      a: `${report.sponsor_name ? `This report has been produced with support from ${report.sponsor_name}. Sponsorship covers production costs but does not influence the editorial findings or conclusions — Invest.com.au maintains editorial independence for all research.` : `This report is produced by the Invest.com.au editorial team with no external sponsorship. Our research is independent and not influenced by any commercial relationships.`} All factual claims are sourced from publicly available data.`,
    },
    {
      q: `Is this report financial advice?`,
      a: `No. This report is general information only — it does not constitute personal financial advice and does not take into account your individual financial situation, objectives, or needs. Before acting on any information in this report, you should consider whether it is appropriate for you and seek advice from an AFSL-licensed financial adviser. Past performance is not a reliable indicator of future returns.`,
    },
    {
      q: `Who publishes invest.com.au research reports?`,
      a: `Research reports on invest.com.au are produced by the Invest.com.au editorial team — independent financial journalists and analysts based in Australia. Our reports draw on publicly available data, regulatory filings, and industry sources. We publish regularly on topics including ${sectorLabel ?? "property, SMSF, foreign investment, and sector analysis"} to help Australian investors make informed decisions.`,
    },
  ];
  const researchFaqLd = faqJsonLd(researchFaqs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(researchFaqLd) }}
      />
      <div className="bg-slate-50 min-h-screen">
        {/* Header with prominent sponsor attribution */}
        <section className="bg-white border-b border-slate-200 py-8 md:py-10">
          <div className="container-custom max-w-4xl">
            <nav
              className="flex items-center gap-1.5 text-xs text-slate-500 mb-5"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-slate-900">
                Home
              </Link>
              <span className="text-slate-300">/</span>
              <Link href="/research" className="hover:text-slate-900">
                Research
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-slate-900 font-medium line-clamp-1">
                {report.title}
              </span>
            </nav>

            {report.sponsor_name && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <p className="text-xs font-extrabold uppercase tracking-wide text-amber-800 mb-1">
                  Sponsored content
                </p>
                <p className="text-sm text-amber-900">
                  This report is sponsored by{" "}
                  <strong>{report.sponsor_name}</strong>. Sponsored research
                  is clearly labelled; the editorial content remains the
                  responsibility of the Invest.com.au research team. Read our{" "}
                  <Link href="/how-we-earn" className="underline">
                    how we earn
                  </Link>{" "}
                  page for full disclosure.
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-3">
              {sectorLabel && (
                <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  {sectorLabel}
                </span>
              )}
              <span
                className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                  report.gated
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {report.gated ? "Email registration required" : "Free download"}
              </span>
              {report.published_at && (
                <span className="text-[11px] text-slate-500">
                  Published{" "}
                  {new Date(report.published_at).toLocaleDateString("en-AU", {
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 leading-tight">
              {report.title}
            </h1>
            {report.summary && (
              <p className="text-sm md:text-base text-slate-600 leading-relaxed mt-3 max-w-3xl">
                {report.summary}
              </p>
            )}
          </div>
        </section>

        {/* Gate / direct download */}
        <section className="py-10">
          <div className="container-custom max-w-3xl">
            <ReportGate
              slug={report.slug}
              gated={Boolean(report.gated)}
              directUrl={report.report_url ?? null}
            />
          </div>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="py-10 bg-white border-t border-slate-200">
            <div className="container-custom max-w-6xl">
              <RelatedContentGrid
                heading="Related reports"
                cardClass="block bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-5 transition-colors flex flex-col"
                items={related.map((r) => ({
                  id: r.id,
                  href: `/research/${r.slug}`,
                  title: r.title,
                  badgeText: r.sector ?? undefined,
                  meta: r.sponsor_name ? `Sponsored by ${r.sponsor_name}` : undefined,
                }))}
              />
            </div>
          </section>
        )}

        <section className="py-10 bg-white border-t border-slate-100">
          <div className="container-custom max-w-4xl">
            <h2 className="text-lg font-bold text-slate-900 mb-5">About this report</h2>
            <div className="divide-y divide-slate-100">
              {researchFaqs.map(({ q, a }) => (
                <details key={q} className="group py-4">
                  <summary className="flex items-center justify-between cursor-pointer list-none text-slate-800 font-medium text-sm leading-snug gap-4">
                    {q}
                    <svg
                      className="w-4 h-4 shrink-0 text-slate-400 group-open:rotate-180 transition-transform"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="py-8 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong>General information only.</strong> This report is
              general information and does not constitute personal financial
              advice. Always consider your own circumstances and consult an
              AFSL-authorised adviser before acting on the information
              presented.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
