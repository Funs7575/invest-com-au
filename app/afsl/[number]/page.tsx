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
import { notFound } from "next/navigation";
import {
  AFSL_STATUS_LABELS,
  getAfslLicensee,
  normaliseAfslNumber,
} from "@/lib/afsl-register";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

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

const AFSL_FAQS = faqJsonLd([
  {
    q: "What is an Australian Financial Services Licence (AFSL)?",
    a: "An Australian Financial Services Licence (AFSL) is a licence issued by the Australian Securities and Investments Commission (ASIC) that authorises a person or entity to provide financial services in Australia. These services include giving financial product advice, dealing in financial products, making a market for financial products, and operating a registered managed investment scheme. Holding a valid AFSL is a legal requirement under the Corporations Act 2001.",
  },
  {
    q: "How do I check if a financial advisor has a valid AFSL?",
    a: "You can verify an adviser's licence status on ASIC's Financial Advisers Register (FAR) at moneysmart.gov.au, or search the AFS Licensee register on ASIC Connect. Both tools are free. Look for a 'Current' status and confirm the AFSL number matches what the adviser has quoted. An adviser may also operate as an authorised representative under another entity's AFSL — this is also disclosed on the register.",
  },
  {
    q: "What does it mean if an AFSL is cancelled or suspended?",
    a: "A cancelled AFSL means the licensee is no longer authorised to provide financial services in Australia. A suspended AFSL means authorisation has been temporarily removed, typically while ASIC investigates potential misconduct. In either case, the firm or adviser cannot legally provide financial advice or deal in financial products. If your adviser's AFSL is cancelled or suspended you should stop dealing with them and contact ASIC or the Australian Financial Complaints Authority (AFCA) if you believe you have suffered a loss.",
  },
  {
    q: "What is the difference between a licensed adviser and an authorised representative?",
    a: "A licensed adviser holds their own AFSL issued directly by ASIC and is responsible for their own compliance obligations. An authorised representative is a person or entity that has been authorised by an AFSL holder to provide specific financial services on the licensee's behalf. The licensee is responsible for the conduct of its authorised representatives. Both must be listed on ASIC's registers, and both are legally required to act in your best interests.",
  },
  {
    q: "How do I lodge a complaint against an AFSL holder?",
    a: "First, raise your complaint directly with the licensee in writing. AFSL holders are required to have an internal dispute resolution (IDR) process and must respond within 30 days for most complaints. If you are not satisfied with the outcome, you can escalate to the Australian Financial Complaints Authority (AFCA) at afca.org.au — a free and independent external dispute resolution scheme. For serious misconduct such as fraud or suspected licence breaches, you can also report directly to ASIC.",
  },
]);

export default async function AfslLicenseePage({ params }: Props) {
  const { number } = await params;
  const normalised = normaliseAfslNumber(number);
  const licensee = normalised ? await getAfslLicensee(normalised) : null;

  if (!licensee) notFound();

  const statusLabel = AFSL_STATUS_LABELS[licensee.status];
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(AFSL_FAQS) }}
      />

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
