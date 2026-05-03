import { updateStatus, type BugReport } from "./page";

const STATUS_COLORS: Record<BugReport["status"], string> = {
  new: "bg-amber-50 text-amber-700 border-amber-200",
  triaged: "bg-blue-50 text-blue-700 border-blue-200",
  fixed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  wont_fix: "bg-slate-100 text-slate-500 border-slate-200",
};

export default function BugReportRow({ row }: { row: BugReport }) {
  const created = new Date(row.created_at);
  const when = created.toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className={
            "shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide " +
            STATUS_COLORS[row.status]
          }
        >
          {row.status.replace("_", " ")}
        </span>
        {row.severity_guess && (
          <span className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
            {row.severity_guess}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>{when}</span>
            <a
              href={row.page_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 underline-offset-2 hover:underline truncate max-w-[36rem]"
              title={row.page_url}
            >
              {row.page_url}
            </a>
            {row.email && (
              <a
                href={"mailto:" + row.email}
                className="text-slate-600 hover:text-slate-900"
              >
                {row.email}
              </a>
            )}
            {row.viewport && <span>{row.viewport}</span>}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
            {row.user_message}
          </p>
          {row.user_agent && (
            <p className="mt-2 truncate text-[11px] text-slate-400" title={row.user_agent}>
              {row.user_agent}
            </p>
          )}
        </div>
        <form className="flex shrink-0 flex-col gap-1">
          <button
            type="submit"
            formAction={async () => {
              "use server";
              await updateStatus(row.id, "triaged", "admin");
            }}
            disabled={row.status === "triaged" || row.status === "fixed"}
            className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:pointer-events-none"
          >
            Triaged
          </button>
          <button
            type="submit"
            formAction={async () => {
              "use server";
              await updateStatus(row.id, "fixed", "admin");
            }}
            disabled={row.status === "fixed"}
            className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 disabled:pointer-events-none"
          >
            Fixed
          </button>
          <button
            type="submit"
            formAction={async () => {
              "use server";
              await updateStatus(row.id, "wont_fix", "admin");
            }}
            disabled={row.status === "wont_fix"}
            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none"
          >
            Won't fix
          </button>
        </form>
      </div>
    </div>
  );
}
