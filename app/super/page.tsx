import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR, absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { createClient } from "@/lib/supabase/server";
import type { Article } from "@/lib/types";
import HubPage from "@/components/HubPage";
import HubNewsletterCapture from "@/components/HubNewsletterCapture";
import HubExitIntent from "@/components/HubExitIntent";
import LeadMagnetCapture from "@/components/LeadMagnetCapture";
import ForeignInvestorCallout from "@/components/ForeignInvestorCallout";
import { superHubConfig } from "@/lib/hub-configs/super";
import { getLeadMagnetForHub } from "@/lib/lead-magnets";
import Link from "next/link";

const SUPER_FAQS = [
  {
    q: "What is the superannuation guarantee rate in 2025–26?",
    a: "The Superannuation Guarantee (SG) rate is 11.5% for FY2025–26, rising to 12% from 1 July 2026. Your employer must contribute this percentage of your ordinary time earnings to your nominated super fund. If you earn more than $450 per month (the income threshold was removed in 2022), contributions are required regardless of whether you work part-time or casually.",
  },
  {
    q: "Can I access my super early?",
    a: "Generally, no. Super is preserved until you reach your preservation age (between 55 and 60, depending on your birth year) and meet a condition of release. Limited early access is permitted in genuine financial hardship (minimum $1,000, maximum $10,000 per 12 months) or on compassionate grounds approved by the ATO (for specific medical or mortgage arrears situations). Unauthorised early access is illegal and carries significant ATO penalties.",
  },
  {
    q: "How do I find my lost or unclaimed super?",
    a: "Log in to myGov and link your ATO account. Under 'Super', you'll see all accounts held in your Tax File Number — including lost and ATO-held accounts. Lost super often arises from job changes when you didn't nominate an existing fund. You can consolidate multiple accounts into your preferred fund from the same myGov screen (check insurance you may lose before rolling over).",
  },
  {
    q: "What is the difference between a retail and industry super fund?",
    a: "Industry funds are run for members rather than shareholders — any profit is returned to members as better returns or lower fees. They are often (but not always) cheaper, especially at lower balances. Retail funds are run by financial institutions for profit; they may offer broader investment choice and adviser integration. Both must meet the same regulatory standards. The right fund depends on your balance, investment goals, insurance needs, and whether you use a financial adviser.",
  },
];

