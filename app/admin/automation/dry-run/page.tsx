import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import DryRunForm from "./DryRunForm";

export const dynamic = "force-dynamic";

/**
 * Classifier dry-run tester.
 *
 * Admin can paste JSON input for any classifier and preview the
 * verdict + signals without touching the DB. Used to tune thresholds
 * and debug why a particular row got escalated.
 */
export default function DryRunPage() {
  return (
    <AdminShell
      title="Classifier dry-run tester"
      subtitle="Paste a JSON payload and preview the verdict without side effects"
    >
      <div className="p-4 md:p-6 max-w-4xl">
        <nav className="text-xs text-slate-500 mb-3">
          <Link href="/admin/automation" className="hover:text-slate-900">
            ← Automation dashboard
          </Link>
        </nav>
        <DryRunForm />
      </div>
    </AdminShell>
  );
}
