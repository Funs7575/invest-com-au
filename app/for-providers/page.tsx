import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 3600; // 1 hour

export const metadata: Metadata = {
  title: "List Your Training Courses — Reach 30,000+ Australian Advisors",
  description:
    "List CPD courses on Invest.com.au — reach 30,000+ financial advisors and 70,000+ tax agents. Platform handles enrolment, payments, and CPD certificates.",
  alternates: { canonical: "/for-providers" },
  openGraph: {
    title: "List Your Courses — Reach Australian Financial Professionals",
    description:
      "Reach 30,000+ AU financial advisors and 70,000+ registered tax agents. Platform handles enrolment, payments and CPD certificates.",
    images: [
      {
        url: "/api/og?title=List+Your+Courses&subtitle=Reach+Australian+Financial+Professionals&type=default",
        width: 1200,
        height: 630,
      },
    ],
  },
};

const FOR_PROVIDERS_FAQS = [
  { q: "Do we need an AFSL to list courses?", a: "No. Organisations listing training content do not require an Australian Financial Services Licence (AFSL). The AFSL requirement applies to individual advisors who give personal financial advice, not to education and CPD providers. You do need a valid ABN." },
  { q: "What counts as CPD under ASIC rules?", a: "ASIC-approved CPD covers five categories: Ethics, Regulatory Compliance and Consumer Protection, Technical Competence, Client Care, and Professionalism. Each course you list must be tagged to the relevant category." },
  { q: "How do payouts work?", a: "We use Stripe Connect. When a professional enrols in your course, payment is collected immediately. Funds are released to your bank account on a 30-day settlement cycle after deducting our platform fee. You receive a remittance statement each cycle." },
  { q: "Can we offer free or subsidised courses?", a: "Yes. You can set any course to $0 if you want to use it as a lead magnet or industry contribution. Subsidised pricing is also supported — set the price you want and Stripe Connect handles the rest." },
  { q: "What's the difference between a CPD provider number and general listing?", a: "If your organisation is a registered CPD provider with FPA, SMSFA, or AFA, you can display your provider number on your profile. This builds trust with members of those associations. It is optional — non-registered providers can still list content that qualifies for CPD hours." },
  { q: "How long does the application review take?", a: "We review organisation applications within 5 business days. We verify ABN, check website legitimacy, and review the type of training you offer. Approved organisations get a profile page immediately after review." },
];

