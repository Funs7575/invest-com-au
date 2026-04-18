import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { createAdminClient } from "@/lib/supabase/admin";
import Icon from "@/components/Icon";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `SMSF Investment & Services Hub (${CURRENT_YEAR}) — Setup, Audit, Property & Strategy`,
  description:
    "Australia's SMSF services hub. Find ASIC-approved SMSF auditors, SMSF specialist advisers, property-in-SMSF accountants, and investment strategy help. 600,000+ Australian SMSFs; $900B+ in assets.",
  alternates: { canonical: `${SITE_URL}/smsf` },
  openGraph: {
    title: `SMSF Investment & Services Hub (${CURRENT_YEAR})`,
    description:
      "ASIC-approved SMSF auditors, SMSF specialists, LRBA property experts, and investment strategy advice.",
    url: `${SITE_URL}/smsf`,
  },
};

const SERVICE_CARDS = [
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
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("articles")
      .select("slug, title, excerpt, category, published_at")
      .eq("status", "published")
      .or("category.eq.smsf,related_advisor_types.cs.{smsf_accountant},related_advisor_types.cs.{smsf_auditor},related_advisor_types.cs.{smsf_specialist}")
      .order("published_at", { ascending: false })
      .limit(6);
    return (data as Array<{
      slug: string;
      title: string;
      excerpt: string | null;
      category: string | null;
      published_at: string | null;
    }> | null) || [];
  } catch {
    return [];
  }
}

export default async function SmsfHubPage() {
  const articles = await fetchSmsfArticles();

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "SMSF" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <div className="bg-white min-h-screen">
        {/* Hero */}
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav
              className="flex items-center gap-1.5 text-xs text-slate-400 mb-5"
              aria-label="Breadcrumb"
            >
              <Link href="/" className="hover:text-white">
                Home
              </Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">SMSF</span>
            </nav>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              SMSF Investment &amp; Services Hub
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl mb-6">
              600,000+ Australians run their own Self-Managed Super Fund,
              collectively managing $900B+ in assets. Find ASIC-approved SMSF
              auditors, AFSL-licensed specialist advisers, and the experts who
              make property-in-SMSF, LRBA structuring, and pension-phase
              transitions work.
            </p>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 max-w-2xl">
              {[
                { v: "600,000", l: "SMSFs in Australia" },
                { v: "$900B", l: "Assets under management" },
                { v: "1 in 3", l: "Australians 55+ run an SMSF" },
              ].map((s) => (
                <div
                  key={s.l}
                  className="bg-white/10 border border-white/10 rounded-lg px-3 py-2"
                >
                  <dt className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">
                    {s.l}
                  </dt>
                  <dd className="text-lg md:text-xl font-extrabold text-white mt-0.5">
                    {s.v}
                  </dd>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <Link
                href="/quiz?vertical=smsf"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-sm md:text-base px-6 py-3 rounded-lg transition-colors"
              >
                Find an SMSF Specialist
                <Icon name="arrow-right" size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* Service cards */}
        <section className="py-12 bg-white">
          <div className="container-custom max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
              Four SMSF service categories
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SERVICE_CARDS.map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-6 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <Icon
                        name={card.icon}
                        size={20}
                        className="text-amber-700"
                      />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-amber-700">
                      {card.title}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed mb-3">
                    {card.description}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-600 group-hover:underline">
                    {card.cta}
                    <Icon name="arrow-right" size={14} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Cross-link to investment guide */}
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
                  Read our comprehensive guide to what SMSFs can invest in,
                  how the concessional tax environment works, and the
                  trustee obligations that matter.
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

        {/* GAW footer */}
        <section className="py-8 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              <strong>General advice warning.</strong> The information on this
              page is general in nature and does not constitute personal
              financial advice. SMSFs are complex. Before making any decisions
              about your superannuation or tax strategy, consult an
              AFSL-authorised financial adviser, a registered tax agent, and
              — for audits — an ASIC-approved SMSF auditor. We do not provide
              financial product advice.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
