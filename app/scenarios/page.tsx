import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import type { Scenario } from "@/lib/types";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

export const revalidate = 3600;

export const metadata = {
  title: "Investing Scenarios",
  description: "Find the best platform for your specific situation: SMSF, kids, expats, day trading, and more.",
  openGraph: {
    title: "Investing Scenarios",
    description: "Find the best platform for your specific situation: SMSF, kids, expats, day trading, and more.",
    images: [{ url: "/api/og?title=Investing+Scenarios&subtitle=Find+the+best+platform+for+your+situation&type=scenario", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/scenarios" },
};

const borderColors = [
  "border-amber-400",
  "border-blue-400",
  "border-emerald-400",
  "border-purple-400",
  "border-rose-400",
  "border-teal-400",
  "border-indigo-400",
];

// Map scenario slugs to local cover images
const SCENARIO_IMAGES: Record<string, string> = {
  "first-home-buyer": "/images/scenarios/first-home-buyer.svg",
  "retirees": "/images/scenarios/retirees.svg",
  "esg-investing": "/images/scenarios/esg-investing.svg",
  "day-trading": "/images/scenarios/day-trading.svg",
  "expats": "/images/scenarios/expats.svg",
  "kids": "/images/scenarios/kids.svg",
  "smsf": "/images/scenarios/smsf.svg",
};

const SCENARIOS_FAQS = [
  {
    q: "What are investing scenarios?",
    a: "Investing scenarios are curated guides that show the best Australian investing platform for a specific life situation — not just the cheapest platform overall. For example, an expat living overseas needs a platform that accepts non-resident accounts and handles withholding tax correctly; a first home buyer might prioritise low brokerage and CHESS sponsorship over advanced charting tools; an SMSF trustee needs a platform with explicit SMSF account support and annual tax reporting. Each scenario guides you to the platform that fits your specific circumstances.",
  },
  {
    q: "How do the scenario recommendations stay up to date?",
    a: "Each scenario is reviewed quarterly and updated within 24 hours when a platform changes a policy that affects it — such as a platform stopping non-resident accounts (impacts the Expats scenario) or a new platform launching SMSF support (impacts the SMSF scenario). Scenario recommendations are editorial — they are not sponsored or paid placements. The recommended platform is whichever best meets the scenario's requirements based on our full broker review rubric.",
  },
  {
    q: "Can I trust scenario recommendations if I have a complex situation?",
    a: "Scenario guides are a useful starting point, but they use a simplified set of criteria relevant to that investor type. If your situation is complex — for example, you are an expat SMSF trustee who trades US stocks actively — you may need to cross-reference multiple scenario guides or use the comparison tool to build a custom head-to-head. For complex situations, we also recommend consulting a licensed financial adviser who can assess your specific needs.",
  },
  {
    q: "Are the scenario guides personal financial advice?",
    a: "No. Scenario guides are general information only and do not constitute personal financial advice. They do not take into account your individual objectives, financial situation, tax position, or specific needs. The platform recommendations are editorial assessments. Before choosing an investment platform or making investment decisions, consult a licensed financial adviser who holds an Australian Financial Services Licence appropriate to your needs.",
  },
];

const scenariosFaqLd = faqJsonLd(SCENARIOS_FAQS);

export default async function ScenariosPage() {
  const supabase = await createClient();

  const { data: scenarios } = await supabase
    .from('scenarios')
    .select('*')
    .order('id', { ascending: true });

  const bcLd = breadcrumbJsonLd([{ name: "Home", url: absoluteUrl("/") }, { name: "Scenarios" }]);

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(bcLd) }} />
    {scenariosFaqLd && (
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(scenariosFaqLd) }} />
    )}
    <div className="py-5 md:py-12">
      <div className="container-custom">
        <h1 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4">Investing Scenarios</h1>
        <p className="text-sm md:text-lg text-slate-500 mb-4 md:mb-8">
          Find the best platform for your specific situation.
        </p>

        <ScrollFadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {scenarios?.map((scenario: Scenario, index: number) => {
              const coverImage = SCENARIO_IMAGES[scenario.slug];
              return (
                <Link
                  key={scenario.id}
                  href={`/scenario/${scenario.slug}`}
                  className={`group border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 bg-white`}
                >
                  {/* Cover image */}
                  <div className="relative w-full h-32 md:h-40 overflow-hidden">
                    {coverImage ? (
                      <Image
                        src={coverImage}
                        alt={scenario.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center`}>
                        {scenario.icon && (
                          <span className="text-4xl opacity-60">{scenario.icon}</span>
                        )}
                      </div>
                    )}
                    {/* Gradient overlay for text legibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    {/* Emoji overlaid bottom-left on image */}
                    {scenario.icon && (
                      <div className="absolute bottom-2 left-3 text-xl md:text-2xl drop-shadow-lg">{scenario.icon}</div>
                    )}
                    {/* Accent border bottom of image */}
                    <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${borderColors[index % borderColors.length]} bg-current`} />
                  </div>

                  {/* Card body */}
                  <div className="p-4 md:p-5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base md:text-xl font-bold text-slate-900 group-hover:text-slate-700 transition-colors">
                        {scenario.title}
                      </h2>
                      <span className="text-slate-300 group-hover:text-slate-600 transition-colors text-lg ml-2 shrink-0">→</span>
                    </div>
                    {scenario.hero_title && (
                      <p className="text-xs md:text-sm text-slate-500 mt-1 leading-snug">{scenario.hero_title}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </ScrollFadeIn>
      </div>
    </div>

    <HubAdvisorCTA
      heading="Get advice matched to your investing scenario"
      subheading="Complex situations — expats, SMSFs, active traders, business owners — often span multiple scenarios. A licensed financial adviser can assess your specific circumstances and build a strategy that combines the right tools for your situation."
      intent={{ need: "planning", context: ["investing_scenario", "portfolio_strategy"] }}
      source="scenarios"
      ctaLabel="Find a financial adviser"
      className="py-12 bg-amber-50 border-t border-amber-200"
    />

    <div className="border-t border-slate-200 bg-white">
      <div className="container-custom max-w-4xl py-8 md:py-10">
        <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
        <div className="space-y-3">
          {SCENARIOS_FAQS.map((faq) => (
            <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                {faq.q}
                <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
              </summary>
              <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}
