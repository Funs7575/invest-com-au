import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import Icon from "@/components/Icon";
import HubPage from "@/components/HubPage";
import { smsfHubConfig } from "@/lib/hub-configs/smsf";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: smsfHubConfig.title,
  description: smsfHubConfig.metaDescription,
  alternates: { canonical: `${SITE_URL}/smsf` },
  openGraph: {
    title: `SMSF Investment & Services Hub (${CURRENT_YEAR})`,
    description:
      "ASIC-approved SMSF auditors, SMSF specialists, LRBA property experts, and investment strategy advice.",
    url: `${SITE_URL}/smsf`,
  },
};

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
  const serviceGrid = smsfHubConfig.serviceGrid ?? [];
  const deepDives = smsfHubConfig.deepDives ?? [];

  const serviceGridNode = serviceGrid.length > 0 ? (
    <section className="py-12 bg-white">
      <div className="container-custom max-w-6xl">
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
          Four SMSF service categories
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {serviceGrid.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-6 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                {card.icon && (
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <Icon
                      name={card.icon}
                      size={20}
                      className="text-amber-700"
                    />
                  </div>
                )}
                <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-amber-700">
                  {card.title}
                </h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-3">
                {card.description}
              </p>
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-600 group-hover:underline">
                {card.cta ?? "Learn more"}
                <Icon name="arrow-right" size={14} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  ) : undefined;

  const deepDivesNode = deepDives.length > 0 ? (
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
  ) : undefined;

  const crossHubLinksNode = (
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
              Read our comprehensive guide to what SMSFs can invest in, how the
              concessional tax environment works, and the trustee obligations
              that matter.
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
  );

  return (
    <HubPage
      config={smsfHubConfig}
      serviceGrid={serviceGridNode}
      deepDives={deepDivesNode}
      crossHubLinks={crossHubLinksNode}
    >
      {/* Featured articles — dynamic from Supabase, rendered in children slot */}
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
    </HubPage>
  );
}
