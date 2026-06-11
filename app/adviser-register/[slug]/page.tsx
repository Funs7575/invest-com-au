import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import JsonLd from "@/components/JsonLd";
import ComplianceFooter from "@/components/ComplianceFooter";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import {
  adviserBySlug,
  colleaguesOf,
  registerMeta,
  type RegisterAdviser,
} from "@/lib/adviser-register";

export const revalidate = 86400;
// On-demand ISR over the file-backed extract: ~15k slugs would bloat the
// build if pre-rendered, and each page is a cheap in-memory lookup.
export function generateStaticParams() {
  return [];
}

const meta = registerMeta();

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const adviser = adviserBySlug(slug);
  if (!adviser) return { title: "Adviser not found" };
  return {
    title: `${adviser.name} — Financial Adviser Register Record (${CURRENT_YEAR})`,
    description: `${adviser.name} (adviser #${adviser.number}) is a current ${adviser.role.toLowerCase()} authorised under ${adviser.licenseeName}. Registration details from ASIC's Financial Advisers Register.`,
    alternates: { canonical: absoluteUrl(`/adviser-register/${adviser.slug}`) },
    // Preview (synthetic) data must never be indexed or mistaken for the
    // live register — flips off automatically when the real extract lands.
    ...(meta.sample ? { robots: { index: false, follow: false } } : {}),
  };
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0 pt-0.5">{label}</dt>
      <dd className="text-sm text-slate-800 font-medium text-right">{value}</dd>
    </div>
  );
}

export default async function AdviserRegisterRecordPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const adviser: RegisterAdviser | null = adviserBySlug(slug);
  if (!adviser) notFound();

  const colleagues = colleaguesOf(adviser);
  const claimHref = `/advisor-apply?source=adviser-register&adviser_number=${encodeURIComponent(adviser.number)}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: absoluteUrl("/") },
          { name: "Adviser Register", url: absoluteUrl("/adviser-register") },
          { name: adviser.name, url: absoluteUrl(`/adviser-register/${adviser.slug}`) },
        ])}
      />
      {!meta.sample && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Person",
            name: adviser.name,
            identifier: adviser.number,
            jobTitle: adviser.role,
            worksFor: {
              "@type": "Organization",
              name: adviser.licenseeName,
              ...(adviser.licenseeNumber ? { identifier: `AFSL ${adviser.licenseeNumber}` } : {}),
            },
            url: absoluteUrl(`/adviser-register/${adviser.slug}`),
          }}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-6">
          <Link href="/" className="hover:text-slate-700 transition-colors">Home</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <Link href="/adviser-register" className="hover:text-slate-700 transition-colors">Adviser Register</Link>
          <span className="mx-1.5 text-slate-300">/</span>
          <span className="text-slate-600 font-medium">{adviser.name}</span>
        </nav>

        {meta.sample && (
          <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong className="font-semibold">Preview record.</strong> This is a synthetic
            placeholder, not a real adviser — the live ASIC extract hasn&apos;t been loaded yet.
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
            <Icon name="user" size={24} className="text-slate-500" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight">{adviser.name}</h1>
            <p className="text-sm font-semibold text-amber-700 mt-0.5">{adviser.role}</p>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Icon name="shield-check" size={13} className="text-emerald-600" />
              Current on the Financial Advisers Register · extract {meta.extractedAt}
            </p>
          </div>
        </div>

        {/* Register facts */}
        <section aria-labelledby="register-facts" className="rounded-2xl border border-slate-200 bg-white p-5 mb-6">
          <h2 id="register-facts" className="text-sm font-bold text-slate-900 mb-2">Register record</h2>
          <dl>
            <FactRow label="Adviser number" value={`#${adviser.number}`} />
            <FactRow label="Role" value={adviser.role} />
            {adviser.subType && <FactRow label="Sub-type" value={adviser.subType} />}
            <FactRow label="Licensee" value={adviser.licenseeName} />
            {adviser.licenseeNumber && <FactRow label="AFS licence no." value={adviser.licenseeNumber} />}
            {adviser.firstAdviceYear && (
              <FactRow label="First provided advice" value={String(adviser.firstAdviceYear)} />
            )}
          </dl>
          {adviser.qualifications && adviser.qualifications.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Qualifications &amp; training (as recorded)
              </p>
              <ul className="space-y-1">
                {adviser.qualifications.map((q) => (
                  <li key={q} className="text-sm text-slate-700 flex items-start gap-2">
                    <Icon name="award" size={13} className="text-slate-500 shrink-0 mt-0.5" />
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-4 text-[0.7rem] leading-relaxed text-slate-500">
            Source: ASIC Financial Advisers Register open-data extract dated {meta.extractedAt}.
            This is a factual register record, not a review, rating, or endorsement. Verify the
            current entry on{" "}
            <a
              href="https://moneysmart.gov.au/financial-advice/financial-advisers-register"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-700 underline hover:text-amber-800"
            >
              MoneySmart
            </a>{" "}
            before engaging any adviser.
          </p>
        </section>

        {/* Claim CTA */}
        <section className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 mb-6">
          <h2 className="text-base font-bold text-slate-900 mb-1.5">
            Are you {adviser.name}?
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-3.5">
            This page shows only your public register record. Claim your free profile to add
            your specialties, fees, and availability — and appear in our matching and
            directory results when investors look for someone like you.
          </p>
          <Link
            href={claimHref}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-3 text-sm font-bold text-slate-900 transition-colors shadow-sm"
          >
            Claim this profile — free
            <Icon name="arrow-right" size={15} />
          </Link>
          <p className="mt-2.5 text-xs text-slate-500">
            Verification required — we check every claim against the register and your licensee.
          </p>
        </section>

        {/* Colleagues under the same licensee */}
        {colleagues.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-bold text-slate-900 mb-2.5">
              Also authorised under {adviser.licenseeName}
            </h2>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden">
              {colleagues.map((c) => (
                <li key={c.number}>
                  <Link
                    href={`/adviser-register/${c.slug}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-amber-50/60 transition-colors"
                  >
                    <span className="text-sm font-medium text-slate-800">{c.name}</span>
                    <span className="text-xs text-slate-500">{c.role}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Investor cross-link */}
        <section className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600 leading-relaxed mb-8">
          Looking for an adviser who&apos;s verified and taking clients?{" "}
          <Link href="/advisors" className="font-semibold text-amber-700 underline hover:text-amber-800">
            Browse the directory
          </Link>{" "}
          or{" "}
          <Link href="/get-matched" className="font-semibold text-amber-700 underline hover:text-amber-800">
            get matched in two minutes
          </Link>
          .
        </section>

        <ComplianceFooter />
      </div>
    </div>
  );
}
