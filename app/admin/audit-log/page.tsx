"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";

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

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      setLoading(true);

      let countQuery = supabase.from("admin_audit_log").select("id", { count: "exact", head: true });
      let dataQuery = supabase
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (filter !== "all") {
        countQuery = countQuery.eq("entity_type", filter);
        dataQuery = dataQuery.eq("entity_type", filter);
      }

      const [countRes, dataRes] = await Promise.all([countQuery, dataQuery]);
      setTotal(countRes.count || 0);
      if (dataRes.data) setEntries(dataRes.data);
      setLoading(false);
    }
    load();
  }, [page, filter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const actionColors: Record<string, string> = {
    create: "bg-green-50 text-green-600",
    update: "bg-blue-50 text-blue-600",
    delete: "bg-red-50 text-red-600",
    bulk_update: "bg-purple-50 text-purple-600",
    bulk_delete: "bg-red-50 text-red-600",
    status_change: "bg-amber-50 text-amber-600",
  };

  const entityTypes = ["all", "broker", "article", "scenario", "affiliate_link", "quiz_weight", "site_settings"];

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
          <p className="text-sm text-slate-500 mt-1">{total} entries</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-xs text-slate-500 font-medium">Filter:</span>
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
            {type === "all" ? "All" : type.replace("_", " ")}
          </button>
        ))}
      </div>

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
            No audit log entries yet. Actions will be recorded as you use the admin panel.
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50">
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
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
    </AdminShell>
  );
}
