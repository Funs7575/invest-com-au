import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import type { Scenario } from "@/lib/types";
import ScrollFadeIn from "@/components/ScrollFadeIn";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = {
  title: "Investing Scenarios",
  description: "Find the best platform for your specific situation: SMSF, kids, expats, day trading, and more.",
  openGraph: {
    title: "Investing Scenarios — Invest.com.au",
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
    </>
  );
}