const superFaqLd = faqJsonLd(SUPER_FAQS);

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Super Fund Hub (${CURRENT_YEAR}) — Compare Funds, Fees & Contribution Strategies`,
  description: superHubConfig.metaDescription,
  alternates: { canonical: `${SITE_URL}/super` },
  openGraph: {
    title: `Super Fund Hub (${CURRENT_YEAR}) — Compare, Contribute & Retire Well`,
    description: superHubConfig.metaDescription,
    url: `${SITE_URL}/super`,
    images: [{ url: `/api/og?title=${encodeURIComponent("Super Fund Hub Australia")}&sub=${encodeURIComponent("Compare Funds · Fees · Contribution Strategies · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

export default async function SuperPage() {
  const supabase = await createClient();
  const leadMagnet = getLeadMagnetForHub("super");

  // Fetch recent super articles for the hub article strip
  const { data: articleData } = await supabase
    .from("articles")
    .select("id, title, slug, category, read_time")
    .or("category.in.(super,smsf),tags.ov.{super,superannuation,smsf,retirement}")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(4);

  const relatedArticles = (articleData || []) as Pick<
    Article,
    "id" | "title" | "slug" | "category" | "read_time"
  >[];

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Super" },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      {superFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(superFaqLd) }} />
      )}
      <ForeignInvestorCallout
        href="/foreign-investment/super"
        verticalName="super (DASP)"
        keyRule="Temporary visa holders: employer SG applies (11.5%) · DASP withholding 35% (or 65% for Working Holiday Makers) when leaving Australia"
      />
      <HubPage
        config={superHubConfig}
        newsletterCapture={
          <HubNewsletterCapture
            segmentSlug="super-hub"
            hubTitle="Super"
          />
        }
      >
        {/* Quick-access sub-hub links */}
        <section className="py-10 border-t border-slate-200 bg-slate-50">
          <div className="container-custom max-w-6xl">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Explore super topics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "SMSF Hub", href: "/smsf", badge: "Self-managed" },
                { label: "Contributions", href: "/super/contributions", badge: "Salary sacrifice" },
                { label: "Transition to Retirement", href: "/super/transition-to-retirement", badge: "TTR strategy" },
                { label: "Consolidation", href: "/super/consolidation", badge: "Find lost super" },
                { label: "Leaving Australia", href: "/super/leaving-australia", badge: "DASP" },
                { label: "Super Quiz", href: "/super/quiz", badge: "Find your fund" },
                { label: "Compare Super", href: "/compare/super", badge: "Fees & returns" },
                { label: "Division 296 Tax", href: "/super/division-296", badge: "From July 2026" },
                { label: "Catch-Up Contributions", href: "/super/catch-up-contributions", badge: "Carry-forward" },
                { label: "Co-Contribution", href: "/super/co-contribution", badge: "Govt matches $0.50/$1" },
                { label: "Spouse Contributions", href: "/super/spouse-contributions", badge: "Up to $540 offset" },
                { label: "Pension Phase", href: "/super/pension-phase", badge: "Tax-free earnings" },
              ].map(({ label, href, badge }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col gap-1 p-4 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-sm transition-all"
                >
                  <span className="text-sm font-semibold text-slate-900">{label}</span>
                  <span className="text-xs text-slate-500">{badge}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Recent articles */}
        {relatedArticles.length > 0 && (
          <section className="py-10 border-t border-slate-200">
            <div className="container-custom max-w-6xl">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Latest super guides</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {relatedArticles.map((a) => (
                  <Link
                    key={a.id}
                    href={`/article/${a.slug}`}
                    className="flex flex-col gap-1 p-4 border border-slate-200 rounded-xl hover:border-emerald-300 hover:shadow-sm transition-all bg-white"
                  >
                    <span className="text-sm font-semibold text-slate-900 line-clamp-2">
                      {a.title}
                    </span>
                    {a.read_time && (
                      <span className="text-xs text-slate-500">{a.read_time} min read</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Advisor CTA */}
        <section className="py-10 border-t border-slate-200 bg-violet-50">
          <div className="container-custom max-w-3xl text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Get personalised super advice</h2>
            <p className="text-sm text-slate-600 mb-5">
              Super strategy is personal — the right fund, contributions, and withdrawal plan depends on your age, income, and goals. A licensed financial planner can model your specific situation.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/find-advisor?specialty=super"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-violet-600 text-white font-semibold rounded-xl text-sm hover:bg-violet-700 transition-colors"
              >
                Find a Super Specialist
              </Link>
              <Link
                href="/compare/super"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-violet-300 text-violet-700 bg-white font-semibold rounded-xl text-sm hover:bg-violet-50 transition-colors"
              >
                Compare Super Funds
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-10 border-t border-slate-200 bg-white">
          <div className="container-custom max-w-3xl">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Frequently asked questions</h2>
            <div className="space-y-3">
              {SUPER_FAQS.map((faq) => (
                <details key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                  <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                    {faq.q}
                    <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0" aria-hidden="true">▾</span>
                  </summary>
                  <div className="px-5 pb-4">
                    <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Lead magnet */}
        {leadMagnet && (
          <section className="py-10 border-t border-slate-200 bg-emerald-50">
            <div className="container-custom max-w-3xl">
              <LeadMagnetCapture magnet={leadMagnet} />
            </div>
          </section>
        )}
      </HubPage>
      <HubExitIntent segmentSlug="super-hub" hubName="Super" />
    </>
  );
}
