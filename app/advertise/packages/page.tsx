import type { Metadata } from "next";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import PackagesClient from "./PackagesClient";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://invest.com.au";

export const metadata: Metadata = {
  title: `Advertise on ${SITE_NAME} — Sponsorship Packages`,
  description:
    "Self-serve sponsorship packages for brokers and financial brands. Featured Partner, Category Sponsor, and Deal of the Month placements on Australia's leading investing comparison site.",
  alternates: { canonical: `${siteUrl}/advertise/packages` },
  openGraph: {
    title: `Advertise on ${SITE_NAME} — Sponsorship Packages`,
    description:
      "Self-serve sponsorship packages for brokers and financial brands. Featured Partner, Category Sponsor, and Deal of the Month placements.",
    url: absoluteUrl("/advertise/packages"),
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Advertise on ${SITE_NAME} — Sponsorship Packages`,
    description:
      "Self-serve sponsorship packages for brokers and financial brands.",
  },
  robots: { index: false, follow: false },
};

const TIERS = [
  {
    id: "featured_partner" as const,
    name: "Featured Partner",
    price: 2000,
    period: "/mo",
    description:
      "Maximum visibility across the entire site. Your brand appears first on compare pages, quiz results, and category listings with a Featured Partner badge.",
    impressions: "~80,000/mo",
    includes: [
      "Top position on all compare and category pages",
      '"Featured Partner" badge sitewide',
      "Priority placement in quiz results",
      "Homepage hero placement",
      "Dedicated account manager",
      "Monthly performance & conversion reports",
      "Custom deal/promo banner sitewide",
    ],
    placement:
      "Compare page top slot, homepage hero, quiz results boost, all best-broker category pages",
    highlight: true,
  },
  {
    id: "category_sponsor" as const,
    name: "Category Sponsor",
    price: 500,
    period: "/mo",
    description:
      "Own a specific best-broker category page. Ideal for niche brokers wanting to dominate a segment like beginners, SMSF, or US shares.",
    impressions: "~5,000-15,000/mo per category",
    includes: [
      "Top position on your chosen category page",
      '"Category Sponsor" badge on that page',
      "Enhanced broker card with promo text",
      "Sidebar placement on related articles",
      "Monthly impressions & click report",
    ],
    placement:
      "Top of your selected /best/{category} page with sponsor badge and enhanced listing",
    highlight: false,
  },
  {
    id: "deal_of_month" as const,
    name: "Deal of the Month",
    price: 300,
    period: "/mo",
    description:
      "Highlight your latest promotion across the site. Perfect for sign-up bonuses, fee-free periods, or cashback offers.",
    impressions: "~40,000/mo",
    includes: [
      "Deal banner on homepage and deals page",
      '"Deal of the Month" badge',
      "Inclusion in weekly email newsletter",
      "Social media promotion (1 post)",
      "Deal carousel placement sitewide",
    ],
    placement:
      "Homepage deal banner, /deals page featured slot, email newsletter, social media",
    highlight: false,
  },
];

const FAQS = [
  {
    question: "How does self-serve sponsorship work?",
    answer:
      "Choose your tier, select a duration, and complete payment via Stripe. Your sponsorship is activated within 1 business day after payment. You'll receive a confirmation email with your start date, reporting dashboard access, and account manager contact details.",
  },
  {
    question: "How long do sponsorships last?",
    answer:
      "Sponsorships run for 1, 3, 6, or 12 months. Longer commitments receive volume discounts: 10% off for 3 months, 20% off for 6 months, and 30% off for 12 months. Sponsorships do not auto-renew — we'll contact you before expiry to discuss renewal.",
  },
  {
    question: "What reporting do I get?",
    answer:
      "All tiers include monthly performance reports showing impressions, clicks, click-through rate, and estimated conversions. Featured Partner tier includes a dedicated account manager and custom reporting. Reports are delivered via email on the 1st of each month.",
  },
  {
    question: "Can I change my sponsorship tier mid-contract?",
    answer:
      "Yes. You can upgrade at any time and we'll pro-rate the difference. Downgrades take effect at the end of your current billing period. Contact your account manager or email partners@invest.com.au to make changes.",
  },
  {
    question: "Is there editorial independence?",
    answer:
      "Absolutely. Sponsorship affects placement position and badging only — never our editorial ratings, review content, or methodology scores. All sponsored placements are clearly labelled. Our editorial team operates independently from commercial partnerships.",
  },
];

export default function PackagesPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="bg-slate-900 text-white py-16 md:py-24">
        <div className="container-custom text-center">
          <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full mb-4 uppercase tracking-widest">
            Sponsorship Packages
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 max-w-3xl mx-auto leading-tight">
            Promote your brand to Australian investors
          </h1>
          <p className="text-slate-300 text-base md:text-lg max-w-2xl mx-auto">
            Self-serve sponsorship packages with transparent pricing, guaranteed
            placement, and monthly performance reporting. No lock-in beyond your
            chosen duration.
          </p>
        </div>
      </section>

      {/* Tier Overview Cards */}
      <section className="py-12 md:py-16">
        <div className="container-custom">
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`rounded-xl border p-6 flex flex-col ${
                  tier.highlight
                    ? "border-emerald-300 bg-white ring-2 ring-emerald-200"
                    : "border-slate-200 bg-white"
                }`}
              >
                {tier.highlight && (
                  <span className="self-start text-[0.65rem] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-widest mb-2">
                    Most Popular
                  </span>
                )}
                <h2 className="text-lg font-extrabold text-slate-900">
                  {tier.name}
                </h2>
                <div className="mt-2 mb-3">
                  <span className="text-3xl font-extrabold text-slate-900">
                    ${tier.price.toLocaleString()}
                  </span>
                  <span className="text-sm text-slate-500">{tier.period}</span>
                </div>
                <p className="text-sm text-slate-600 mb-4">
                  {tier.description}
                </p>

                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Estimated impressions
                  </p>
                  <p className="text-sm font-bold text-slate-900">
                    {tier.impressions}
                  </p>
                </div>

                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Placement preview
                  </p>
                  <p className="text-xs text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100">
                    {tier.placement}
                  </p>
                </div>

                <div className="mb-6 flex-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    What&apos;s included
                  </p>
                  <ul className="space-y-1.5">
                    {tier.includes.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-sm text-slate-700"
                      >
                        <svg
                          className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <a
                  href={`#checkout`}
                  className="block text-center px-6 py-3 bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Get Started
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Checkout Section */}
      <section id="checkout" className="py-12 md:py-16 bg-white border-t border-slate-200">
        <div className="container-custom">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              Configure Your Sponsorship
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Select your tier and duration, then proceed to secure checkout
            </p>
          </div>
          <PackagesClient />
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 md:py-16 bg-slate-50 border-t border-slate-200">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <div
                key={faq.question}
                className="bg-white rounded-xl border border-slate-200 p-5"
              >
                <h3 className="font-bold text-slate-900 mb-2">
                  {faq.question}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Fallback */}
      <section className="py-12 md:py-16 bg-slate-900 text-white text-center">
        <div className="container-custom">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-3">
            Need a custom package?
          </h2>
          <p className="text-slate-300 mb-6 max-w-lg mx-auto">
            We offer bespoke sponsorship arrangements for enterprise clients.
            Get in touch to discuss your requirements.
          </p>
          <a
            href="mailto:partners@invest.com.au"
            className="inline-block px-8 py-3 bg-emerald-600 text-white font-bold text-sm rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Contact Sales
          </a>
        </div>
      </section>
    </div>
  );
}
