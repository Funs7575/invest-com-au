import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { createAdminClient } from "@/lib/supabase/admin";
import { AUTOMATION_FEATURES, FEATURE_CONFIG } from "@/lib/admin/automation-metrics";
import KillSwitchControls from "./KillSwitchControls";

export const dynamic = "force-dynamic";

/**
 * Kill-switch admin page.
 *
 * Shows a toggle per automation feature (plus a "global" toggle at
 * the top). Server-fetches the current state so the page renders
 * without an extra client round-trip, then a client component
 * handles the toggle interactions + POSTs.
 */
export default async function KillSwitchPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("automation_kill_switches")
    .select("feature, disabled, reason, disabled_by, disabled_at")
    .order("feature");

  const byFeature = new Map((data || []).map((r) => [r.feature as string, r]));
  const rows = [
    { feature: "global", title: "GLOBAL — disable all automation", description: "Emergency: freezes every classifier and cron simultaneously. Use only if something is broken platform-wide." },
    ...AUTOMATION_FEATURES.map((key) => ({
      feature: key as string,
      title: FEATURE_CONFIG[key].title,
      description: FEATURE_CONFIG[key].description,
    })),
    { feature: "property_suburb_refresh", title: "Property suburb refresh", description: "Quarterly CoreLogic/SQM data refresh cron. Turn off if the paid data feed is erroring." },
  ].map((r) => ({
    ...r,
    current: byFeature.get(r.feature) || { disabled: false, reason: null, disabled_by: null, disabled_at: null },
  }));

  return (
    <AdminShell
      title="Kill switches"
      subtitle="Freeze classifiers and crons instantly without a deploy"
    >
      <div className="p-4 md:p-6 max-w-5xl">
        <nav className="text-xs text-slate-500 mb-3">
          <Link href="/admin/automation" className="hover:text-slate-900">
            ← Automation dashboard
          </Link>
        </nav>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
          <h2 className="text-sm font-bold text-red-900 mb-1">Operator warning</h2>
          <p className="text-xs text-red-800">
            Flipping a kill switch stops the classifier from running on
            new items. Pending items stay pending — they aren't
            auto-rejected. The GLOBAL toggle stops every automation
            feature at once and should only be used in emergencies.
          </p>
        </div>
        <KillSwitchControls initialRows={rows} />
      </div>
    </AdminShell>
  );
}
