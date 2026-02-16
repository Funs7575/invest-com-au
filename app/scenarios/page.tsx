import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Scenario } from "@/lib/types";
import ScrollFadeIn from "@/components/ScrollFadeIn";

export const metadata = {
  title: "Investing Scenarios — Invest.com.au",
  description: "Find the best broker for your specific situation: SMSF, kids, expats, day trading, and more.",
};

const borderColors = [
  "border-l-amber-400",
  "border-l-blue-400",
  "border-l-green-400",
  "border-l-purple-400",
];

export default async function ScenariosPage() {
  const supabase = await createClient();

  const { data: scenarios } = await supabase
    .from('scenarios')
    .select('*')
    .order('id', { ascending: true });

  return (
    <div className="py-12">
      <div className="container-custom">
        <h1 className="text-4xl font-bold mb-4">Investing Scenarios</h1>
        <p className="text-lg text-slate-600 mb-8">
          Find the best broker for your specific situation.
        </p>

        <ScrollFadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {scenarios?.map((scenario: Scenario, index: number) => (
              <Link
                key={scenario.id}
                href={`/scenario/${scenario.slug}`}
                className={`group border border-slate-200 border-l-4 ${borderColors[index % borderColors.length]} rounded-lg p-8 hover-lift transition-all`}
              >
                {scenario.icon && (
                  <div className="text-4xl mb-4">{scenario.icon}</div>
                )}
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold mb-2">{scenario.title}</h2>
                  <span className="text-slate-300 group-hover:text-green-700 transition-colors text-lg">→</span>
                </div>
                {scenario.hero_title && (
                  <p className="text-slate-600">{scenario.hero_title}</p>
                )}
              </Link>
            ))}
          </div>
        </ScrollFadeIn>
      </div>
    </div>
  );
}
