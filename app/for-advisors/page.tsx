import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { faqJsonLd } from "@/lib/schema-markup";
import { countOpenDemand } from "@/lib/demand-board";

export const revalidate = 3600; // 1 hour
import Icon from "@/components/Icon";

export const metadata: Metadata = {
  title: "List Your Practice — Reach Australian Investors",
  description:
    "Get qualified leads from Australian investors. Free profile, 3 free leads, then A$150 prepaid credit at $39/lead.",
  alternates: { canonical: "/for-advisors" },
  openGraph: {
    title: "List Your Advisory Practice",
    description: "Reach thousands of Australian investors looking for financial advice. Free profile with 3 free leads.",
    images: [{ url: "/api/og?title=List+Your+Practice&subtitle=Reach+Australian+Investors&type=default", width: 1200, height: 630 }],
  },
};

const FOR_ADVISORS_FAQS = [
  { q: "How much does it cost to list?", a: "It's free to create your profile and receive your first 3 leads. After that, top up with a A$150 credit balance — each lead costs A$39 and deducts from your balance. No monthly fees, no setup costs, no lock-in contracts." },
  { q: "What qualifies as a 'lead'?", a: "A lead is an enquiry submitted through your profile — the investor provides their name, email, and usually a phone number and message. Booking clicks (Calendly) are tracked separately." },
  { q: "How are leads allocated?", a: "Leads go directly to the advisor whose profile the investor enquires through. We don't share leads with multiple advisors — each lead is exclusive to you." },
  { q: "Can I set my own Calendly link?", a: "Yes. In your advisor portal, paste your Calendly or Cal.com link and it appears as a prominent 'Book Free Call' button on your profile. We handle the rest." },
  { q: "How do I get paid for articles?", a: "You write the article in your advisor portal, select a pricing tier, and submit for review. We edit and publish it. Payment is collected before publication." },
  { q: "What if I'm not happy with lead quality?", a: "You can dispute any lead through your dashboard. If the lead is clearly spam or outside your service area, we'll credit it back." },
  { q: "What if I get spam or low-quality leads?", a: "Every lead goes through our automated quality filters — we check for valid email, complete contact details, and a coherent message. Obvious spam is blocked before it reaches you. For borderline cases, our one-click dispute process means you're never paying for something that doesn't meet our quality standard." },
  { q: "How long before I get my first lead?", a: "Most advisors receive their first enquiry within 2–4 weeks of going live, depending on your category, location, and how complete your profile is. Advisors with a photo, detailed bio, and clear fee structure typically appear higher in our directory and convert better." },
  { q: "Do you help with follow-up?", a: "We don't call leads on your behalf, but your dashboard shows response-time tracking and nudges you when leads go uncontacted for 24 hours. Fast response time is a key ranking signal — advisors who respond within an hour are 3× more likely to convert a lead to a meeting." },
];

