import Link from "next/link";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";

const HOW_WE_EARN_FAQS = [
  {
    q: "Does clicking your affiliate links cost me anything extra?",
    a: "No. Broker fees — brokerage rates, account fees, and FX charges — are identical whether you sign up through our links or go directly to the broker's website. Brokers pay us a referral commission from their own marketing budget; this cost is never passed on to you. The comparison data (fees, ratings, product details) we display is factual and the same regardless of whether a broker has an affiliate arrangement with us.",
  },
  {
    q: "Do you sell my personal data to advertisers or brokers?",
    a: "No. We do not sell, rent, or share your personal data with third-party advertisers, data brokers, or platforms listed on the site. Revenue comes from platform referral commissions and per-enquiry fees from advisors — not from monetising user data. Our privacy policy explains exactly what data we collect and how it is used.",
  },
  {
    q: "Can I trust your comparison data if brokers pay to appear on the site?",
    a: "Yes. Comparison table data — fees, CHESS sponsorship status, asset coverage, and product details — is sourced from product disclosure statements and broker pricing pages, not provided by the brokers themselves. Commercial relationships (affiliate deals, sponsored placements) are disclosed separately and do not affect the factual data. Sponsored placements are always clearly labelled and separated from organic comparison results.",
  },
  {
    q: "Do financial advisors pay to be listed in your directory?",
    a: "Advisors may pay a per-enquiry fee when you submit a consultation request through their profile — you are never charged. Basic listing in the directory is free. Paying for enquiry routing does not change an advisor's verification status, Trust Score, or the factual data shown on their profile (AFSL licence, AR registration, qualifications). Verification is done independently against ASIC's Financial Advisers Register.",
  },
];

export const revalidate = 86400;

