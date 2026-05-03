import { redirect } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import { createAdminClient } from "@/lib/supabase/admin";
import BugReportRow from "./BugReportRow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PAGE_SIZE = 25;

const STATUSES = ["all", "new", "triaged", "fixed", "wont_fix"] as const;
type StatusFilter = (typeof STATUSES)[number];

export interface BugReport {
  id: string;
  created_at: string;
  page_url: string;
  route: string | null;
  user_message: string;
  email: string | null;
  user_agent: string | null;
  viewport: string | null;
  user_id: string | null;
  severity_guess: string | null;
  status: "new" | "triaged" | "fixed" | "wont_fix";
  triaged_by: string | null;
  triaged_at: string | null;
}

interface SearchParams {
  status?: string;
  page?: string;
}

export default async function BugReportsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const status: StatusFilter = (
    STATUSES.includes(params.status as StatusFilter) ? params.status : "new"
  ) as StatusFilter;
  const page = Math.max(0, parseInt(params.page ?? "0", 10) || 0);

  const supabase = createAdminClient();

  let query = supabase
    .from("bug_reports")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, count, error } = await query;

  if (error) {
    return (
      <AdminShell title="Bug reports" subtitle="User-submitted issues">
        <div className="p-6">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load bug reports: {error.message}
          </div>
        </div>
      </AdminShell>
    );
  }

  const rows = (data ?? []) as BugReport[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminShell
      title="Bug reports"
      subtitle="Submissions from the sitewide Report-a-Problem button"
    >
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm">
          {STATUSES.map((s) => {
            const href =
              s === status ? "?status=" + s : "?status=" + s + "&page=0";
            const active = s === status;
            return (
              <a
                key={s}
                href={href}
                className={
                  "rounded-md border px-3 py-1.5 transition-colors " +
                  (active
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 font-medium"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300")
                }
              >
                {s.replace("_", " ")}
              </a>
            );
          })}
          <div className="ml-auto text-xs text-slate-500">
            {total} {total === 1 ? "row" : "rows"} · page {page + 1} of {totalPages}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
            No bug reports {status === "all" ? "yet" : `with status "${status}"`}.
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <BugReportRow key={row.id} row={row} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <a
            href={"?status=" + status + "&page=" + Math.max(0, page - 1)}
            aria-disabled={page === 0}
            className={
              "rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm " +
              (page === 0
                ? "pointer-events-none text-slate-300"
                : "text-slate-700 hover:border-slate-300")
            }
          >
            ← Previous
          </a>
          <a
            href={"?status=" + status + "&page=" + (page + 1)}
            aria-disabled={page + 1 >= totalPages}
            className={
              "rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm " +
              (page + 1 >= totalPages
                ? "pointer-events-none text-slate-300"
                : "text-slate-700 hover:border-slate-300")
            }
          >
            Next →
          </a>
        </div>
      </div>
    </AdminShell>
  );
}

/* ─── Server actions used by BugReportRow ─────────────────────────── */

async function updateStatus(
  id: string,
  newStatus: BugReport["status"],
  triagedBy: string,
): Promise<void> {
  "use server";
  const supabase = createAdminClient();
  const patch: Partial<BugReport> = { status: newStatus };
  if (newStatus === "triaged" || newStatus === "fixed" || newStatus === "wont_fix") {
    patch.triaged_by = triagedBy;
    patch.triaged_at = new Date().toISOString();
  }
  await supabase.from("bug_reports").update(patch).eq("id", id);
  redirect("/admin/bug-reports");
}

export { updateStatus };
