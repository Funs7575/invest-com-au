import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import Icon from "@/components/Icon";
import HubPage from "@/components/HubPage";
import GrantAlertsSignup from "@/components/grants/GrantAlertsSignup";
import RdTaxCalculator from "@/components/RdTaxCalculator";
import { grantsHubConfig } from "@/lib/hub-configs/grants";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: grantsHubConfig.title,
  description: grantsHubConfig.metaDescription,
  alternates: { canonical: `${SITE_URL}/startup/grants` },
  openGraph: {
    title: grantsHubConfig.title,
    description:
      "R&D Tax Incentive, EMDG, Industry Growth Program — Australia's full grants stack in one hub.",
    url: `${SITE_URL}/startup/grants`,
    type: "website",
    images: [{ url: `/api/og?title=${encodeURIComponent("Startup Grants Australia")}&sub=${encodeURIComponent("R&D Tax Incentive · EMDG · Industry Growth Program · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
  },
};

const GRANT_CARDS = [
  {
    title: "R&D Tax Incentive",
    href: "/grants/rd-tax-incentive",
    badge: "FEDERAL · OPEN NOW",
    badgeTone: "emerald",
    blurb:
      "43.5% refundable cash offset on eligible R&D spend. Annual registration deadline applies — check AusIndustry for the current FY deadline.",
  },
  {
    title: "EMDG",
    href: "/grants/emdg",
    badge: "FEDERAL · ROUND 4 OPEN",
    badgeTone: "emerald",
    blurb:
      "Reimburse up to 50% of overseas marketing spend — up to $80K/year. Trade shows, overseas reps, foreign-market research.",
  },
  {
    title: "Industry Growth Program",
    href: "/grants/industry-growth-program",
    badge: "FEDERAL · CLOSING SOON",
    badgeTone: "amber",
    blurb:
      "Up to $5M for SMEs commercialising new technologies. ~90% of the $287M pool projected spent by June 2026.",
  },
  {
    title: "NSW MVP Ventures",
    href: "/grants/eligibility-quiz",
    badge: "NSW · COMING SOON",
    badgeTone: "slate",
    blurb:
      "$25K–$200K matched funding to commercialise innovative products in NSW. Best for early-stage tech founders.",
  },
  {
    title: "Advance Queensland",
    href: "/grants/eligibility-quiz",
    badge: "QLD · COMING SOON",
    badgeTone: "slate",
    blurb:
      "Multiple programs for QLD tech startups: Ignite Ideas, Commercialisation fund, co-investment streams.",
  },
  {
    title: "LaunchVic",
    href: "/grants/eligibility-quiz",
    badge: "VIC · COMING SOON",
    badgeTone: "slate",
    blurb:
      "LaunchVic grants, accelerator support and innovation vouchers for Victorian founders.",
  },
];

function badgeClass(tone: string) {
  switch (tone) {
    case "emerald":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "amber":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

async function fetchGrantArticles() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("articles")
      .select("slug, title, excerpt")
      .eq("status", "published")
      .in("slug", [
        "rd-tax-incentive-australia-guide",
        "emdg-grant-australia-guide",
        "industry-growth-program-guide",
        "australian-government-grants-complete-guide",
      ])
      .limit(4);
    return (
      (data as Array<{
        slug: string;
        title: string;
        excerpt: string | null;
      }> | null) || []
    );
  } catch {
    return [];
  }
}

export default async function StartupGrantsHubPage() {
  const articles = await fetchGrantArticles();

  const serviceGridNode = (
    <section className="py-12 bg-white">
      <div className="container-custom max-w-6xl">
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
          Six grant programs, mapped
        </h2>
        <p className="text-sm text-slate-600 mb-6">
          Federal and state programs, current open status, and what each one is for.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {GRANT_CARDS.map((g) => (
            <Link
              key={g.title}
              href={g.href}
              className="group bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-5 transition-colors flex flex-col"
            >
              <span
                className={`inline-block w-fit text-[10px] uppercase tracking-wider font-extrabold border rounded-full px-2 py-0.5 mb-3 ${badgeClass(g.badgeTone)}`}
              >
                {g.badge}
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-amber-700 mb-2">
                {g.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">{g.blurb}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-amber-600 group-hover:underline">
                Read more <Icon name="arrow-right" size={14} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );

  const advisorCtaNode = (
    <section className="py-12 bg-slate-900 text-white">
      <div className="container-custom max-w-4xl text-center">
        <h2 className="text-2xl md:text-3xl font-extrabold mb-3">
          Need help maximising your grant claim?
        </h2>
        <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
          The right specialist saves more than they cost — particularly on R&amp;D
          claims over $50K and any IGP application.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-left">
            <h3 className="font-extrabold text-amber-400 mb-1">R&amp;D Tax Advisor</h3>
            <p className="text-sm text-slate-300">
              Specialist in AusIndustry registration, eligible-spend boundaries and
              claim documentation.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-left">
            <h3 className="font-extrabold text-amber-400 mb-1">EMDG Consultant</h3>
            <p className="text-sm text-slate-300">
              Builds the marketing plan, classifies tier correctly and handles
              Austrade reimbursement.
            </p>
          </div>
        </div>
        <Link
          href="/find-advisor"
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-extrabold text-sm md:text-base px-6 py-3 rounded-lg transition-colors"
        >
          Find a Grant Specialist <Icon name="arrow-right" size={16} />
        </Link>
      </div>
    </section>
  );

  return (
    <HubPage
      config={grantsHubConfig}
      serviceGrid={serviceGridNode}
      advisorCta={advisorCtaNode}
    >
      {/* Eligibility quiz CTA */}
      <section className="py-10 bg-slate-50 border-y border-slate-200">
        <div className="container-custom max-w-4xl">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <Icon name="target" size={26} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-1">
                Which grants is your business eligible for?
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Answer 5 quick questions and get a personalised list of grants
                you likely qualify for — with estimated dollar values for each.
              </p>
            </div>
            <Link
              href="/grants/eligibility-quiz"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-5 py-3 rounded-lg shrink-0"
            >
              Check My Eligibility <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* R&D calculator embed */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
            R&amp;D Tax Incentive calculator
          </h2>
          <p className="text-sm text-slate-600 mb-6">
            Estimate your refundable cash offset in 60 seconds, then talk to a
            registered advisor.
          </p>
          <RdTaxCalculator />
        </div>
      </section>

      {/* Grant alerts + specialist matching (CR-04a/b) */}
      <section className="py-12 bg-white">
        <div className="container-custom max-w-4xl grid md:grid-cols-2 gap-4 items-start">
          <GrantAlertsSignup sourcePage="/startup/grants" />
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 md:p-6">
            <h3 className="font-extrabold text-slate-900 mb-1">Work with a grants specialist</h3>
            <p className="text-sm text-slate-600 mb-4">
              Grants &amp; R&amp;D incentive specialists prepare R&amp;D Tax Incentive claims, EMDG
              applications and state-program submissions — and their fees are usually a fraction
              of a successful claim.
            </p>
            <Link
              href="/advisors/grant-writers"
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-extrabold px-4 py-2.5"
            >
              Browse grants specialists <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured articles */}
      {articles.length > 0 && (
        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-6">
              Read deeper
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {articles.map((a) => (
                <Link
                  key={a.slug}
                  href={`/article/${a.slug}`}
                  className="block bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-5 transition-colors"
                >
                  <h3 className="text-sm font-extrabold text-slate-900 leading-tight mb-2 line-clamp-3">
                    {a.title}
                  </h3>
                  {a.excerpt && (
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {a.excerpt}
                    </p>
                  )}
                  <p className="text-xs font-bold text-amber-600 mt-3 inline-flex items-center gap-1">
                    Read article <Icon name="arrow-right" size={12} />
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
