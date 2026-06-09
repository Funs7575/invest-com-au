import type { Metadata } from "next";
import Link from "next/link";
import {
  LIFE_EVENTS,
  LIFE_EVENT_CATEGORIES,
  buildLifeEventUrl,
} from "@/lib/life-events";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Find a Financial Advisor for Your Life Event | Invest.com.au",
  description:
    "Major life events — first home, new baby, business sale, retirement. Tell us what's happening and we'll match you with the right licensed adviser.",
  alternates: { canonical: `${SITE_URL}/find-advisor/life-event` },
  openGraph: {
    title: "Find a Financial Advisor for Your Life Event",
    description:
      "Match with the right type of financial professional based on what's happening in your life right now.",
    url: `${SITE_URL}/find-advisor/life-event`,
    type: "website",
    images: [{ url: `/api/og?title=${encodeURIComponent("Find an Advisor for Your Life Event")}&sub=${encodeURIComponent("Marriage · Kids · Retirement · Inheritance · Matched Free")}`, width: 1200, height: 630 }],
  },
};

const breadcrumb = breadcrumbJsonLd([
  { name: "Home", url: "/" },
  { name: "Find an Advisor", url: "/find-advisor" },
  { name: "By Life Event", url: "/find-advisor/life-event" },
]);

const faq = faqJsonLd([
  {
    q: "Why should I use a life event to find an advisor?",
    a: "Major life changes — buying a home, having a baby, getting married, selling a business — each need a specific type of financial professional. Describing your situation upfront lets us skip generic questions and route you straight to the right specialist.",
  },
  {
    q: "What if my life event isn't listed?",
    a: "You can always use the standard 'find by goal' flow, which lets you describe your financial priority in four categories: Buy Property, Grow Wealth, Protect Assets, or Tax & SMSF. Every advisor on the platform accepts enquiries through that path too.",
  },
  {
    q: "Is the matching service free?",
    a: "Yes, completely free. We're paid by advisors when they accept a lead — you never pay for the matching service. Your details are shared with one matched advisor only; we don't sell your information.",
  },
  {
    q: "How quickly will the advisor respond?",
    a: "Most advisors on the platform respond within 24 hours. You can see each advisor's typical response time on their profile before confirming the match.",
  },
]);

export default function LifeEventPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }}
      />

      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
        {/* Hero */}
        <div className="max-w-4xl mx-auto px-4 pt-10 pb-4">
          <nav aria-label="Breadcrumb" className="text-xs text-slate-400 mb-6">
            <Link href="/" className="hover:text-slate-700 transition-colors">
              Home
            </Link>
            <span className="mx-1.5 text-slate-300">/</span>
            <Link
              href="/find-advisor"
              className="hover:text-slate-700 transition-colors"
            >
              Find an Advisor
            </Link>
            <span className="mx-1.5 text-slate-300">/</span>
            <span className="text-slate-600 font-medium">By Life Event</span>
          </nav>

          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Life-event matching
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 leading-tight">
              What&apos;s happening in your life right now?
            </h1>
            <p className="text-base md:text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Major life events come with financial decisions that are hard to get
              right alone. Choose your situation and we&apos;ll match you with the
              right type of professional — free, in seconds.
            </p>
          </div>
        </div>

        {/* Life event grid grouped by category */}
        <div className="max-w-4xl mx-auto px-4 pb-16">
          {LIFE_EVENT_CATEGORIES.map((cat) => {
            const events = LIFE_EVENTS.filter((e) => e.category === cat.id);
            if (events.length === 0) return null;
            return (
              <section key={cat.id} className="mb-10" aria-labelledby={`cat-${cat.id}`}>
                <h2
                  id={`cat-${cat.id}`}
                  className="flex items-center gap-2 text-base font-bold text-slate-700 mb-4"
                >
                  <span aria-hidden="true" className="text-xl">{cat.emoji}</span>
                  {cat.label}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {events.map((event) => (
                    <Link
                      key={event.id}
                      href={buildLifeEventUrl(event)}
                      className="group flex items-start gap-4 p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-amber-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                    >
                      <div
                        className="text-3xl shrink-0 leading-none mt-0.5"
                        aria-hidden="true"
                      >
                        {event.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 mb-1 leading-tight">
                          {event.title}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed mb-2.5">
                          {event.subtitle}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {event.suggestedTypes.slice(0, 2).map((t) => (
                            <span
                              key={t}
                              className="text-[0.62rem] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full"
                            >
                              {t}
                            </span>
                          ))}
                          {event.relatedHub && (
                            <span className="text-[0.62rem] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
                              Guide available
                            </span>
                          )}
                        </div>
                      </div>
                      <svg
                        className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors shrink-0 mt-1.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}

          {/* Fallback CTA */}
          <div className="mt-4 text-center py-10 border-t border-slate-100">
            <p className="text-sm text-slate-500 mb-4">
              Don&apos;t see your situation listed above?
            </p>
            <Link
              href="/find-advisor"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 text-sm font-bold rounded-xl transition-colors shadow-sm hover:shadow-md"
            >
              Find by financial goal instead
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* FAQ */}
          <section className="mt-8" aria-labelledby="faq-heading">
            <h2 id="faq-heading" className="text-xl font-bold text-slate-900 mb-5">
              Common questions
            </h2>
            <div className="space-y-3">
              {[
                {
                  q: "Why should I use a life event to find an advisor?",
                  a: "Major life changes each need a specific type of financial professional. Choosing your situation upfront skips generic questions and routes you straight to the right specialist — saving time for both you and the advisor.",
                },
                {
                  q: "What if my life event isn't listed?",
                  a: "Use the standard 'find by goal' flow. It covers four categories — Buy Property, Grow Wealth, Protect Assets, and Tax & SMSF — and every advisor accepts enquiries through that path too.",
                },
                {
                  q: "Is the matching service free?",
                  a: "Yes, completely free. We're paid by advisors when they accept a lead — you never pay for matching. Your details go to one matched advisor only; we never sell your information.",
                },
                {
                  q: "How quickly will the advisor respond?",
                  a: "Most advisors respond within 24 hours. You can see each advisor's typical response time on their profile before confirming the match.",
                },
              ].map(({ q, a }) => (
                <details
                  key={q}
                  className="group border border-slate-200 rounded-xl overflow-hidden"
                >
                  <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors list-none">
                    <span className="text-sm font-semibold text-slate-800 pr-4">{q}</span>
                    <svg
                      className="w-4 h-4 text-slate-400 shrink-0 transition-transform group-open:rotate-180"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
                    {a}
                  </div>
                </details>
              ))}
            </div>
          </section>
        </div>

        {/* Trust signals */}
        <div className="border-t border-slate-100 py-8 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {[
              "ASIC-verified professionals",
              "100% free to use",
              "Your details shared with one advisor only",
              "No spam — ever",
            ].map((t) => (
              <span key={t} className="flex items-center gap-2 text-xs text-slate-500">
                <svg
                  className="w-3.5 h-3.5 text-emerald-500 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