export default function ForProvidersPage() {
  const faqSchema = faqJsonLd(FOR_PROVIDERS_FAQS);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 text-white py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-teal-200 text-sm font-semibold mb-3 uppercase tracking-wider">
            For Training Companies &amp; CPD Providers
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
            Reach 30,000+ Australian<br />Financial Professionals
          </h1>
          <p className="text-lg md:text-xl text-teal-100 mb-6 max-w-2xl mx-auto leading-relaxed">
            Financial advisors, tax agents, mortgage brokers and compliance
            professionals all need CPD. List your courses on Invest.com.au and
            let the platform handle enrolment, payments, and digital
            certificates.
          </p>
          <div className="inline-flex items-center gap-3 bg-white/10 border border-white/20 rounded-2xl px-5 py-3 mb-6">
            <span className="text-2xl font-extrabold text-white">Free to apply</span>
            <span className="text-teal-200 text-sm">no setup fee, no lock-in</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/provider-apply"
              className="px-8 py-4 bg-white text-teal-700 font-bold rounded-xl text-lg hover:bg-teal-50 transition-all shadow-lg"
            >
              Apply Now — Free to Start
            </Link>
            <a
              href="#pricing"
              className="px-8 py-4 border-2 border-white/30 text-white font-bold rounded-xl text-lg hover:bg-white/10 transition-all"
            >
              See Pricing
            </a>
          </div>
          <p className="text-teal-300 text-sm mt-4">
            Applications reviewed within 5 business days
          </p>
        </div>
      </section>

      {/* Audience */}
      <section className="py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-3">
            Reach the Professionals Who Need Your Content
          </h2>
          <p className="text-center text-slate-500 mb-10 max-w-xl mx-auto">
            Our audience are licenced professionals with mandatory annual CPD
            obligations — they actively search for accredited training.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: "shield",
                title: "30,000+ Financial Advisors",
                desc: "ASIC-registered advisors under FASEA/AFCA CPD rules requiring 40 hours/year across Ethics, Technical, and Professional categories.",
                badge: "ASIC CPD",
              },
              {
                icon: "file-text",
                title: "70,000+ Tax Agents",
                desc: "Registered tax agents (TPB) with 45-hour CPE requirements over a 3-year registration period. High demand for technical tax & software training.",
                badge: "TPB CPE",
              },
              {
                icon: "home",
                title: "Mortgage Brokers",
                desc: "MFAA and FBAA members require minimum CPD hours. Credit advisers under AFCA also have ongoing training obligations.",
                badge: "MFAA/FBAA",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-slate-50 border border-slate-200 rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                    <Icon name={item.icon} size={20} className="text-teal-600" />
                  </div>
                  <span className="text-xs font-bold text-teal-600 uppercase tracking-wider bg-teal-50 border border-teal-200 rounded-full px-2.5 py-0.5">
                    {item.badge}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 md:py-20 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-10">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                step: "1",
                title: "Apply",
                desc: "Submit your organisation details. We verify ABN and review your course catalogue within 5 days.",
                icon: "file-text",
              },
              {
                step: "2",
                title: "Build Your Catalogue",
                desc: "Upload courses, set pricing, add CPD category tags, and configure Stripe Connect for direct payouts.",
                icon: "layers",
              },
              {
                step: "3",
                title: "Professionals Enrol",
                desc: "Advisors find your courses via the CPD marketplace. Payments, enrolments and access are handled automatically.",
                icon: "users",
              },
              {
                step: "4",
                title: "Certificates & Reporting",
                desc: "We issue digital CPD certificates. Advisors can export records for ASIC/TPB compliance reporting.",
                icon: "award",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Icon name={item.icon} size={24} className="text-teal-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">
                  {item.step}. {item.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who should apply */}
      <section className="py-12 md:py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-extrabold text-center mb-8">
            Who Should Apply?
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              "Training Providers & RTO Operators",
              "CPD Providers (FPA, SMSF, AFA registered)",
              "Compliance Training Companies",
              "Fintech / Software Vendors (CE credits)",
              "Industry Bodies & Associations",
              "Law Firms (CPD/CLE content)",
              "Accounting Firms & Consultancies",
              "Other Professional Education Providers",
            ].map((type) => (
              <div
                key={type}
                className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg"
              >
                <span className="text-teal-500">&#10003;</span>
                <span className="text-sm text-slate-700">{type}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 text-center mt-4">
            Organisations do not need an AFSL to list training content — only
            individual advisors giving personal advice require a licence.
          </p>
        </div>
      </section>

      {/* What you get */}
      <section className="py-12 md:py-16 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-8">
            What You Get
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                title: "Organisation Profile Page",
                desc: "Public listing with logo, bio, specialties, CPD categories and course catalogue.",
              },
              {
                title: "Integrated Enrolment",
                desc: "Advisors enrol directly on platform. No redirect to external forms — seamless checkout via Stripe.",
              },
              {
                title: "Stripe Connect Payouts",
                desc: "Revenue lands in your Stripe account on a 30-day settlement cycle. We handle GST receipts and reconciliation.",
              },
              {
                title: "CPD Certificate Issuance",
                desc: "Digital certificates auto-issued on completion. Advisors can download and attach to ASIC/TPB records.",
              },
              {
                title: "Team Seats",
                desc: "Add editors and viewers to manage your catalogue without sharing admin credentials.",
              },
              {
                title: "Analytics Dashboard",
                desc: "Track enrolments, completion rates, revenue and CPD category breakdown in real time.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white border border-slate-200 rounded-xl p-5"
              >
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-12 md:py-20 px-4 scroll-mt-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-3">
            Simple, Transparent Pricing
          </h2>
          <p className="text-center text-slate-500 mb-10 max-w-xl mx-auto">
            Start free. Upgrade when you need more visibility and seats.
          </p>

          <div className="grid md:grid-cols-4 gap-4">
            {/* Free */}
            <div className="border border-slate-200 rounded-xl p-6">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Free
              </p>
              <p className="text-3xl font-extrabold text-slate-900 mb-1">$0</p>
              <p className="text-xs text-slate-500 mb-5">Forever free tier</p>
              <ul className="space-y-2 mb-6">
                {[
                  "Up to 3 courses",
                  "5 team seats",
                  "Stripe Connect payouts",
                  "Digital certificates",
                  "Basic analytics",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-xs text-slate-700"
                  >
                    <span className="text-emerald-500">&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/provider-apply"
                className="block w-full text-center py-2.5 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 text-xs"
              >
                Apply Free
              </Link>
            </div>

            {/* Starter */}
            <div className="border border-slate-200 rounded-xl p-6">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Starter
              </p>
              <p className="text-3xl font-extrabold text-slate-900 mb-1">
                $99<span className="text-base text-slate-500 font-normal">/mo</span>
              </p>
              <p className="text-xs text-slate-500 mb-5">Up to 20 courses</p>
              <ul className="space-y-2 mb-6">
                {[
                  "Up to 20 courses",
                  "10 team seats",
                  "Everything in Free",
                  "Priority in search results",
                  "Email support",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-xs text-slate-700"
                  >
                    <span className="text-teal-500">&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/provider-apply"
                className="block w-full text-center py-2.5 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 text-xs"
              >
                Apply Now
              </Link>
            </div>

            {/* Growth */}
            <div className="border-2 border-teal-500 rounded-xl p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-teal-500 text-white text-xs font-bold rounded-full">
                Most Popular
              </div>
              <p className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-1">
                Growth
              </p>
              <p className="text-3xl font-extrabold text-slate-900 mb-1">
                $299<span className="text-base text-slate-500 font-normal">/mo</span>
              </p>
              <p className="text-xs text-slate-500 mb-5">Unlimited courses</p>
              <ul className="space-y-2 mb-6">
                {[
                  "Unlimited courses",
                  "25 team seats",
                  "Everything in Starter",
                  "Featured in CPD marketplace",
                  "Dedicated account manager",
                  "Custom certificate branding",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-xs text-slate-700"
                  >
                    <span className="text-teal-500">&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/provider-apply"
                className="block w-full text-center py-2.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 text-xs"
              >
                Apply Now
              </Link>
            </div>

            {/* Featured */}
            <div className="border border-slate-200 rounded-xl p-6 bg-slate-900 text-white">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Featured
              </p>
              <p className="text-3xl font-extrabold text-white mb-1">
                $799<span className="text-base text-slate-400 font-normal">/mo</span>
              </p>
              <p className="text-xs text-slate-400 mb-5">Homepage placement</p>
              <ul className="space-y-2 mb-6">
                {[
                  "Everything in Growth",
                  "Homepage featured slot",
                  "Newsletter placement",
                  "Editorial integration",
                  "Co-branded campaigns",
                  "SLA support",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-xs text-slate-300"
                  >
                    <span className="text-amber-400">&#10003;</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/provider-apply"
                className="block w-full text-center py-2.5 bg-amber-500 text-slate-900 font-bold rounded-xl hover:bg-amber-600 text-xs"
              >
                Apply Now
              </Link>
            </div>
          </div>

          <p className="text-xs text-slate-500 text-center mt-4">
            All plans include Stripe Connect payouts. Upgrade or downgrade
            anytime. No lock-in contracts.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 md:py-16 px-4 bg-slate-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-extrabold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Do we need an AFSL to list courses?",
                a: "No. Organisations listing training content do not require an Australian Financial Services Licence (AFSL). The AFSL requirement applies to individual advisors who give personal financial advice, not to education and CPD providers. You do need a valid ABN.",
              },
              {
                q: "What counts as CPD under ASIC rules?",
                a: "ASIC-approved CPD covers five categories: Ethics, Regulatory Compliance and Consumer Protection, Technical Competence, Client Care, and Professionalism. Each course you list must be tagged to the relevant category. We'll review your tagging as part of the application.",
              },
              {
                q: "How do payouts work?",
                a: "We use Stripe Connect. When a professional enrols in your course, payment is collected immediately. Funds are released to your bank account on a 30-day settlement cycle after deducting our platform fee. You receive a remittance statement each cycle.",
              },
              {
                q: "Can we offer free or subsidised courses?",
                a: "Yes. You can set any course to $0 if you want to use it as a lead magnet or industry contribution. Subsidised pricing is also supported — set the price you want and Stripe Connect handles the rest.",
              },
              {
                q: "What's the difference between a CPD provider number and general listing?",
                a: "If your organisation is a registered CPD provider with FPA, SMSFA, or AFA, you can display your provider number on your profile. This builds trust with members of those associations. It is optional — non-registered providers can still list content that qualifies for CPD hours.",
              },
              {
                q: "How long does the application review take?",
                a: "We review organisation applications within 5 business days. We verify ABN, check website legitimacy, and review the type of training you offer. Approved organisations get a profile page immediately after review.",
              },
            ].map((faq, i) => (
              <details
                key={i}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden group"
              >
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-50 flex items-center justify-between">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">
                    &#9660;
                  </span>
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-20 px-4 bg-gradient-to-br from-teal-600 to-emerald-700 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-extrabold mb-4">
            Ready to Reach Australia&apos;s Financial Professionals?
          </h2>
          <p className="text-teal-200 text-lg mb-8">
            Free to apply, no setup fees, no lock-in. Go live in 5 days.
          </p>
          <Link
            href="/provider-apply"
            className="inline-block px-10 py-4 bg-white text-teal-700 font-bold rounded-xl text-lg hover:bg-teal-50 transition-all shadow-lg"
          >
            Apply Now — Free to Start &rarr;
          </Link>
        </div>
      </section>
    </div>
    </>
  );
}
