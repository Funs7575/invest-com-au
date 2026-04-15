import AdminShell from "@/components/AdminShell";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";
import { redirect } from "next/navigation";
import FeatureFlagsClient from "./FeatureFlagsClient";

export const dynamic = "force-dynamic";

interface FlagRow {
  flag_key: string;
  enabled: boolean;
  rollout_pct: number;
  allowlist: string[] | null;
  denylist: string[] | null;
  segments: string[] | null;
  description: string | null;
  updated_at?: string;
}

/**
 * /admin/automation/flags — feature flag admin.
 *
 * A flag surface existed in the lib (isFlagEnabled) and a table
 * existed in the migration, but nothing in the admin let a human
 * flip values. This page closes that gap — list every flag, edit
 * enabled / rollout_pct / allowlist / denylist inline, save via
 * the new /api/admin/feature-flags PATCH route.
 */
export default async function AdminFeatureFlagsPage() {
  const guard = await requireAdmin();
  if (!guard.ok) redirect("/admin");

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("feature_flags")
    .select(
      "flag_key, enabled, rollout_pct, allowlist, denylist, segments, description, updated_at",
    )
    .order("flag_key", { ascending: true });

  const flags = (data as FlagRow[] | null) || [];

  return (
    <AdminShell title="Feature flags">
      <div className="max-w-5xl">
        <p className="text-sm text-slate-600 mb-6">
          Every feature flag wired through{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">
            isFlagEnabled()
          </code>
          . Changes propagate within 30 seconds (in-process cache TTL).
        </p>

        {flags.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">
              No feature flags in the database yet. Add seed rows via a
              migration and they&rsquo;ll appear here automatically.
            </p>
          </div>
        ) : (
          <FeatureFlagsClient
            initialFlags={flags.map((f) => ({
              flag_key: f.flag_key,
              enabled: f.enabled,
              rollout_pct: f.rollout_pct,
              allowlist: f.allowlist ?? [],
              denylist: f.denylist ?? [],
              segments: f.segments ?? [],
              description: f.description ?? "",
            }))}
          />
        )}
      </div>
    </AdminShell>
  );
}
