import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Scenario } from "@/lib/types";

export const metadata = {
  title: "Investing Scenarios — Invest.com.au",
  description: "Find the best broker for your specific situation: SMSF, kids, expats, day trading, and more.",
};

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {scenarios?.map((scenario: Scenario) => (
            <Link
              key={scenario.id}
              href={`/scenario/${scenario.slug}`}
              className="border border-slate-200 rounded-lg p-8 hover:shadow-lg transition-shadow"
            >
              {scenario.icon && (
                <div className="text-4xl mb-4">{scenario.icon}</div>
              )}
              <h2 className="text-xl font-bold mb-2">{scenario.title}</h2>
              {scenario.hero_title && (
                <p className="text-slate-600">{scenario.hero_title}</p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
