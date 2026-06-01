import type { Metadata } from "next";
import Link from "next/link";
import { SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import HubPage from "@/components/HubPage";
import HubServiceGrid from "@/components/HubServiceGrid";
import type { HubServiceItem } from "@/components/HubServiceGrid";
import HubNewsletterCapture from "@/components/HubNewsletterCapture";
import HubFAQ from "@/components/HubFAQ";
import { HOME_LOANS_HUB_CONFIG } from "@/lib/verticals";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Home Loans Australia (${CURRENT_YEAR}) — Compare Rates, Calculator & Mortgage Broker Finder`,
  description: HOME_LOANS_HUB_CONFIG.metaDescription,
  alternates: { canonical: `${SITE_URL}/home-loans` },
  openGraph: {
    title: `Home Loans Australia (${CURRENT_YEAR})`,
    description: HOME_LOANS_HUB_CONFIG.metaDescription,
    url: `${SITE_URL}/home-loans`,
  },
};

async function fetchHomeLoanArticles() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("articles")
      .select("slug, title, excerpt, category, published_at")
      .eq("status", "published")
      .or(
        "category.eq.home-loans,tags.cs.{home-loan},tags.cs.{mortgage},tags.cs.{refinancing},tags.cs.{first-home-buyer}"
      )
      .order("published_at", { ascending: false })
      .limit(4);
    return (
      (data as Array<{
        slug: string;
        title: string;
        excerpt: string | null;
        category: string | null;
        published_at: string | null;
      }> | null) || []
    );
  } catch {
    return [];
  }
}

export default async function HomeLoansHubPage() {
  const articles = await fetchHomeLoanArticles();
  const deepDives = HOME_LOANS_HUB_CONFIG.deepDives ?? [];

  return (
    <HubPage
      config={HOME_LOANS_HUB_CONFIG}
      serviceGrid={
        <HubServiceGrid
          items={(HOME_LOANS_HUB_CONFIG.serviceGrid ?? []) as HubServiceItem[]}
          heading="Home Loan Types Explained"
        />
      }
      deepDives={
        deepDives.length > 0 ? (
          <section className="py-12 bg-slate-50">
            <div className="container-custom">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">In-Depth Home Loan Guides</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {deepDives.map((d) => (
                  <a
                    key={d.href}
                    href={d.href}
                    className="block bg-white rounded-xl border border-slate-200 p-5 hover:border-violet-300 hover:shadow-sm transition-all group"
                  >
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-violet-700 transition-colors mb-1">
                      {d.title}
                    </p>
                    {d.excerpt && (
                      <p className="text-xs text-slate-500 leading-relaxed">{d.excerpt}</p>
                    )}
                  </a>
                ))}
              </div>
            </div>
          </section>
        ) : null
      }
      faq={
        HOME_LOANS_HUB_CONFIG.faqs.length > 0 ? (
          <HubFAQ
            heading="Home Loans FAQs"
            items={HOME_LOANS_HUB_CONFIG.faqs.map((f) => ({ q: f.question, a: f.answer }))}
          />
        ) : null
      }
      newsletterCapture={
        <HubNewsletterCapture
          segmentSlug="home-loans-hub"
          hubTitle="Home Loans"
          leadMagnetTitle="Home loan comparison checklist"
        />
      }
    >
      {/* Quick-access tools strip */}
      <section className="py-8 bg-amber-50 border-t border-amber-100">
        <div className="container-custom">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">
            Quick tools
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/mortgage-calculator"
              className="inline-flex items-center gap-2 bg-white border border-amber-200 text-amber-800 rounded-lg px-4 py-2 text-sm font-medium hover:bg-amber-100 transition-colors"
            >
              Mortgage Repayment Calculator →
            </Link>
            <Link
              href="/tools/mortgage-stress-test"
              className="inline-flex items-center gap-2 bg-white border border-amber-200 text-amber-800 rounded-lg px-4 py-2 text-sm font-medium hover:bg-amber-100 transition-colors"
            >
              Mortgage Stress Test →
            </Link>
            <Link
              href="/advisors/mortgage-brokers"
              className="inline-flex items-center gap-2 bg-amber-600 text-slate-900 rounded-lg px-4 py-2 text-sm font-medium hover:bg-amber-700 transition-colors"
            >
              Find a Mortgage Broker →
            </Link>
          </div>
        </div>
      </section>

      {/* Recent articles strip */}
      {articles.length > 0 && (
        <section className="py-12 bg-white border-t border-slate-100">
          <div className="container-custom">
            <h2 className="text-xl font-bold text-slate-900 mb-6">Latest Home Loan Guides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {articles.map((a) => (
                <a
                  key={a.slug}
                  href={`/articles/${a.slug}`}
                  className="block bg-slate-50 rounded-xl border border-slate-200 p-4 hover:border-violet-300 hover:shadow-sm transition-all group"
                >
                  <p className="text-xs font-semibold text-violet-600 mb-1 uppercase tracking-wide">
                    {a.category ?? "Home Loans"}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-violet-700 transition-colors leading-snug">
                    {a.title}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </HubPage>
  );
}
