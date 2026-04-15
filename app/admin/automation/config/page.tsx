import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { createAdminClient } from "@/lib/supabase/admin";
import ConfigEditor from "./ConfigEditor";

export const dynamic = "force-dynamic";

/**
 * Classifier threshold editor page.
 *
 * Reads every row from classifier_config server-side and hands it
 * to a small client component for inline editing. Edits POST to
 * /api/admin/automation/config which validates bounds and audits.
 */
export default async function AutomationConfigPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("classifier_config")
    .select("id, classifier, threshold_name, value, min_value, max_value, description, updated_by, updated_at")
    .order("classifier", { ascending: true })
    .order("threshold_name", { ascending: true });

  return (
    <AdminShell
      title="Classifier thresholds"
      subtitle="Live-editable values. Writes take effect within 60s."
    >
      <div className="p-4 md:p-6 max-w-5xl">
        <nav className="text-xs text-slate-500 mb-3">
          <Link href="/admin/automation" className="hover:text-slate-900">
            ← Automation dashboard
          </Link>
        </nav>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <h2 className="text-sm font-bold text-amber-900 mb-1">Caution</h2>
          <p className="text-xs text-amber-800">
            Thresholds control auto-approve / auto-reject decisions. A
            value that looks reasonable but lowers the reject bar can
            cause mass false-positive rejects. Use the{" "}
            <Link href="/admin/automation/dry-run" className="underline">
              dry-run tester
            </Link>{" "}
            before saving changes.
          </p>
        </div>
        <ConfigEditor initialRows={data || []} />
      </div>
    </AdminShell>
  );
}
