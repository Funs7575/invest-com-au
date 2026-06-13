/**
 * /afsl/[number] — public AFSL licensee SEO landing.
 *
 * Strategy: there are ~6,000 AFSL holders in Australia. Each one is a
 * long-tail query ("AFSL 123456", "Acme Wealth AFSL"). The page renders
 * the licensee details from our cache, hard-disclosures the source, and
 * cross-links to /find-advisor so qualified traffic can convert.
 *
 * ISR: 1 hour. The underlying cache refreshes at most weekly, but we
 * keep ISR low so admin uploads propagate fast in the dashboard period.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { advisersForLicence, registerMeta } from "@/lib/adviser-register";
import {
  AFSL_STATUS_LABELS,
  getAfslLicensee,
  normaliseAfslNumber,
} from "@/lib/afsl-register";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import AfslLookupClient from "@/app/afsl-lookup/AfslLookupClient";

export const revalidate = 3600;
export const dynamic = "force-static";
export const dynamicParams = true;

type Props = { params: Promise<{ number: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { number } = await params;
  const normalised = normaliseAfslNumber(number);
  const licensee = normalised ? await getAfslLicensee(normalised) : null;

  if (!licensee) {
    return {
      title: `AFSL ${number} — not found | ${SITE_NAME}`,
      description: `No record of AFSL ${number} in our register cache.`,
      robots: { index: false, follow: false },
    };
  }

  const statusLabel = AFSL_STATUS_LABELS[licensee.status];
  return {
    title: `${licensee.licensee_name} — AFSL ${licensee.afsl_number} (${statusLabel}) | ${SITE_NAME}`,
    description: `${licensee.licensee_name} holds Australian Financial Services Licence ${licensee.afsl_number}. Status: ${statusLabel}. Verified from the ASIC AFS register.`,
    alternates: {
      canonical: absoluteUrl(`/afsl/${licensee.afsl_number}`),
    },
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function statusBadgeClasses(status: string): string {
  switch (status) {
    case "current":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "suspended":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "cancelled":
    case "ceased":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

export default async function AfslLicenseePage({ params }: Props) {
  const { number } = await params;
  const normalised = normaliseAfslNumber(number);
  const licensee = normalised ? await getAfslLicensee(normalised) : null;

  if (!licensee) notFound();

  const statusLabel = AFSL_STATUS_LABELS[licensee.status];
  const isCurrent = licensee.status === "current";

  const afslFaqs = [
    {
      q: `What is AFSL ${licensee.afsl_number}?`,
      a: `AFSL ${licensee.afsl_number} is the Australian Financial Services Licence held by ${licensee.licensee_name}. ${isCurrent ? `The licence is currently active and was granted on ${formatDate(licensee.effective_date)}.` : `The licence status is ${statusLabel}${licensee.cancelled_date ? `, with a cancellation date of ${formatDate(licensee.cancelled_date)}` : ""}.`} An AFSL is issued by ASIC and authorises a financial services business to provide advice, deal in financial products, and operate a financial market in Australia.`,
    },
    {
      q: `Is ${licensee.licensee_name} licensed to provide financial advice?`,
      a: isCurrent
        ? `Yes — ${licensee.licensee_name} holds a current AFSL (${licensee.afsl_number}) issued by ASIC, which authorises the firm to provide financial services in Australia. Always confirm the specific authorisations listed on ASIC's register before engaging any advice, as some licences are restricted to particular product types.`
        : `${licensee.licensee_name}'s AFSL ${licensee.afsl_number} is currently ${statusLabel.toLowerCase()}. You should not engage financial services from an adviser whose licence is suspended or cancelled. Search ASIC Connect or use our verified advisor directory to find a currently licensed professional.`,
    },
    {
      q: `How do I verify that ${licensee.licensee_name} is regulated by ASIC?`,
      a: `You can verify any AFSL on ASIC Connect (search by name or number). Our data is sourced directly from the ASIC AFS register and cached weekly — last verified ${formatDate(licensee.last_verified_at)}. For the most current authorisations, conditions, and authorised representatives, check ASIC Connect directly at connect.asic.gov.au.`,
    },
    {
      q: `What happens if a financial advisor's AFSL is cancelled or suspended?`,
      a: `If an AFSL is cancelled or suspended, the holder loses the right to provide financial services in Australia. Any advice given after that date may be unlicensed, which is illegal under the Corporations Act 2001. Consumers affected by a licensee whose licence was cancelled can lodge a complaint with AFCA (Australian Financial Complaints Authority) or contact ASIC directly. Use our advisor directory to find a currently licensed replacement.`,
    },
  ];
  const afslFaqLd = faqJsonLd(afslFaqs);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: licensee.licensee_name,
    identifier: `AFSL ${licensee.afsl_number}`,
    address: licensee.address || undefined,
    foundingDate: licensee.effective_date || undefined,
    dissolutionDate: licensee.cancelled_date || undefined,
    url: absoluteUrl(`/afsl/${licensee.afsl_number}`),
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {afslFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(afslFaqLd) }}
        />
      )}

      <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-700">Home</Link>
        <span aria-hidden className="mx-1.5">/</span>
        <Link href="/afsl-lookup" className="hover:text-slate-700">AFSL Lookup</Link>
        <span aria-hidden className="mx-1.5">/</span>
        <span className="text-slate-700">{licensee.afsl_number}</span>
      </nav>

      <header className="space-y-3">
        <div className="text-xs uppercase tracking-wider text-slate-500">
          AFSL register lookup
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
          {licensee.licensee_name}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-600 text-sm">
            AFSL <span className="font-mono">{licensee.afsl_number}</span>
          </span>
          <span
            className={`inline-flex items-center text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded-full border ${statusBadgeClasses(licensee.status)}`}
          >
            {statusLabel}
          </span>
        </div>
      </header>

      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-200 rounded-xl p-4">
          <dt className="text-xs uppercase tracking-wider text-slate-500 mb-1">
            Address
          </dt>
          <dd className="text-slate-900">{licensee.address || "—"}</dd>
        </div>
        <div className="border border-slate-200 rounded-xl p-4">
          <dt className="text-xs uppercase tracking-wider text-slate-500 mb-1">
            Licence effective
          </dt>
          <dd className="text-slate-900">
            {formatDate(licensee.effective_date)}
          </dd>
        </div>
        {licensee.cancelled_date && (
          <div className="border border-slate-200 rounded-xl p-4">
            <dt className="text-xs uppercase tracking-wider text-slate-500 mb-1">
              Cancelled
            </dt>
            <dd className="text-slate-900">
              {formatDate(licensee.cancelled_date)}
            </dd>
          </div>
        )}
        <div className="border border-slate-200 rounded-xl p-4">
          <dt className="text-xs uppercase tracking-wider text-slate-500 mb-1">
            Last verified
          </dt>
          <dd className="text-slate-900">
            {formatDate(licensee.last_verified_at)}
          </dd>
        </div>
      </dl>

      <section className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 text-sm text-slate-600">
        <p className="mb-2 font-semibold text-slate-900">
          Source &amp; freshness
        </p>
        <p>
          Sourced from the {licensee.source === "asic_connect" ? "ASIC Connect AFS register" : licensee.source}. Cached at most weekly. For a real-time check of conditions or
          authorised representatives, search ASIC Connect directly.
        </p>
      </section>

      {/* Advisers authorised under this licence — Adviser Register Atlas
          cross-link. Empty while the bundled extract is the synthetic
          preview, so nothing fictional can attach to a real licensee. */}
      {!registerMeta().sample && advisersForLicence(licensee.afsl_number).length > 0 && (
        <section className="border border-slate-200 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-slate-900">
            Financial advisers authorised under this licence
          </h2>
          <p className="text-sm text-slate-600">
            Current advisers on ASIC&apos;s Financial Advisers Register acting for this licensee.
          </p>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 overflow-hidden">
            {advisersForLicence(licensee.afsl_number).map((a) => (
              <li key={a.number}>
                <Link
                  href={`/adviser-register/${a.slug}`}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-medium text-slate-800">{a.name}</span>
                  <span className="text-xs text-slate-500">{a.role}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Fuzzy search — pre-seeded with this firm's name so users can explore
          related licences (e.g. a group with multiple AFSLs). */}
      <section className="border border-slate-200 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-slate-900">Search the AFSL Register</h2>
        <p className="text-sm text-slate-600">
          Search by firm name or AFSL number — pre-filled with &ldquo;{licensee.licensee_name}&rdquo; to show related licences.
        </p>
        <Suspense fallback={<div className="h-12 bg-slate-100 rounded-lg animate-pulse" />}>
          <AfslLookupClient initialQuery={licensee.licensee_name} />
        </Suspense>
      </section>

      <section className="border border-slate-100 rounded-xl pt-2 pb-1">
        <h2 className="font-semibold text-slate-900 px-5 pt-3 pb-3">Frequently asked questions</h2>
        <div className="space-y-2 px-5 pb-5">
          {afslFaqs.map((faq) => (
            <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3 font-semibold text-sm text-slate-900 list-none">
                {faq.q}
                <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
              </summary>
              <p className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="border border-slate-200 rounded-xl p-5 flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-[12rem]">
          <h2 className="font-semibold text-slate-900 mb-1">
            Looking for an advisor?
          </h2>
          <p className="text-sm text-slate-600">
            We help Australians find independent, AFSL-verified financial
            advisors. Tell us what you&rsquo;re investing in and we&rsquo;ll
            match you with up to three.
          </p>
        </div>
        <Link
          href="/find-advisor"
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Find an advisor →
        </Link>
      </section>
    </main>
  );
}
