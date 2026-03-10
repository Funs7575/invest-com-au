import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Icon from "@/components/Icon";

export const metadata: Metadata = {
  title: "List Your Practice on Invest.com.au — Reach Australian Investors",
  description:
    "Get qualified leads from Australian investors actively looking for financial advisors, SMSF specialists, and tax agents. Free profile, 2 free leads, then prepaid credit.",
  alternates: { canonical: "/for-advisors" },
  openGraph: {
    title: "List Your Advisory Practice — Invest.com.au",
    description: "Reach thousands of Australian investors looking for financial advice. Free profile with 2 free leads.",
  },
};

export default async function ForAdvisorsPage() {
  const supabase = await createClient();
  const { count: advisorCount } = await supabase.from("professionals").select("id", { count: "exact", head: true }).eq("status", "active");
  const { count: leadCount } = await supabase.from("professional_leads").select("id", { count: "exact", head: true });

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 text-white py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-violet-200 text-sm font-semibold mb-3 uppercase tracking-wider">For Financial Advisors & Accountants</p>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
            Get Qualified Leads from<br />Australian Investors
          </h1>
          <p className="text-lg md:text-xl text-violet-100 mb-8 max-w-2xl mx-auto leading-relaxed">
            Thousands of Australians visit Invest.com.au every month to compare investment platforms.
            Many need professional advice — SMSF setup, tax planning, retirement strategy.
            Put your practice in front of them.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/advisor-signup" className="px-8 py-4 bg-white text-violet-700 font-bold rounded-xl text-lg hover:bg-violet-50 transition-all shadow-lg">
              Apply Now — It&apos;s Free to Start
            </Link>
            <a href="#pricing" className="px-8 py-4 border-2 border-white/30 text-white font-bold rounded-xl text-lg hover:bg-white/10 transition-all">
              See Pricing
            </a>
          </div>
          <p className="text-violet-300 text-sm mt-4">No setup fee · 2 free leads · Cancel anytime</p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-10">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Create Your Profile", desc: "Apply in 2 minutes. We verify your AFSL/registration number and publish your profile within 24 hours.", icon: "user" },
              { step: "2", title: "Receive Qualified Leads", desc: "Investors browsing our platform find your profile and submit enquiries or book calls directly via Calendly.", icon: "mail" },
              { step: "3", title: "Convert & Grow", desc: "Respond to leads, book consultations, and grow your client base. Track everything in your advisor dashboard.", icon: "trending-up" },
            ].map(item => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Icon name={item.icon} size={24} className="text-violet-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="py-12 md:py-16 px-4 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-8">What You Get</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { title: "Your Own Profile Page", desc: "Professional listing with bio, specialties, fee structure, reviews, and direct booking integration." },
              { title: "Calendly/Cal.com Integration", desc: "Add your booking link and let clients book free consultations directly from your profile." },
              { title: "Lead Quality Scoring", desc: "Every lead is scored 0-100 based on engagement signals. Know who's serious before you call." },
              { title: "Advisor Dashboard", desc: "Track profile views, leads, bookings, response times, and conversion rates in real-time." },
              { title: "Expert Article Publishing", desc: "Publish thought leadership articles with your byline — position yourself as the go-to expert." },
              { title: "Client Reviews", desc: "Build social proof with verified client reviews displayed on your profile." },
            ].map(item => (
              <div key={item.title} className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-1">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-12 md:py-20 px-4 scroll-mt-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-3">Simple, Transparent Pricing</h2>
          <p className="text-center text-slate-500 mb-10 max-w-xl mx-auto">Start free, pay only when you receive leads. No monthly minimums, no lock-in contracts.</p>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Free Trial */}
            <div className="border border-slate-200 rounded-xl p-6">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Free Trial</p>
              <p className="text-3xl font-extrabold text-slate-900 mb-1">$0</p>
              <p className="text-sm text-slate-500 mb-5">First 3 leads free</p>
              <ul className="space-y-2 mb-6">
                {["Profile page", "2 free leads", "Advisor dashboard", "Calendly integration", "Basic analytics"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700"><span className="text-emerald-500">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/advisor-signup" className="block w-full text-center py-3 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 text-sm">
                Start Free Trial
              </Link>
            </div>

            {/* Pay Per Lead */}
            <div className="border-2 border-violet-500 rounded-xl p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-violet-500 text-white text-xs font-bold rounded-full">Most Popular</div>
              <p className="text-sm font-bold text-violet-600 uppercase tracking-wider mb-1">Pay Per Lead</p>
              <p className="text-3xl font-extrabold text-slate-900 mb-1">$49<span className="text-lg text-slate-400 font-normal">/lead</span></p>
              <p className="text-sm text-slate-500 mb-5">After 2 free trial leads</p>
              <ul className="space-y-2 mb-6">
                {["Everything in Free", "Unlimited leads", "Lead quality scoring", "Priority listing", "Email notifications", "Response time tracking"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700"><span className="text-violet-500">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/advisor-signup" className="block w-full text-center py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 text-sm">
                Get Started
              </Link>
            </div>

            {/* Expert Articles */}
            <div className="border border-slate-200 rounded-xl p-6">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Expert Articles</p>
              <p className="text-3xl font-extrabold text-slate-900 mb-1">From $299</p>
              <p className="text-sm text-slate-500 mb-5">One-off content pieces</p>
              <ul className="space-y-2 mb-6">
                {["Standard ($299) — Article + byline", "Featured ($499) — + Homepage + newsletter", "Sponsored ($799) — + Pinned + social promo", "Professional editing included", "Permanent placement"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700"><span className="text-emerald-500">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/advisor-signup" className="block w-full text-center py-3 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-50 text-sm">
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-12 md:py-16 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto text-center">
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div>
              <p className="text-3xl font-extrabold text-slate-900">{advisorCount || 8}+</p>
              <p className="text-sm text-slate-500">Listed Advisors</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slate-900">{((leadCount || 0) * 10) || "250"}+</p>
              <p className="text-sm text-slate-500">Investor Enquiries</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-slate-900">9</p>
              <p className="text-sm text-slate-500">Categories Covered</p>
            </div>
          </div>
          <p className="text-slate-600 max-w-lg mx-auto">
            Invest.com.au is Australia&apos;s independent investing comparison platform, covering share brokers,
            crypto exchanges, super funds, savings accounts, and more. Our visitors are actively researching
            financial products — many need professional guidance.
          </p>
        </div>
      </section>

      {/* Who should apply */}
      <section className="py-12 md:py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-extrabold text-center mb-8">Who Should Apply?</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              "Financial Planners (AFP / CFP)",
              "SMSF Specialists & Accountants",
              "Tax Agents & Tax Planners",
              "Mortgage Brokers",
              "Property Investment Advisors",
              "Retirement Planning Specialists",
              "Estate Planning Professionals",
              "Insurance Advisors",
            ].map(type => (
              <div key={type} className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                <span className="text-violet-500">✓</span>
                <span className="text-sm text-slate-700">{type}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 text-center mt-4">
            All advisors must hold a current AFSL, be an authorised representative, or be registered with a relevant body (TPB, ASIC).
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 md:py-16 px-4 bg-slate-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-extrabold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "How much does it cost to list?", a: "It's free to create your profile and receive your first 2 leads. After that, top up with a $200 credit balance — each lead costs $49 and deducts from your balance. No monthly fees, no setup costs, no lock-in contracts." },
              { q: "What qualifies as a 'lead'?", a: "A lead is an enquiry submitted through your profile — the investor provides their name, email, and usually a phone number and message. Booking clicks (Calendly) are tracked separately." },
              { q: "How are leads allocated?", a: "Leads go directly to the advisor whose profile the investor enquires through. We don't share leads with multiple advisors — each lead is exclusive to you." },
              { q: "Can I set my own Calendly link?", a: "Yes. In your advisor portal, paste your Calendly or Cal.com link and it appears as a prominent 'Book Free Call' button on your profile. We handle the rest." },
              { q: "How do I get paid for articles?", a: "You write the article in your advisor portal, select a pricing tier, and submit for review. We edit and publish it. Payment is collected before publication." },
              { q: "What if I'm not happy with lead quality?", a: "You can dispute any lead through your dashboard. If the lead is clearly spam or outside your service area, we'll credit it back." },
            ].map((faq, i) => (
              <details key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden group">
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-50 flex items-center justify-between">
                  {faq.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
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
      <section className="py-16 md:py-20 px-4 bg-gradient-to-br from-violet-600 to-indigo-700 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-extrabold mb-4">Ready to Grow Your Practice?</h2>
          <p className="text-violet-200 text-lg mb-8">Join {advisorCount || 8}+ advisors already listed. Start with 2 free leads — no credit card required.</p>
          <Link href="/advisor-signup" className="inline-block px-10 py-4 bg-white text-violet-700 font-bold rounded-xl text-lg hover:bg-violet-50 transition-all shadow-lg">
            Apply Now — Free to Start →
          </Link>
        </div>
      </section>
    </div>
  );
}