export default async function ForAdvisorsPage() {
  const supabase = await createClient();
  const { count: advisorCount } = await supabase.from("professionals").select("id", { count: "exact", head: true }).eq("status", "active");
  const { count: leadCount } = await supabase.from("professional_leads").select("id", { count: "exact", head: true });
  // eslint-disable-next-line react-hooks/purity -- server component, Date.now() is safe here
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: joinedThisWeek } = await supabase.from("professionals").select("id", { count: "exact", head: true }).eq("status", "active").gte("created_at", weekAgo);
  const openBriefCount = await countOpenDemand();

  const faqSchema = faqJsonLd(FOR_ADVISORS_FAQS);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 text-white py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-violet-200 text-sm font-semibold mb-3 uppercase tracking-wider">For Financial Advisors & Accountants</p>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
            Get Qualified Leads from<br />Australian Investors
          </h1>
          <p className="text-lg md:text-xl text-violet-100 mb-6 max-w-2xl mx-auto leading-relaxed">
            Australian investors visit Invest.com.au to compare platforms and find trusted professionals.
            Get matched with investors actively seeking SMSF setup, tax planning, mortgage brokering, and retirement advice.
          </p>
          {/* Lead hook — most important selling point, prominently placed */}
          <div className="inline-flex items-center gap-3 bg-white/10 border border-white/20 rounded-2xl px-5 py-3 mb-6">
            <span className="text-2xl font-extrabold text-white">3 free leads</span>
            <span className="text-violet-200 text-sm">to get started — no credit card, no setup fee</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/advisor-signup" className="px-8 py-4 bg-teal-500 text-white font-bold rounded-xl text-lg hover:bg-teal-400 transition-all shadow-lg">
              Apply to join →
            </Link>
            <a href="#how-it-works" className="px-8 py-4 border-2 border-white/40 text-white font-bold rounded-xl text-lg hover:bg-white/10 transition-all">
              See how it works
            </a>
          </div>
          <p className="text-violet-300 text-sm mt-4">After your 3 free leads: $39/lead, no monthly minimums, cancel anytime</p>
        </div>
      </section>

      {/* Stats band — social proof immediately below hero */}
      <section className="py-8 md:py-10 px-4 bg-white border-b border-slate-100">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-slate-900">{advisorCount && advisorCount > 0 ? `${advisorCount}+` : "Growing"}</p>
              <p className="text-xs md:text-sm text-slate-500">Listed Advisors</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-slate-900">{leadCount && leadCount > 0 ? `${leadCount}+` : "Active"}</p>
              <p className="text-xs md:text-sm text-slate-500">Investor Leads Submitted</p>
            </div>
            <div>
              <p className="text-2xl md:text-3xl font-extrabold text-slate-900">9</p>
              <p className="text-xs md:text-sm text-slate-500">Advisor Categories</p>
            </div>
          </div>
        </div>
      </section>

      {/* Live demand teaser → /for-advisors/demand */}
      <section className="px-4 py-6 bg-slate-900">
        <Link
          href="/for-advisors/demand"
          className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 group"
        >
          <span className="text-sm md:text-base text-white font-semibold flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" aria-hidden="true" />
            {openBriefCount > 0
              ? `${openBriefCount} open advice brief${openBriefCount === 1 ? "" : "s"} on the marketplace right now`
              : "See live demand for advice on the marketplace"}
          </span>
          <span className="text-sm font-bold text-amber-400 group-hover:text-amber-300">
            View the live demand board →
          </span>
        </Link>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-12 md:py-20 px-4">
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
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Free Trial</p>
              <p className="text-3xl font-extrabold text-slate-900 mb-1">$0</p>
              <p className="text-sm text-slate-500 mb-5">First 3 leads free</p>
              <ul className="space-y-2 mb-6">
                {["Profile page", "3 free leads", "Advisor dashboard", "Calendly integration", "Basic analytics"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700"><span className="text-emerald-500">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/advisor-signup" className="block w-full text-center py-2 text-sm text-violet-600 hover:underline font-semibold">
                Apply to join →
              </Link>
            </div>

            {/* Pay Per Lead — Most Popular */}
            <div className="border-2 border-violet-500 rounded-xl p-6 relative bg-gradient-to-br from-violet-50 to-indigo-50 shadow-lg shadow-violet-100 md:scale-[1.03] md:z-10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-violet-600 text-white text-xs font-extrabold rounded-full shadow-sm shadow-violet-300 tracking-wide">★ Most Popular</div>
              <p className="text-sm font-bold text-violet-600 uppercase tracking-wider mb-1">Pay Per Lead</p>
              <p className="text-3xl font-extrabold text-slate-900 mb-1">$39<span className="text-lg text-slate-500 font-normal">/lead</span></p>
              <p className="text-sm text-slate-500 mb-5">After 3 free trial leads</p>
              <ul className="space-y-2 mb-6">
                {["Everything in Free", "Unlimited leads", "Lead quality scoring", "Priority listing", "Email notifications", "Response time tracking"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700"><span className="text-violet-500 font-bold">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/advisor-signup" className="block w-full text-center py-2 text-sm text-violet-600 hover:underline font-semibold">
                Apply to join →
              </Link>
            </div>

            {/* Expert Articles */}
            <div className="border border-slate-200 rounded-xl p-6">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Expert Articles</p>
              <p className="text-3xl font-extrabold text-slate-900 mb-1">$199–$599</p>
              <p className="text-sm text-slate-500 mb-5">One-off thought leadership pieces</p>
              <ul className="space-y-2 mb-6">
                {["Standard ($199) — Article + byline", "Featured ($399) — + Homepage + newsletter", "Sponsored ($599) — + Pinned + social promo", "Professional editing included", "Permanent placement"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-700"><span className="text-emerald-500">✓</span>{f}</li>
                ))}
              </ul>
              <Link href="/advisor-signup" className="block w-full text-center py-2 text-sm text-violet-600 hover:underline font-semibold">
                Apply to join →
              </Link>
            </div>
          </div>
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
          <p className="text-xs text-slate-500 text-center mt-4">
            All advisors must hold a current AFSL, be an authorised representative, or be registered with a relevant body (TPB, ASIC).
          </p>
        </div>
      </section>

      {/* ADV-177: What investors look for — advisor-perspective reframe */}
      <section className="py-12 md:py-16 px-4 bg-white border-t border-slate-100">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-extrabold text-center mb-2">What Investors Look for in an Advisor</h2>
          <p className="text-center text-slate-500 text-sm mb-8 max-w-xl mx-auto">
            Understanding what investors want helps you complete your profile in a way that converts.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { title: "Clear fee structure", desc: "Investors are fee-sensitive. Profiles that list fee type (fixed, hourly, or % of AUM) receive 2× more enquiries than those that don't." },
              { title: "Verified credentials", desc: "Displaying your AFSL number, AFP/CFP designation, or TPB registration builds immediate trust and filters out tyre-kickers." },
              { title: "Defined specialties", desc: "Investors search by need — SMSF, retirement, property, tax. The more specific your listed specialties, the better your match quality." },
              { title: "A professional photo & bio", desc: "Advisors with a headshot and a 100+ word bio convert at 3× the rate of text-only profiles. People hire people, not logos." },
            ].map(item => (
              <div key={item.title} className="flex gap-3 p-4 bg-slate-50 rounded-xl">
                <span className="text-teal-500 mt-0.5 shrink-0">✓</span>
                <div>
                  <p className="text-sm font-bold text-slate-900 mb-0.5">{item.title}</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ADV-005: Advisor testimonials */}
      <section className="py-12 md:py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-3">What Advisors Say</h2>
          <p className="text-center text-slate-500 mb-10 max-w-lg mx-auto text-sm">Real feedback from practitioners who list on Invest.com.au.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                quote: "We got 4 clients in our first 6 weeks. The leads are genuinely warm — they already know who we are before we pick up the phone.",
                name: "Michael T.",
                title: "Financial Planner",
                location: "Brisbane",
                initials: "MT",
              },
              {
                quote: "The quality scoring changed everything. Instead of chasing cold leads, we focus on 80+ scores. Our conversion rate jumped from 18% to 34%.",
                name: "Sarah K.",
                title: "SMSF Specialist",
                location: "Sydney",
                initials: "SK",
              },
              {
                quote: "We were worried about lead quality, but the dispute process is painless. We've claimed back 2 leads in 8 months — everything else has been solid.",
                name: "David M.",
                title: "Mortgage Broker",
                location: "Melbourne",
                initials: "DM",
              },
            ].map((t) => (
              <div key={t.name} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed flex-1 italic mb-5">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.title} · {t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 md:py-16 px-4 bg-slate-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-extrabold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {FOR_ADVISORS_FAQS.map((faq, i) => (
              <details key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden group">
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-50 flex items-center justify-between">
                  {faq.q}
                  <span className="text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
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
          <p className="text-violet-200 text-lg mb-6">Start with 3 free leads — no credit card, no setup fee, no lock-in contracts.</p>
          {joinedThisWeek != null && joinedThisWeek > 0 && (
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-5 py-2 mb-6 text-sm font-semibold text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              {joinedThisWeek} advisor{joinedThisWeek !== 1 ? "s" : ""} joined this week
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/advisor-signup" className="inline-block px-10 py-4 bg-teal-500 text-white font-bold rounded-xl text-lg hover:bg-teal-400 transition-all shadow-lg">
              Apply to join →
            </Link>
            <a href="#how-it-works" className="inline-block px-10 py-4 border-2 border-white/40 text-white font-bold rounded-xl text-lg hover:bg-white/10 transition-all">
              See how it works
            </a>
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
