import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import JsonLd from "@/components/JsonLd";
import ComplianceFooter from "@/components/ComplianceFooter";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import {
  postcodeRecord,
  nearbyPostcodes,
  postcodeAtlasMeta,
  type PostcodeRecord,
} from "@/lib/postcode-atlas";

export const revalidate = 86400;
// On-demand ISR over the file-backed extract, same as the other registries.
export function generateStaticParams() {
  return [];
}

const meta = postcodeAtlasMeta();

function money(value: number | undefined): string {
  return value === undefined ? "—" : `$${value.toLocaleString("en-AU")}`;
}

export async function generateMetadata({ params }: { params: Promise<{ postcode: string }> }): Promise<Metadata> {
  const { postcode } = await params;
  const record = postcodeRecord(postcode);
  if (!record) notFound();
  const place = record.suburbs[0] ? `${record.suburbs[0]} (${record.postcode})` : `Postcode ${record.postcode}`;
  return {
    title: `${place} — Median Income & Super Statistics (${CURRENT_YEAR})`,
    description: `ATO taxation statistics for postcode ${record.postcode}, ${record.state}: median taxable income ${record.medianTaxableIncome ? `$${record.medianTaxableIncome.toLocaleString("en-AU")}` : "n/a"}, income year ${meta.incomeYear}.`,
    alternates: { canonical: absoluteUrl(`/postcodes/${record.postcode}`) },
    ...(meta.sample ? { robots: { index: false, follow: false } } : {}),
  };
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xl font-extrabold text-slate-900 tabular-nums">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
      {sub && <p className="text-[0.7rem] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default async function PostcodePage({ params }: { params: Promise<{ postcode: string }> }) {
  const { postcode } = await params;
  const record: PostcodeRecord | null = postcodeRecord(postcode);
  if (!record) notFound();

  const nearby = nearbyPostcodes(record);
  const national = meta.nationalMedianTaxableIncome;
  const vsNational =
    national !== undefined && record.medianTaxableIncome !== undefined
      ? Math.round(((record.medianTaxableIncome - national) / national) * 100)
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: absoluteUrl("/") },
          { name: "Postcode Wealth Atlas", url: absoluteUrl("/postcodes") },
          { name: `Postcode ${record.postcode}`, url: absoluteUrl(`/postcodes/${record.postcode}`) },
        ])}
      />
      {!meta.sample && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Place",
            name: record.suburbs[0] ? `${record.suburbs[0]}, ${record.state} ${record.postcode}` : `Postcode ${record.postcode}`,
            address: {
              "@type": "PostalAddress",
              postalCode: record.postcode,
              addressRegion: record.state,
              addressCountry: "AU",
            },
            url: absoluteUrl(`/postcodes/${record.postcode}`),
          }}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-700 transition-colors">Home</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <Link href="/postcodes" className="hover:text-slate-700 transition-colors">Postcodes</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-600 font-medium">{record.postcode}</span>
        </nav>

        {meta.sample && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong className="font-semibold">Preview record.</strong> Synthetic placeholder — a
            reserved 99xx postcode with fictional figures. The ATO extract hasn&apos;t been loaded yet.
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <span className="font-mono text-sm font-bold text-slate-500">{record.postcode}</span>
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">
              {record.suburbs.length > 0 ? record.suburbs.slice(0, 3).join(" · ") : `Postcode ${record.postcode}`}
            </h1>
            <p className="text-sm font-semibold text-amber-700 mt-0.5">
              {record.state} · postcode {record.postcode}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              ATO taxation statistics · income year {meta.incomeYear}
            </p>
          </div>
        </div>

        {/* Income stats */}
        <section aria-labelledby="income-stats" className="mb-6">
          <h2 id="income-stats" className="text-sm font-bold text-slate-900 mb-2.5">
            Income &amp; contributions
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            <StatCard
              label="Median taxable income"
              value={money(record.medianTaxableIncome)}
              sub={vsNational !== null ? `${vsNational >= 0 ? "+" : ""}${vsNational}% vs national median` : undefined}
            />
            <StatCard label="Average taxable income" value={money(record.meanTaxableIncome)} sub="Mean — pulled up by top earners" />
            <StatCard
              label="Individuals lodging"
              value={record.individualsCount !== undefined ? record.individualsCount.toLocaleString("en-AU") : "—"}
            />
            <StatCard label="Median super contributions" value={money(record.medianSuperContribution)} sub="Per year" />
          </div>
          <p className="mt-2.5 text-[0.7rem] leading-relaxed text-slate-500">
            Source: ATO taxation statistics by postcode, income year {meta.incomeYear} (extract
            dated {meta.extractedAt}). Aggregates of lodged returns — factual information, not
            advice or an investment signal.
          </p>
        </section>

        {/* Wide-spread note */}
        {record.meanTaxableIncome !== undefined &&
          record.medianTaxableIncome !== undefined &&
          record.meanTaxableIncome > record.medianTaxableIncome * 1.3 && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 leading-relaxed mb-6">
              <p className="font-semibold text-slate-700 mb-1">Wide income spread</p>
              <p>
                The average here is more than 30% above the median — a sign of a long tail of high
                earners. The median is the better picture of a typical taxpayer in {record.postcode}.
              </p>
            </div>
          )}

        {/* Nearby */}
        {nearby.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-bold text-slate-900 mb-2.5">Nearby postcodes in {record.state}</h2>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
              {nearby.map((p) => (
                <li key={p.postcode}>
                  <Link
                    href={`/postcodes/${p.postcode}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-amber-50/60 transition-colors"
                  >
                    <span className="text-sm font-medium text-slate-800">
                      {p.postcode} · {p.suburbs[0] ?? p.state}
                    </span>
                    <span className="text-xs text-slate-500 tabular-nums">
                      {p.medianTaxableIncome !== undefined
                        ? `$${p.medianTaxableIncome.toLocaleString("en-AU")} median`
                        : "—"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Adviser CTA */}
        <section className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 mb-8">
          <h2 className="text-base font-bold text-slate-900 mb-1.5 flex items-center gap-2">
            <Icon name="users" size={16} className="text-amber-600" />
            Advice that knows your area
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-3.5">
            Local advisers see incomes, property prices, and strategies like these every day. Two
            minutes of questions matches you with verified professionals near {record.postcode}.
          </p>
          <Link
            href="/find-advisor"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-3 text-sm font-bold text-slate-900 transition-colors shadow-sm"
          >
            Find an adviser near you
            <Icon name="arrow-right" size={15} />
          </Link>
        </section>

        <ComplianceFooter />
      </div>
    </div>
  );
}
