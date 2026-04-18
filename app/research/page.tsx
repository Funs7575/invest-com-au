import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { createAdminClient } from "@/lib/supabase/admin";
import Icon from "@/components/Icon";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Investment Research & Sector Reports (${CURRENT_YEAR}) — Invest.com.au`,
  description:
    "Download editorial investment research reports covering Australian energy, SMSF property, foreign investment, and critical minerals. Gated reports require a free email registration; ungated reports are direct-download.",
  alternates: { canonical: `${SITE_URL}/research` },
  openGraph: {
    title: `Investment Research & Sector Reports (${CURRENT_YEAR})`,
    description:
      "Editorial investment research — Australian energy, SMSF, foreign investment and more.",
    url: `${SITE_URL}/research`,
  },
};

interface ReportRow {
  id: number;
  title: string;
  slug: string;
  sector: string | null;
  summary: string | null;
  sponsor_name: string | null;
  sponsor_logo_url: string | null;
  gated: boolean | null;
  published_at: string | null;
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

async function fetchReports(): Promise<ReportRow[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("sector_reports")
      .select(
        "id, title, slug, sector, summary, sponsor_name, sponsor_logo_url, gated, published_at",
      )
      .eq("status", "published")
      .order("published_at", { ascending: false });
    return (data as ReportRow[] | null) || [];
  } catch {
    return [];
  }
}

export default async function ResearchPage() {
  const reports = await fetchReports();
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Research" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav
              className="flex items-center gap-1.5 text-xs text-slate-400 mb-5"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-white">
                Home
              </Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Research</span>
            </nav>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Investment Research &amp; Sector Reports
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Editorial research from the Invest.com.au team covering
              Australian energy, SMSF, foreign investment, and critical
              minerals. Reports are updated quarterly; some are sponsored by
              institutional partners — sponsor attribution is visible upfront
              on every report page.
            </p>
          </div>
        </section>

        <section className="py-10 bg-white">
          <div className="container-custom max-w-6xl">
            {reports.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-sm text-slate-500">
                  No reports currently published. Check back soon.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map((r) => (
                  <ReportCard key={r.id} report={r} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="py-8 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong>General information only.</strong> Reports are editorial
              content produced or commissioned by Invest.com.au. Some reports
              are sponsored — sponsor attribution appears prominently on each
              report page. Reports are not personal financial advice. Consult
              an AFSL-authorised adviser before making investment decisions.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

function ReportCard({ report }: { report: ReportRow }) {
  const sectorLabel = report.sector
    ? SECTOR_LABELS[report.sector] ?? report.sector
    : null;
  return (
    <Link
      href={`/research/${report.slug}`}
      className="group block bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
        {sectorLabel && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
            {sectorLabel}
          </span>
        )}
        <span
          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
            report.gated
              ? "bg-amber-100 text-amber-800"
              : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {report.gated ? "Free · email required" : "Free download"}
        </span>
      </div>
      <div className="p-5">
        <h3 className="text-base font-extrabold text-slate-900 leading-tight mb-2 group-hover:text-amber-700 line-clamp-2">
          {report.title}
        </h3>
        {report.sponsor_name && (
          <p className="text-[11px] text-slate-500 mb-2">
            Sponsored by <strong>{report.sponsor_name}</strong>
          </p>
        )}
        {report.summary && (
          <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">
            {report.summary}
          </p>
        )}
        <p className="text-xs font-bold text-amber-600 mt-4 inline-flex items-center gap-1">
          {report.gated ? "Download free report" : "Read the report"}
          <Icon name="arrow-right" size={12} />
        </p>
      </div>
    </Link>
  );
}
