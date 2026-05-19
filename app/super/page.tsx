import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR } from "@/lib/seo";
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

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Super Fund Hub (${CURRENT_YEAR}) — Compare Funds, Fees & Contribution Strategies`,
  description: superHubConfig.metaDescription,
  alternates: { canonical: `${SITE_URL}/super` },
  openGraph: {
    title: `Super Fund Hub (${CURRENT_YEAR}) — Compare, Contribute & Retire Well`,
    description: superHubConfig.metaDescription,
    url: `${SITE_URL}/super`,
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

  return (
    <>
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
                { label: "Consolidation", href: "/super/consolidation", badge: "Find lost super" },
                { label: "Leaving Australia", href: "/super/leaving-australia", badge: "DASP" },
                { label: "Super Quiz", href: "/super/quiz", badge: "Find your fund" },
                { label: "Compare Super", href: "/compare/super", badge: "Fees & returns" },
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
