import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import Icon from "@/components/Icon";
import HubPage from "@/components/HubPage";
import HubServiceGrid from "@/components/HubServiceGrid";
import type { HubServiceItem } from "@/components/HubServiceGrid";
import { SMSF_HUB_CONFIG } from "@/lib/verticals";
import HubExitIntent from "@/components/HubExitIntent";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `SMSF Investment & Services Hub (${CURRENT_YEAR}) — Setup, Audit, Property & Strategy`,
  description: SMSF_HUB_CONFIG.metaDescription,
  alternates: { canonical: `${SITE_URL}/smsf` },
  openGraph: {
    title: `SMSF Investment & Services Hub (${CURRENT_YEAR})`,
    description:
      "ASIC-approved SMSF auditors, SMSF specialists, LRBA property experts, and investment strategy advice.",
    url: `${SITE_URL}/smsf`,
  },
};

const SMSF_SERVICE_ITEMS: HubServiceItem[] = [
  {
    title: "Setup & Administration",
    icon: "building",
    description:
      "SMSF establishment, trust deed, ongoing administration, and annual lodgement. Typical setup $1,000–$3,000; ongoing $1,500–$5,000/year.",
    href: "/advisors/smsf-specialists",
    cta: "Find SMSF Specialists",
  },
  {
    title: "Annual Auditing",
    icon: "shield-check",
    description:
      "Every SMSF must be audited annually by an ASIC-approved auditor with an SMSF Auditor Number (SAN). Simple audits $300–$700; complex $800–$1,500+.",
    href: "/smsf/auditors",
    cta: "Find SMSF Auditors",
  },
  {
    title: "Property in SMSF",
    icon: "home",
    description:
      "LRBA borrowing structures, in-specie transfers, direct property purchase, commercial-property-in-SMSF strategy. LRBA structuring $2,000–$5,000.",
    href: "/advisors/smsf-specialists?focus=property",
    cta: "Find SMSF Property Experts",
  },
  {
    title: "Investment Strategy",
    icon: "trending-up",
    description:
      "Written investment strategy review, asset allocation, concentration management, pension-phase transition, and death benefit nominations.",
    href: "/advisors/smsf-specialists",
    cta: "Find Strategy Advisers",
  },
];

async function fetchSmsfArticles() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("articles")
      .select("slug, title, excerpt, category, published_at")
      .eq("status", "published")
      .or(
        "category.eq.smsf,related_advisor_types.cs.{smsf_accountant},related_advisor_types.cs.{smsf_auditor},related_advisor_types.cs.{smsf_specialist}"
      )
      .order("published_at", { ascending: false })
      .limit(6);
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

export default async function SmsfHubPage() {
  const articles = await fetchSmsfArticles();
  const deepDives = SMSF_HUB_CONFIG.deepDives ?? [];

  return (
    <>
    <HubPage
      config={SMSF_HUB_CONFIG}
      serviceGrid={
        <HubServiceGrid
          heading="Four SMSF service categories"
          items={SMSF_SERVICE_ITEMS}
          columns={2}
        />
      }
    >
      {/* Cross-link to SMSF investment guide */}
      <section className="py-10 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-4xl">
          <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Icon name="book-open" size={22} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg md:text-xl font-extrabold text-slate-900 mb-1">
                SMSF Investment Guide
              </h2>
              <p className="text-sm text-slate-600">
                Read our comprehensive guide to what SMSFs can invest in, how
                the concessional tax environment works, and the trustee
                obligations that matter.
              </p>
            </div>
            <Link
              href="/invest/smsf"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-5 py-2.5 rounded-lg shrink-0"
            >
              Read the guide
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured articles */}
      {articles.length > 0 && (
        <section className="py-12 bg-white">
          <div className="container-custom max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
              Featured SMSF articles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((a) => (
                <Link
                  key={a.slug}
                  href={`/article/${a.slug}`}
                  className="block bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-5 transition-colors"
                >
                  <h3 className="text-sm font-extrabold text-slate-900 leading-tight mb-2 line-clamp-2">
                    {a.title}
                  </h3>
                  {a.excerpt && (
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {a.excerpt}
                    </p>
                  )}
                  <p className="text-xs font-bold text-amber-600 mt-3 inline-flex items-center gap-1">
                    Read article
                    <Icon name="arrow-right" size={12} />
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Deep-dives grid */}
      {deepDives.length > 0 && (
        <section className="py-12 bg-white border-t border-slate-200">
          <div className="container-custom max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              SMSF deep-dives
            </h2>
            <p className="text-sm text-slate-600 mb-6">
              Practical guides for the most common SMSF questions and the
              strategies retail super can&rsquo;t deliver.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deepDives.map((card) => (
                <Link
                  key={card.href}
                  href={card.href}
                  className="group bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-5 transition-colors"
                >
                  <h3 className="text-base font-extrabold text-slate-900 group-hover:text-amber-700 mb-1.5">
                    {card.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed mb-3">
                    {card.excerpt}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-600 group-hover:underline">
                    Read guide
                    <Icon name="arrow-right" size={14} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </HubPage>
    <HubExitIntent segmentSlug="smsf-hub" hubName="SMSF" />
    </>
  );
}
