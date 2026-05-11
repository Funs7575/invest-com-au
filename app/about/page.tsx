import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import {
  GENERAL_ADVICE_WARNING,
  AFSL_STATUS_DISCLOSURE,
  COMPANY_LEGAL_NAME,
  COMPANY_ACN,
  COMPANY_ABN,
} from "@/lib/compliance";

export const revalidate = 86400;

export const metadata = {
  title: "About Us",
  description: "Learn about Invest.com.au, Australia's independent investing hub — platforms and advisors. Our mission, editorial independence pledge, and review methodology.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Us",
    description: "Australia's independent investing hub — platforms and advisors. Our mission, editorial independence pledge, and review methodology.",
    url: "/about",
    images: [
      {
        url: "/api/og?title=About+Invest.com.au&subtitle=Australia's+Independent+Platform+Comparison&type=default",
        width: 1200,
        height: 630,
        alt: "About Invest.com.au",
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
};

const METHODOLOGY = [
  { name: "Fees & Costs", desc: "ASX brokerage, US share fees, FX conversion rates, inactivity fees, account fees, and hidden charges.", weight: "30%" },
  { name: "Platform & Features", desc: "Trading tools, charting, mobile app quality, order types, research resources, and educational content.", weight: "20%" },
  { name: "Safety & Regulation", desc: "CHESS sponsorship, ASIC regulation, client money segregation, insurance, and company track record.", weight: "20%" },
  { name: "Product Range", desc: "ASX shares, US/international markets, ETFs, options, crypto, managed funds, and SMSF support.", weight: "15%" },
  { name: "User Experience", desc: "Account opening speed, funding options, customer support quality, and onboarding process.", weight: "10%" },
  { name: "Value Extras", desc: "Fractional shares, auto-invest, dividend reinvestment plans, educational tools, and community features.", weight: "5%" },
];

export default function AboutPage() {
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "About Us" },
  ]);

  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
    />
    <div className="py-5 md:py-12">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <div className="text-sm text-slate-600 mb-6">
            <Link href="/" className="hover:text-brand">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-brand">About Us</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold mb-8">About Invest.com.au</h1>

          {/* Who We Are */}
          <section className="mb-10">
            <h2 className="text-2xl font-extrabold text-brand mb-3">Who We Are</h2>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p className="text-lg">
                {COMPANY_LEGAL_NAME} (ACN {COMPANY_ACN}, ABN {COMPANY_ABN}),
                trading as Invest.com.au, is Australia&apos;s independent investing hub. We help
                everyday Australians compare investing platforms and find verified financial advisors — without bank bias or paid rankings.
              </p>
              <p>
                The Australian financial services market is confusing. Platforms charge hidden fees, comparison sites
                rank whoever pays them the most, and finding a trustworthy advisor feels impossible.
                We built Invest.com.au to change that.
              </p>
              <p>
                Our team compares every major Australian platform on real data — fees, features, safety, and
                user experience. We also connect you with verified financial professionals (SMSF accountants,
                financial planners, tax agents, and more) so you can make informed decisions in minutes, not hours.
              </p>
            </div>
          </section>

          {/* Editorial Independence Pledge */}
          <section className="mb-10">
            <div className="bg-slate-800 text-white rounded-xl p-6 md:p-8">
              <h2 className="text-2xl font-extrabold mb-4">Editorial Independence Pledge</h2>
              <div className="space-y-3 text-slate-200 leading-relaxed">
                <p>
                  We take editorial independence seriously. Every review, rating, and comparison
                  on Invest.com.au is based on our independent analysis — never influenced by commercial relationships.
                </p>
                <ul className="space-y-2 mt-4">
                  <li className="flex items-start gap-3">
                    <span className="text-amber font-bold shrink-0">1.</span>
                    <span><strong className="text-white">Rankings are data-driven.</strong> Our ratings are based on real fee data, platform features, and user experience — not who pays us the most.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber font-bold shrink-0">2.</span>
                    <span><strong className="text-white">Monetisation is transparent.</strong> We earn affiliate commissions when you sign up through our links. This never affects rankings.{" "}
                      <Link href="/how-we-earn" className="text-amber underline underline-offset-2">Learn more</Link>.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber font-bold shrink-0">3.</span>
                    <span><strong className="text-white">We review everyone.</strong> Every platform on our site is reviewed using the same methodology, whether they have an affiliate relationship with us or not.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-amber font-bold shrink-0">4.</span>
                    <span><strong className="text-white">Scenario-based comparisons.</strong> Instead of one-size-fits-all lists, we help you compare platforms for your specific situation.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Review Methodology */}
          <section className="mb-10">
            <h2 className="text-2xl font-extrabold text-brand mb-3">Review Methodology</h2>
            <p className="text-slate-700 mb-6 leading-relaxed">
              Every platform on Invest.com.au is scored across six dimensions, each weighted
              to reflect what matters most to Australian investors. Here&apos;s how we calculate our ratings:
            </p>
            <div className="space-y-3">
              {METHODOLOGY.map((item) => (
                <div key={item.name} className="border border-slate-200 rounded-xl p-4 flex items-start gap-4">
                  <div className="shrink-0 w-14 h-14 rounded-lg bg-amber/10 flex items-center justify-center">
                    <span className="text-amber font-extrabold text-sm">{item.weight}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900">{item.name}</h3>
                    <p className="text-sm text-slate-600 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Link href="/methodology" className="text-sm text-slate-700 font-semibold hover:text-slate-900 transition-colors">
                Read our full methodology →
              </Link>
            </div>
          </section>

          {/* Editorial Team */}
          <section className="mb-10">
            <h2 className="text-2xl font-extrabold text-brand mb-3">Editorial Structure</h2>
            <p className="text-slate-700 mb-6 leading-relaxed">
              Every article, review, and comparison on Invest.com.au is produced and
              fact-checked by qualified financial professionals operating independently
              of our commercial relationships.
            </p>
            <div className="space-y-3">
              {[
                {
                  tier: "Tier 1 — Expert Deep-Dive Guides",
                  desc: "In-depth pillar articles are authored by named financial professionals with relevant qualifications (CFP, CPA, RG146). Each article displays the author's credentials and Person schema. Authored under the editorial oversight of Invest.com.au Pty Ltd.",
                  badge: "Named author · Person schema",
                },
                {
                  tier: "Tier 2 — Platform Reviews & Comparisons",
                  desc: "Platform comparisons, fee reviews, and category articles are produced by the invest.com.au Research Team — in-house analysts who maintain our 6-factor rating database and conduct quarterly fee audits across every listed platform.",
                  badge: "invest.com.au Research Team",
                },
                {
                  tier: "Compliance & Accuracy Review",
                  desc: "All content is reviewed for factual accuracy and ASIC compliance before publication. Financial data is sourced from product disclosure statements (PDS) and verified against product issuer websites. Corrections policy: errors are corrected within 24 hours of identification.",
                  badge: "Independent review",
                },
              ].map((item) => (
                <div key={item.tier} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-bold text-slate-900">{item.tier}</h3>
                    <span className="shrink-0 text-xs bg-amber/10 text-amber-700 font-medium px-2 py-0.5 rounded-full">{item.badge}</span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* What We Cover */}
          <section className="mb-10">
            <h2 className="text-2xl font-extrabold text-brand mb-3">What We Cover</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                "ASX Share Trading",
                "US & International Shares",
                "ETFs & Index Funds",
                "CHESS Sponsorship",
                "SMSF Brokers",
                "Crypto Exchanges",
                "Options Trading",
                "Fee Calculators",
                "Investing Guides",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                  <span className="text-amber font-bold">&#10003;</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Disclaimers */}
          <section>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
              <h3 className="font-extrabold text-lg">Disclaimers</h3>
              <div className="text-sm text-slate-600 space-y-3 leading-relaxed">
                <p>
                  <strong>General Advice Warning:</strong> {GENERAL_ADVICE_WARNING}
                </p>
                <p>
                  <strong>Accuracy:</strong> While we strive to keep all information accurate and up to date,
                  we cannot guarantee the completeness or accuracy of information on this site. Always verify
                  information with the product issuer before making a decision.
                </p>
                <p>
                  <strong>Past Performance:</strong> Past performance is not a reliable indicator of future performance.
                  Investment returns can go up and down, and you may receive back less than you invested.
                </p>
                <p>
                  <strong>AFSL Status:</strong> {AFSL_STATUS_DISCLOSURE}
                </p>
              </div>
            </div>
          </section>

          {/* Bottom CTA */}
          <div className="mt-10 text-center">
            <Link href="/compare" className="inline-block px-8 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors">
              Compare All Platforms
            </Link>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
