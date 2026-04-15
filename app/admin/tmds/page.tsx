import AdminShell from "@/components/AdminShell";
import { listAllTmds } from "@/lib/tmds";
import TmdAdminClient from "./TmdAdminClient";

export const dynamic = "force-dynamic";

/**
 * Admin page for Target Market Determinations.
 *
 * DDO regime (Corporations Act s994A–C) requires every financial
 * product we distribute to have a current, in-force TMD link
 * published for consumers. This page is where the compliance team
 * adds + updates TMDs for brokers, advisors and funds.
 */
export default async function AdminTmdsPage() {
  const items = await listAllTmds();

  return (
    <AdminShell title="Target Market Determinations (TMDs)">
      <div className="max-w-5xl">
        <p className="text-sm text-slate-600 mb-6">
          The DDO regime requires every distributed product to have a
          current TMD link. New partners must have a TMD added here
          before they ship on the site. Rows with a past{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">valid_until</code>{" "}
          date need review.
        </p>

        <TmdAdminClient
          initialItems={items.map((i) => ({
            id: i.id,
            product_type: i.product_type,
            product_ref: i.product_ref,
            product_name: i.product_name,
            tmd_url: i.tmd_url,
            tmd_version: i.tmd_version,
            reviewed_at: i.reviewed_at,
            valid_from: i.valid_from,
            valid_until: i.valid_until,
          }))}
        />
      </div>
    </AdminShell>
  );
}
