/**
 * /afsl-lookup — public AFSL register search tool.
 *
 * SEO + advisor lead-gen flywheel: lets anyone verify an Australian Financial
 * Services Licence by firm name or number, see status + condition summaries,
 * and jump to a matching advisor profile in our directory where one exists.
 *
 * This is a FACTUAL public-register lookup — no advice. The interactive search
 * lives in the `AfslLookupClient` island; this server component owns metadata,
 * the breadcrumb JSON-LD, the source disclosure and the find-an-advisor CTA.
 *
 * ISR: 24h. The page shell is static; results are fetched client-side from
 * `/api/afsl-search`, which has its own short edge cache.
 */

import type { Metadata } from "next";
import Link from "next/link";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  CURRENT_YEAR,
  SITE_NAME,
} from "@/lib/seo";
import AfslLookupClient from "./AfslLookupClient";

export const revalidate = 86400;

const TITLE = `AFSL Lookup — Verify an Australian Financial Services Licence (${CURRENT_YEAR})`;
const DESCRIPTION =
  "Free AFSL lookup: search the Australian Financial Services Licence register by firm name or AFSL number. Check licence status, conditions, and find verified advisors.";

export const metadata: Metadata = {
  title: `${TITLE} | ${SITE_NAME}`,
  description: DESCRIPTION,
  alternates: { canonical: "/afsl-lookup" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/afsl-lookup"),
    images: [
      {
        url: "/api/og?title=AFSL+Lookup&subtitle=Verify+a+Financial+Services+Licence&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

export default function AfslLookupPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "AFSL Lookup" },
  ]);

  // WebApplication JSON-LD — this is a search utility, not an article.
  const appJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "AFSL Lookup",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/afsl-lookup"),
    description: DESCRIPTION,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "AUD",
    },
    isAccessibleForFree: true,
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-700">
          Home
        </Link>
        <span aria-hidden className="mx-1.5">
          /
        </span>
        <span className="text-slate-700">AFSL Lookup</span>
      </nav>

      <header className="space-y-3">
        <div className="text-xs uppercase tracking-wider text-slate-500">
          Public register tool
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
          AFSL Lookup
        </h1>
        <p className="text-slate-600">
          Search the Australian Financial Services Licence (AFSL) register by
          firm name or licence number. Check whether a licence is current, see
          any conditions on file, and link through to a verified advisor profile
          where we hold one.
        </p>
      </header>

      <AfslLookupClient />

      <section className="border border-slate-200 rounded-xl p-5 bg-slate-50/50 text-sm text-slate-600">
        <p className="mb-2 font-semibold text-slate-900">Source &amp; freshness</p>
        <p>
          Results are drawn from our cache of the ASIC Australian Financial
          Services (AFS) register, refreshed at most weekly. This is an
          information tool only and is not financial product advice. For the
          authoritative, real-time record — including the full list of
          authorised representatives under a licence — search{" "}
          <a
            href="https://connectonline.asic.gov.au/"
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline hover:text-slate-900"
          >
            ASIC Connect
          </a>{" "}
          directly.
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
          Find an advisor &rarr;
        </Link>
      </section>
    </main>
  );
}
