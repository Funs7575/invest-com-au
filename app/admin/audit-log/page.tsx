"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import { downloadCSV } from "@/lib/csv-export";

interface AuditEntry {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, unknown>;
  admin_email: string | null;
  created_at: string;
}

const PAGE_SIZE = 25;

type ViewMode = "table" | "timeline";

const actionColors: Record<string, string> = {
  create: "bg-green-50 text-green-600",
  update: "bg-blue-50 text-blue-600",
  delete: "bg-red-50 text-red-600",
  bulk_update: "bg-purple-50 text-purple-600",
  bulk_delete: "bg-red-50 text-red-600",
  status_change: "bg-amber-50 text-amber-600",
};

const timelineDotColors: Record<string, string> = {
  create: "bg-green-500",
  update: "bg-blue-500",
  delete: "bg-red-500",
  bulk_update: "bg-purple-500",
  bulk_delete: "bg-red-500",
  status_change: "bg-amber-500",
};

const entityTypes = [
  "all", "broker", "article", "scenario", "affiliate_link", "quiz_weight",
  "site_settings", "review", "switch_story", "question",
];

const actionTypes = ["all", "create", "update", "delete", "bulk_update", "status_change"];

/* ── Quick date helpers ── */

function todayStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

function weekStart(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

function monthStart(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  // Existing filter
  const [filter, setFilter] = useState<string>("all");

  // New filters
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Detail drawer
  const [detailEntry, setDetailEntry] = useState<AuditEntry | null>(null);

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Data loading ── */

  const load = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);

    let countQuery = supabase.from("admin_audit_log").select("id", { count: "exact", head: true });
    let dataQuery = supabase
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    // Entity type filter
    if (filter !== "all") {
      countQuery = countQuery.eq("entity_type", filter);
      dataQuery = dataQuery.eq("entity_type", filter);
    }

    // Action type filter
    if (actionFilter !== "all") {
      countQuery = countQuery.eq("action", actionFilter);
      dataQuery = dataQuery.eq("action", actionFilter);
    }

    // Search (server-side ilike on entity_name, admin_email)
    if (search) {
      const searchPattern = `%${search}%`;
      countQuery = countQuery.or(`entity_name.ilike.${searchPattern},admin_email.ilike.${searchPattern},action.ilike.${searchPattern}`);
      dataQuery = dataQuery.or(`entity_name.ilike.${searchPattern},admin_email.ilike.${searchPattern},action.ilike.${searchPattern}`);
    }

    // Date range
    if (dateFrom) {
      const fromISO = new Date(dateFrom).toISOString();
      countQuery = countQuery.gte("created_at", fromISO);
      dataQuery = dataQuery.gte("created_at", fromISO);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      const toISO = toDate.toISOString();
      countQuery = countQuery.lte("created_at", toISO);
      dataQuery = dataQuery.lte("created_at", toISO);
    }

    const [countRes, dataRes] = await Promise.all([countQuery, dataQuery]);
    setTotal(countRes.count || 0);
    if (dataRes.data) setEntries(dataRes.data);
    setLoading(false);
  }, [page, filter, actionFilter, search, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh polling
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(load, 30_000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  /* ── Quick date shortcuts ── */

  function applyQuickDate(from: string) {
    setDateFrom(from);
    setDateTo(new Date().toISOString().split("T")[0]);
    setPage(0);
  }

  /* ── Reset filters ── */

  function resetFilters() {
    setFilter("all");
    setActionFilter("all");
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setPage(0);
  }

  const hasActiveFilters = filter !== "all" || actionFilter !== "all" || search || dateFrom || dateTo;

  return (
    <AdminShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
          <p className="text-sm text-slate-500 mt-1">{total} entries</p>
          <p className="text-sm text-slate-500">Chronological record of all admin actions -- who changed what and when.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              autoRefresh
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            }`}
            title={autoRefresh ? "Auto-refresh ON (every 30s)" : "Enable auto-refresh"}
          >
            {autoRefresh ? "Live" : "Auto-refresh"}
            {autoRefresh && (
              <span className="ml-1.5 inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            )}
          </button>

          {/* View mode toggle */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-green-700 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                viewMode === "timeline"
                  ? "bg-green-700 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Timeline
            </button>
          </div>

          {/* CSV export */}
          <button
            onClick={() => {
              const rows = entries.map((e) => [
                new Date(e.created_at).toLocaleString("en-AU"),
                e.action,
                e.entity_type,
                e.entity_name || "",
                e.admin_email || "",
              ]);
              downloadCSV("audit-log.csv", ["Time", "Action", "Entity Type", "Entity Name", "Admin Email"], rows);
            }}
            className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-lg hover:bg-green-100 border border-green-200 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Search + Date range */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search entity name, admin email, or action..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          />
        </div>
      </div>

      {/* Quick date filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-slate-500 font-medium">Quick:</span>
        <button
          onClick={() => applyQuickDate(todayStart())}
          className="px-2.5 py-1 text-xs rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-colors"
        >
          Today
        </button>
        <button
          onClick={() => applyQuickDate(weekStart())}
          className="px-2.5 py-1 text-xs rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-colors"
        >
          This Week
        </button>
        <button
          onClick={() => applyQuickDate(monthStart())}
          className="px-2.5 py-1 text-xs rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition-colors"
        >
          This Month
        </button>
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="px-2.5 py-1 text-xs rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 font-medium transition-colors ml-2"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Entity type filter (preserved from original) */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs text-slate-500 font-medium">Entity:</span>
        {entityTypes.map((type) => (
          <button
            key={type}
            onClick={() => { setFilter(type); setPage(0); }}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              filter === type
                ? "bg-green-700 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {type === "all" ? "All" : type.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Action type filter */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-xs text-slate-500 font-medium">Action:</span>
        {actionTypes.map((type) => (
          <button
            key={type}
            onClick={() => { setActionFilter(type); setPage(0); }}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              actionFilter === type
                ? "bg-green-700 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {type === "all" ? "All Actions" : type.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Table view */}
      {viewMode === "table" && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse flex gap-4">
                  <div className="h-4 w-20 bg-slate-200 rounded" />
                  <div className="h-4 w-24 bg-slate-200 rounded" />
                  <div className="h-4 w-32 bg-slate-200 rounded" />
                  <div className="h-4 w-16 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {hasActiveFilters
                ? "No entries match your filters."
                : "No audit log entries yet. Actions will be recorded as you use the admin panel."}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Entity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Admin</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => setDetailEntry(entry)}
                  >
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                      {new Date(entry.created_at).toLocaleString("en-AU", {
                        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${actionColors[entry.action] || "bg-slate-100 text-slate-600"}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">{entry.entity_type}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 hidden md:table-cell truncate max-w-[200px]">{entry.entity_name || "\u2014"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden lg:table-cell">{entry.admin_email || "\u2014"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setDetailEntry(entry); }}
                        className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Timeline view */}
      {viewMode === "timeline" && (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          {loading ? (
            <div className="animate-pulse space-y-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-3 h-3 bg-slate-200 rounded-full mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-slate-200 rounded" />
                    <div className="h-3 w-32 bg-slate-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {hasActiveFilters
                ? "No entries match your filters."
                : "No audit log entries yet."}
            </div>
          ) : (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[5px] top-2 bottom-2 w-0.5 bg-slate-200" />

              <div className="space-y-6">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex gap-4 items-start cursor-pointer group"
                    onClick={() => setDetailEntry(entry)}
                  >
                    {/* Dot */}
                    <div
                      className={`w-3 h-3 rounded-full mt-1.5 shrink-0 relative z-10 ring-2 ring-white ${
                        timelineDotColors[entry.action] || "bg-slate-400"
                      }`}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${actionColors[entry.action] || "bg-slate-100 text-slate-600"}`}>
                          {entry.action}
                        </span>
                        <span className="text-sm font-medium text-slate-900">
                          {entry.entity_type}
                        </span>
                        {entry.entity_name && (
                          <span className="text-sm text-slate-600 truncate max-w-[200px]">
                            &mdash; {entry.entity_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>
                          {new Date(entry.created_at).toLocaleString("en-AU", {
                            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                        {entry.admin_email && <span>{entry.admin_email}</span>}
                      </div>
                    </div>

                    {/* Arrow */}
                    <span className="text-slate-300 group-hover:text-slate-500 transition-colors mt-1.5 text-xs shrink-0">
                      View &rarr;
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pagination (preserved from original) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            &larr; Prev
          </button>
          <span className="text-sm text-slate-500">Page {page + 1} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next &rarr;
          </button>
        </div>
      )}

      {/* Detail drawer / slide-out panel */}
      {detailEntry && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setDetailEntry(null)}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-slate-200 shadow-xl overflow-y-auto">
            {/* Drawer header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">Audit Entry Detail</h2>
              <button
                onClick={() => setDetailEntry(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                aria-label="Close detail panel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer content */}
            <div className="px-6 py-5 space-y-5">
              {/* Action badge */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Action</label>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${actionColors[detailEntry.action] || "bg-slate-100 text-slate-600"}`}>
                  {detailEntry.action}
                </span>
              </div>

              {/* Entity info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Entity Type</label>
                  <p className="text-sm text-slate-900">{detailEntry.entity_type}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Entity ID</label>
                  <p className="text-sm text-slate-700 font-mono">{detailEntry.entity_id || "\u2014"}</p>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Entity Name</label>
                <p className="text-sm text-slate-900">{detailEntry.entity_name || "\u2014"}</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Admin</label>
                <p className="text-sm text-slate-700">{detailEntry.admin_email || "\u2014"}</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Timestamp</label>
                <p className="text-sm text-slate-700">
                  {new Date(detailEntry.created_at).toLocaleString("en-AU", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              </div>

              {/* Details JSON */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Details</label>
                {detailEntry.details && Object.keys(detailEntry.details).length > 0 ? (
                  <pre className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-slate-700 overflow-x-auto whitespace-pre-wrap font-mono">
                    {JSON.stringify(detailEntry.details, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-slate-400 italic">No additional details recorded.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
