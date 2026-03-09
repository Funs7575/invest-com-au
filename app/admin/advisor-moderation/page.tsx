"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import Link from "next/link";
import type { Professional } from "@/lib/types";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";

export default function AdvisorModerationPage() {
  const [advisors, setAdvisors] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [acting, setActing] = useState(false);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("professionals")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setAdvisors((data as Professional[]) || []);
    setSelected(new Set());
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === advisors.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(advisors.map((a) => a.id)));
    }
  };

  const handleAction = async (ids: number[], action: "approve" | "reject") => {
    if (ids.length === 0) return;
    const label = action === "approve" ? "approve" : "reject";
    if (!confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} ${ids.length} advisor(s)?`)) return;

    setActing(true);
    try {
      const res = await fetch("/api/admin/advisor-moderation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      });
      if (res.ok) {
        loadData();
      } else {
        const err = await res.json();
        alert(err.error || "Action failed");
      }
    } catch {
      alert("Network error");
    }
    setActing(false);
  };

  return (
    <AdminShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Advisor Moderation Queue</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review and approve or reject pending advisor signup requests.
        </p>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
          <span className="text-sm font-semibold text-violet-800">
            {selected.size} selected
          </span>
          <button
            onClick={() => handleAction([...selected], "approve")}
            disabled={acting}
            className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
          >
            Approve Selected
          </button>
          <button
            onClick={() => handleAction([...selected], "reject")}
            disabled={acting}
            className="px-4 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            Reject Selected
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs text-slate-500 hover:text-slate-700 font-semibold ml-auto"
          >
            Clear selection
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-slate-400 text-sm py-12 text-center">Loading pending advisors...</div>
      ) : advisors.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">&#10003;</div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">All clear</h2>
          <p className="text-sm text-slate-500">No pending advisor signups to review.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={selected.size === advisors.length && advisors.length > 0}
                    onChange={toggleAll}
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="px-4 py-3 font-semibold text-slate-600">Name</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Email</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Type</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Firm</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Location</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Applied</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {advisors.map((a) => (
                <tr key={a.id} className={`hover:bg-slate-50 ${selected.has(a.id) ? "bg-violet-50/40" : ""}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(a.id)}
                      onChange={() => toggleSelect(a.id)}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{a.name}</div>
                    {a.afsl_number && (
                      <div className="text-[0.62rem] text-slate-400">AFSL {a.afsl_number}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{a.email || "---"}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      {PROFESSIONAL_TYPE_LABELS[a.type] || a.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{a.firm_name || "---"}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{a.location_display || a.location_state || "---"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(a.created_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAction([a.id], "approve")}
                        disabled={acting}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 px-2.5 py-1 border border-emerald-200 rounded-lg hover:bg-emerald-50 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction([a.id], "reject")}
                        disabled={acting}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 px-2.5 py-1 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <Link
                        href={`/advisor/${a.slug}`}
                        target="_blank"
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-slate-50"
                      >
                        Preview
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
