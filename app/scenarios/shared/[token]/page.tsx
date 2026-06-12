import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import Icon from "@/components/Icon";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { isFlagEnabled } from "@/lib/feature-flags";
import {
  SCENARIO_WORKSPACE_FLAG,
  calculatorMetaFor,
  openInCalculatorHref,
} from "@/lib/scenarios";
import { getSharedScenario } from "@/lib/scenarios-server";
import { scenarioFields } from "@/lib/scenario-format";

export const dynamic = "force-dynamic";

// Read-only share surface — never indexed.
export const metadata: Metadata = {
  title: "Shared scenario — Invest.com.au",
  robots: { index: false, follow: false },
};

export default async function SharedScenarioPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Fail closed: flag off ⇒ this surface does not exist.
  if (!(await isFlagEnabled(SCENARIO_WORKSPACE_FLAG))) notFound();

  const scenario = await getSharedScenario(token);
  if (!scenario) notFound();

  const meta = calculatorMetaFor(scenario.calculator_key);
  const inputFields = scenarioFields(scenario.inputs);
  const snapshotFields = scenarioFields(scenario.results_snapshot);
  const openHref = openInCalculatorHref(scenario.calculator_key, scenario.inputs);

  return (
    <div className="min-h-screen bg-slate-50">
      <section className="bg-gradient-to-br from-violet-700 via-violet-800 to-violet-900 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <p className="text-violet-300 text-[11px] font-semibold uppercase tracking-widest mb-2">
            Shared scenario · {meta.label}
          </p>
          <h1 className="text-2xl sm:text-4xl font-extrabold mb-2">
            {scenario.name}
          </h1>
          <p className="text-violet-100 text-sm max-w-xl">
            A read-only snapshot of someone&apos;s calculator inputs. General
            information only — not personal advice.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Inputs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">
            Inputs
          </h2>
          {inputFields.length === 0 ? (
            <p className="text-sm text-slate-500">No inputs recorded.</p>
          ) : (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {inputFields.map((f) => (
                <div
                  key={f.key}
                  className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-2"
                >
                  <dt className="text-xs text-slate-500">{f.label}</dt>
                  <dd className="text-sm font-semibold text-slate-900 text-right">
                    {f.display}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Results snapshot (optional) */}
        {snapshotFields.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">
              Result snapshot
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              {snapshotFields.map((f) => (
                <div
                  key={f.key}
                  className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-2"
                >
                  <dt className="text-xs text-slate-500">{f.label}</dt>
                  <dd className="text-sm font-semibold text-slate-900 text-right">
                    {f.display}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-[11px] text-slate-400 mt-3">
              Snapshot captured when the scenario was saved. Re-open the
              calculator to recompute with current rates.
            </p>
          </div>
        )}

        {/* Open-in-calculator CTA — restores the inputs via the URL handoff. */}
        <Link
          href={openHref}
          className="w-full inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-base px-6 py-3.5 rounded-xl"
        >
          <Icon name="external-link" size={16} />
          Open this in the {meta.label} yourself
        </Link>

        <div className="text-center text-xs text-slate-500">
          Want to save and compare your own scenarios?{" "}
          <Link href="/auth/signup" className="underline">
            Create a free account
          </Link>
          .
        </div>

        <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {GENERAL_ADVICE_WARNING}
          </p>
        </div>
      </section>
    </div>
  );
}
