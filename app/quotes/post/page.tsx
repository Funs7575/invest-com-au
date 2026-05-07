import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import JobPostForm from "./JobPostForm";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Post a Request — Get Quotes from Verified Advisors (${CURRENT_YEAR})`,
  description:
    "Tell us what you need help with — mortgage, financial planning, tax, SMSF, property — and have verified Australian advisors quote you. Free to post, free to compare, no obligation.",
  alternates: { canonical: `${SITE_URL}/quotes/post` },
};

const TRUST = [
  { icon: "shield-check", title: "Verified advisors only", desc: "Every advisor on Invest.com.au has had their AFSL, ASIC registration, or TPB licence verified." },
  { icon: "wallet", title: "Free to post", desc: "Posting and reviewing quotes costs nothing. You only engage if you find the right fit." },
  { icon: "clock", title: "Quotes within 72 hours", desc: "Most jobs receive 3–5 quotes within the first day. The auction window stays open for 72h." },
  { icon: "users", title: "You pick the winner", desc: "Compare quotes, advisor profiles, ratings, and credentials side-by-side. Choose on your terms." },
];

export default function PostJobPage() {
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

      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20">
          <div className="text-center">
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3">
              Free advisor quotes — Australia-wide
            </p>
            <h1 className="text-3xl sm:text-5xl font-extrabold mb-4">
              Post a request — verified advisors will quote you
            </h1>
            <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Post what you need help with — mortgage, financial planning, SMSF, tax, property, insurance — and Australian advisors will compete for your business. You pick. Free to post.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 max-w-4xl mx-auto mt-12">
            {TRUST.map((t) => (
              <div key={t.title} className="bg-white/5 rounded-xl p-4 border border-white/10">
                <Icon name={t.icon} size={20} className="text-amber-400 mb-2" />
                <p className="text-sm font-bold text-white mb-1">{t.title}</p>
                <p className="text-xs text-slate-400 leading-snug">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="bg-slate-50 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4">
          <JobPostForm />
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-12 sm:py-16">
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
