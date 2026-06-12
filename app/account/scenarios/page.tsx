import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { isFlagEnabled } from "@/lib/feature-flags";
import {
  SCENARIO_OWNER_COLUMNS,
  SCENARIO_WORKSPACE_FLAG,
  type ScenarioOwnerView,
} from "@/lib/scenarios";
import { logger } from "@/lib/logger";
import ScenarioLibraryClient from "./ScenarioLibraryClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Scenarios — Invest.com.au",
  robots: "noindex, nofollow",
};

const log = logger("account:scenarios:page");

function Fallback() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <Link href="/account" className="hover:text-slate-700">
            Account
          </Link>
          <span>/</span>
          <span className="text-slate-700">Scenarios</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
          My Scenarios
        </h1>
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <p className="text-sm text-slate-600">
            Saved scenarios aren&apos;t available just yet. Soon you&apos;ll be
            able to save named what-if scenarios from any calculator, reopen
            them, and compare them side-by-side.
          </p>
          <Link
            href="/calculators"
            className="mt-4 inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm px-4 py-2 rounded-lg"
          >
            Explore calculators
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function AccountScenariosPage() {
  // Flag off (or table not yet shipped) ⇒ clean fallback, never a 500.
  if (!(await isFlagEnabled(SCENARIO_WORKSPACE_FLAG))) {
    return <Fallback />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/account/scenarios");

  let scenarios: ScenarioOwnerView[] = [];
  try {
    const { data, error } = await supabase
      .from("user_scenarios")
      .select(SCENARIO_OWNER_COLUMNS)
      .order("updated_at", { ascending: false });
    if (error) {
      // Table absent / transient error ⇒ degrade to the empty library rather
      // than crashing the account section.
      log.warn("scenarios page load failed", {
        userId: user.id,
        error: error.message,
      });
    } else {
      scenarios = (data as ScenarioOwnerView[] | null) ?? [];
    }
  } catch (err) {
    log.warn("scenarios page threw", {
      userId: user.id,
      err: err instanceof Error ? err.message : String(err),
    });
  }

  return <ScenarioLibraryClient initialScenarios={scenarios} />;
}
