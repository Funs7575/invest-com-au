import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import JobPostForm from "./JobPostForm";
import { auctionRoundsEnabled } from "@/lib/auction-rounds";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Post a Request — Get Quotes from Verified Advisors (${CURRENT_YEAR})`,
  description:
    "Post a request for mortgage, financial planning, tax, SMSF, or property advice. Verified advisors quote you — free to post, free to compare, no obligation.",
  alternates: { canonical: `${SITE_URL}/quotes/post` },
};

const TRUST = [
  { icon: "shield-check", title: "Verified advisors only", desc: "Every advisor on Invest.com.au has had their AFSL, ASIC registration, or TPB licence verified." },
  { icon: "wallet", title: "Free to post", desc: "Posting and reviewing quotes costs nothing. You only engage if you find the right fit." },
  { icon: "clock", title: "Quotes within 72 hours", desc: "Most jobs receive 3–5 quotes within the first day. The auction window stays open for 72h." },
  { icon: "users", title: "You pick the winner", desc: "Compare quotes, advisor profiles, ratings, and credentials side-by-side. Choose on your terms." },
];

export default async function PostJobPage() {
  // Idea #11 — gate the sealed-bidding option in the form. The server route
  // /api/quotes re-checks this flag on submit, so the UI is purely cosmetic;
  // ISR staleness (revalidate=3600) can't let a sealed auction through when off.
  const sealedOptionEnabled = await auctionRoundsEnabled();
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Quotes", url: `${SITE_URL}/quotes` },
    { name: "Post a Request" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      {/* Compact light header (B9 restyle) */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 pt-4 pb-5 md:pt-5">
          <nav aria-label="Breadcrumb" className="mb-1.5 text-[11px] md:text-xs text-slate-500">
            <Link href="/" className="hover:text-slate-700">Home</Link>
            <span className="mx-1.5" aria-hidden>/</span>
            <Link href="/quotes" className="hover:text-slate-700">Quotes</Link>
            <span className="mx-1.5" aria-hidden>/</span>
            <span className="text-slate-600">Post a Request</span>
          </nav>
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-[1.9rem]">
            Post a request — <span className="text-coral-600">verified advisors will quote you</span>
          </h1>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-snug text-slate-500 md:text-[13.5px]">
            Post what you need help with — mortgage, financial planning, SMSF, tax, property, insurance — and Australian advisors will compete for your business. You pick. Free to post.
          </p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-4">
            {TRUST.map((t) => (
              <div key={t.title} className="rounded-lg border border-slate-200 bg-white p-3">
                <Icon name={t.icon} size={16} className="text-amber-600 mb-1.5" />
                <p className="text-xs font-bold text-slate-900">{t.title}</p>
                <p className="mt-0.5 text-[11px] text-slate-500 leading-snug">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="bg-slate-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <JobPostForm sealedOptionEnabled={sealedOptionEnabled} />
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-8">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 text-center">How it works</h2>
          <p className="text-sm text-slate-500 mb-10 text-center">Like Airtasker, but for financial advice.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { n: 1, title: "Tell us what you need", desc: "A 2-min form: your situation, advisor types you want, budget band, state." },
              { n: 2, title: "Advisors quote you", desc: "Verified advisors send fixed-fee or hourly quotes within 72 hours. You see their profile, rating, and credentials." },
              { n: 3, title: "Pick your favourite", desc: "Compare, message via the platform, accept the bid you like. No fee until you engage." },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="w-12 h-12 bg-amber-500 text-slate-900 rounded-full font-extrabold flex items-center justify-center mx-auto mb-3 text-lg">
                  {s.n}
                </div>
                <p className="font-bold text-slate-900 mb-1">{s.title}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
