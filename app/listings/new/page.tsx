import type { Metadata } from "next";

import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { RETAIL_CTAS } from "@/lib/consumer-copy";
import ListingNewClient from "./ListingNewClient";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Post a Listing — Sell with Us (${CURRENT_YEAR}) — Invest.com.au`,
  description:
    "List your property, business, syndicate or asset opportunity for Australian investors to discover. Admin-reviewed before going live. You stay in control of who you talk to.",
  alternates: { canonical: `${SITE_URL}/listings/new` },
  robots: { index: true, follow: true },
};

const TRUST_BLOCKS = [
  {
    title: "Admin-reviewed before going live",
    desc: "Every listing is checked by our team before it appears publicly. Usually within a business day.",
  },
  {
    title: "You stay in control",
    desc: "Investors can request more info via a Match Request — you decide who to engage.",
  },
  {
    title: "Free to list",
    desc: "Owner submissions are free. Paid placement options are coming for premium visibility.",
  },
  {
    title: "Compliance built in",
    desc: "We help with disclosures and FIRB-eligibility flags so the right investors find you.",
  },
];

export default function NewListingPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Listings", url: `${SITE_URL}/listings` },
    { name: "Post a Listing" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20">
          <div className="text-center">
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3">
              {RETAIL_CTAS.createBriefForRoute.listing_brief} · Australia
            </p>
            <h1 className="text-3xl sm:text-5xl font-extrabold mb-4">
              Post a listing
            </h1>
            <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Selling a property, business, syndicate stake or asset?
              Get in front of Australian investors who are already looking.
              Admin-reviewed, free to list.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 max-w-4xl mx-auto mt-12">
            {TRUST_BLOCKS.map((t) => (
              <div
                key={t.title}
                className="bg-white/5 rounded-xl p-4 border border-white/10"
              >
                <p className="text-sm font-bold text-white mb-1">{t.title}</p>
                <p className="text-xs text-slate-400 leading-snug">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4">
          <ListingNewClient />
        </div>
      </section>
    </>
  );
}
