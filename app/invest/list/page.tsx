import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import ListingSubmitForm from "./ListingSubmitForm";

export const metadata: Metadata = {
  title: `List an Investment Opportunity — Reach Qualified Investors (${CURRENT_YEAR})`,
  description:
    "List your business, mining project, farmland, commercial property, franchise, renewable energy project, investment fund, or startup on Invest.com.au and reach qualified local and international investors.",
  alternates: { canonical: `${SITE_URL}/invest/list` },
  openGraph: {
    title: `List an Investment Opportunity on Invest.com.au (${CURRENT_YEAR})`,
    description:
      "Reach qualified Australian and international investors. List businesses, property, mining, farmland, energy projects, franchises, funds, and startups.",
    url: `${SITE_URL}/invest/list`,
  },
};

const TRUST_SIGNALS = [
  {
    icon: "users",
    title: "Qualified investor audience",
    desc: "Direct reach to local and international investors who are actively searching for opportunities.",
  },
  {
    icon: "globe",
    title: "International visibility",
    desc: "Listings are surfaced to FIRB-eligible foreign investors from 12 countries including USA, UK, Japan, and China.",
  },
  {
    icon: "shield",
    title: "Verified enquiries only",
    desc: "Investors must provide verified contact details before they can enquire — no spam, no tyre-kickers.",
  },
  {
    icon: "zap",
    title: "Live within 1–2 days",
    desc: "Our team reviews every listing for quality and compliance before publishing. Most go live the next business day.",
  },
];

export default function ListInvestmentPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Invest", url: `${SITE_URL}/invest` },
    { name: "List an Opportunity" },
  ]);

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-14 md:py-20">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-600" />
            <Link href="/invest" className="hover:text-white transition-colors">Invest</Link>
            <Icon name="chevron-right" size={12} className="text-slate-600" />
            <span className="text-slate-300">List an Opportunity</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-full mb-4">
                <Icon name="star" size={13} />
                Investment Marketplace
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4">
                List Your Investment Opportunity
              </h1>
              <p className="text-lg text-slate-300 leading-relaxed mb-6">
                Reach thousands of active investors — including international buyers from 12 countries — looking for businesses, property, mining projects, farmland, franchises, energy assets, funds, and startups.
              </p>
              <div className="flex flex-wrap gap-3">
                <span className="bg-slate-800 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-700">
                  ✅ From $99 / listing
                </span>
                <span className="bg-slate-800 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-700">
                  ✅ Live within 1–2 days
                </span>
                <span className="bg-slate-800 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-700">
                  ✅ FIRB-eligible buyers reached
                </span>
              </div>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "8", label: "Investment categories" },
                { value: "12", label: "Countries reached" },
                { value: "1–2 days", label: "Avg. time to publish" },
                { value: "$99+", label: "Starting price" },
              ].map((s) => (
                <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-5 text-center">
                  <p className="text-2xl font-extrabold text-amber-400 mb-1">{s.value}</p>
                  <p className="text-xs text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="py-10 bg-amber-50 border-b border-amber-100">
        <div className="container-custom">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TRUST_SIGNALS.map((t) => (
              <div key={t.title} className="flex gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon name={t.icon} size={18} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 mb-0.5">{t.title}</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form section */}
      <section className="py-14 bg-slate-50">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Main form */}
            <div className="lg:col-span-2">
              <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                <h2 className="text-xl font-extrabold text-slate-900 mb-1">Submit Your Listing</h2>
                <p className="text-sm text-slate-500 mb-8">Complete the steps below. Our team will review and publish within 1–2 business days.</p>
                <ListingSubmitForm />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* What happens next */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-4">What happens after you submit</h3>
                <div className="space-y-3">
                  {[
                    { step: "1", title: "Review", desc: "Our team checks your listing for accuracy, completeness, and compliance (usually within 24 hours)." },
                    { step: "2", title: "Confirmation", desc: "We email you to confirm the listing is live, with a link to your published page." },
                    { step: "3", title: "Enquiries", desc: "Interested investors submit enquiries through your listing — we forward them directly to you." },
                    { step: "4", title: "Renew or upgrade", desc: "When your listing is about to expire, you can renew or upgrade your plan at any time." },
                  ].map((s) => (
                    <div key={s.step} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-900 text-xs font-extrabold flex items-center justify-center shrink-0">
                        {s.step}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{s.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Who we reach */}
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3">International buyers we reach</h3>
                <div className="flex flex-wrap gap-2">
                  {["🇺🇸 USA", "🇬🇧 UK", "🇸🇦 Saudi Arabia", "🇯🇵 Japan", "🇨🇳 China", "🇸🇬 Singapore", "🇮🇳 India", "🇭🇰 HK", "🇰🇷 Korea", "🇦🇪 UAE", "🇲🇾 Malaysia", "🇳🇿 New Zealand"].map((c) => (
                    <span key={c} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-medium">
                      {c}
                    </span>
                  ))}
                </div>
                <Link
                  href="/foreign-investment"
                  className="inline-flex items-center gap-1 text-amber-600 text-xs font-semibold mt-3 hover:text-amber-800"
                >
                  About international investors
                  <Icon name="arrow-right" size={11} />
                </Link>
              </div>

              {/* Need help */}
              <div className="bg-slate-900 text-white rounded-xl p-6">
                <h3 className="text-sm font-bold mb-2">Need help with your listing?</h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Our team can help you write a compelling listing description, choose the right category, and maximise your enquiry rate.
                </p>
                <a
                  href="mailto:listings@invest.com.au"
                  className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs px-4 py-2.5 rounded-lg transition-colors"
                >
                  <Icon name="mail" size={13} />
                  listings@invest.com.au
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 bg-white border-t border-slate-100">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-5">
            {[
              {
                q: "How long does it take for my listing to go live?",
                a: "Our team reviews all listings for quality and compliance. Most listings are published within 1–2 business days. We&apos;ll email you when your listing is live.",
              },
              {
                q: "Do I need to be an AFSL holder to list?",
                a: "You do not need an AFSL to list a business for sale, farmland, or a commercial property. However, listings for investment funds or financial products may require compliance with ASIC regulations. We recommend getting legal advice if you&apos;re unsure.",
              },
              {
                q: "Can international sellers list on the platform?",
                a: "Yes. Overseas sellers, developers, and fund managers can list opportunities that are available to Australian residents or have Australian assets. Listings are reviewed by our team to ensure they meet our quality standards.",
              },
              {
                q: "How are enquiries delivered to me?",
                a: "When an investor submits an enquiry through your listing, we forward their details directly to your contact email. You can then follow up directly with the investor.",
              },
              {
                q: "What is the difference between Featured and Premium?",
                a: "Featured listings appear above Standard listings in search results and have a Featured badge. Premium listings get top placement across all relevant pages, a social media boost, and a dedicated account manager to help maximise your enquiry rate.",
              },
              {
                q: "Can I update my listing after it&apos;s published?",
                a: "Yes. Email listings@invest.com.au with your changes and we will update the listing within 1 business day. Significant changes may require a brief re-review.",
              },
            ].map((faq) => (
              <div key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-2">{faq.q}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-12 bg-amber-50 border-t border-amber-100">
        <div className="container-custom text-center">
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">Looking to Invest, Not Sell?</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            Browse active investment listings across all categories — businesses, mining, farmland, property, funds, and more.
          </p>
          <Link
            href="/invest/listings"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Browse All Listings
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