export const metadata = {
  title: "How We Earn Money",
  description: "Full transparency on how Invest.com.au makes money. Advertising and referral fees explained, and what it means for our comparison data.",
  alternates: { canonical: "/how-we-earn" },
  openGraph: {
    title: "How We Earn Money",
    description: "Full transparency on how Invest.com.au makes money. Advertising and referral fees explained, and what it means for our comparison data.",
    images: [{ url: "/api/og?title=How+We+Earn+Money&subtitle=Full+Transparency+on+Affiliate+Revenue&type=default", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const },
};

export default function HowWeEarnPage() {
  const faqLd = faqJsonLd(HOW_WE_EARN_FAQS);
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "About", url: absoluteUrl("/about") },
    { name: "How We Earn" },
  ]);

  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
    />
    {faqLd && (
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    )}
    <div className="py-5 md:py-12">
      <div className="container-custom">
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <div className="text-sm text-slate-600 mb-6">
            <Link href="/" className="hover:text-brand">Home</Link>
            <span className="mx-2">/</span>
            <Link href="/about" className="hover:text-brand">About</Link>
            <span className="mx-2">/</span>
            <span className="text-brand">How We Earn</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-extrabold mb-4">How We Earn Money</h1>
          <p className="text-lg text-slate-600 mb-10 leading-relaxed">
            Transparency is important to us. Here&apos;s exactly how Invest.com.au makes money
            and how it does (and doesn&apos;t) affect our content.
          </p>

          {/* Revenue Model */}
          <section className="mb-10">
            <h2 className="text-2xl font-extrabold text-brand mb-3">Our Revenue Model</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 leading-relaxed text-slate-700 space-y-4">
              <p>
                <strong>Platform referrals:</strong> Advertising and referral fees may be received from some listed businesses.
                When you click a &quot;Visit Platform&quot; or &quot;Sign Up&quot; button and open an account, we may receive a referral commission.
              </p>
              <p>
                <strong>Advisor enquiries:</strong> Our advisor directory lists licensed financial professionals.
                When you submit a consultation request through an advisor&apos;s profile, the advisor may pay a fee per enquiry.
                You are never charged — the advisor pays for the lead.
              </p>
              <p>
                <strong>Promoted placements:</strong> Some providers pay for increased visibility on our site.
                Promoted placements are always clearly labelled and displayed separately from factual comparison data.
              </p>
              <p>
                These revenue streams allow us to keep the site free, pay for hosting and data,
                and continue to collect and verify factual comparison information.
              </p>
            </div>
          </section>

          {/* What This Means For You */}
          <section className="mb-10">
            <h2 className="text-2xl font-extrabold text-brand mb-3">What This Means For You</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-4 border border-emerald-200 bg-emerald-50 rounded-xl p-4">
                <span className="text-emerald-600 font-bold text-xl shrink-0 mt-0.5">&#10003;</span>
                <div>
                  <h3 className="font-bold text-slate-900">Free to use</h3>
                  <p className="text-sm text-slate-600 mt-0.5">You never pay us anything. Our comparison tools, calculators, and guides are completely free.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 border border-emerald-200 bg-emerald-50 rounded-xl p-4">
                <span className="text-emerald-600 font-bold text-xl shrink-0 mt-0.5">&#10003;</span>
                <div>
                  <h3 className="font-bold text-slate-900">No extra cost</h3>
                  <p className="text-sm text-slate-600 mt-0.5">Using our links costs you nothing extra — broker fees are the same whether you come through us or go direct.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 border border-emerald-200 bg-emerald-50 rounded-xl p-4">
                <span className="text-emerald-600 font-bold text-xl shrink-0 mt-0.5">&#10003;</span>
                <div>
                  <h3 className="font-bold text-slate-900">Factual data you control</h3>
                  <p className="text-sm text-slate-600 mt-0.5">Comparison tables display factual data that you can sort and filter yourself. We do not rank or recommend any platform as suitable for you.</p>
                </div>
              </div>
            </div>
          </section>

          {/* What We Don't Do */}
          <section className="mb-10">
            <h2 className="text-2xl font-extrabold text-brand mb-3">What We Don&apos;t Do</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-4 border border-red-200 bg-red-50 rounded-xl p-4">
                <span className="text-red-500 font-bold text-xl shrink-0 mt-0.5">&#10007;</span>
                <span className="text-slate-700">We don&apos;t rank or recommend platforms — directory entries are displayed separately from advertisements</span>
              </div>
              <div className="flex items-start gap-4 border border-red-200 bg-red-50 rounded-xl p-4">
                <span className="text-red-500 font-bold text-xl shrink-0 mt-0.5">&#10007;</span>
                <span className="text-slate-700">We don&apos;t sell your data to third parties</span>
              </div>
              <div className="flex items-start gap-4 border border-red-200 bg-red-50 rounded-xl p-4">
                <span className="text-red-500 font-bold text-xl shrink-0 mt-0.5">&#10007;</span>
                <span className="text-slate-700">We don&apos;t provide financial advice or assess suitability for any user</span>
              </div>
              <div className="flex items-start gap-4 border border-red-200 bg-red-50 rounded-xl p-4">
                <span className="text-red-500 font-bold text-xl shrink-0 mt-0.5">&#10007;</span>
                <span className="text-slate-700">We don&apos;t hide affiliate relationships — every CTA button is clearly labelled</span>
              </div>
            </div>
          </section>

          {/* Support Us */}
          <section className="mb-10">
            <div className="bg-slate-700/5 border border-slate-700/20 rounded-xl p-6">
              <h3 className="font-extrabold text-lg mb-2">Want to support us?</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                If you find our site useful, using our referral links is the best way to support us
                at no extra cost to you. Our goal is to provide accurate factual data so you can
                compare platforms on your own terms.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="mb-10">
            <h2 className="text-2xl font-extrabold text-brand mb-3">Contact Us</h2>
            <p className="text-slate-700 leading-relaxed">
              Have questions about how we operate? Want to report an error or suggest a broker we should review?
              Get in touch at{" "}
              <a href="mailto:hello@invest.com.au" className="text-slate-700 hover:underline font-semibold">
                hello@invest.com.au
              </a>.
            </p>
          </section>

          {/* FAQ */}
          <section className="mb-10">
            <h2 className="text-xl font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
            <div className="space-y-3">
              {HOW_WE_EARN_FAQS.map((faq) => (
                <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                    {faq.q}
                    <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                  </summary>
                  <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          <div className="text-center">
            <Link href="/about" className="text-slate-700 font-semibold hover:underline">
              &larr; Back to About
            </Link>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
