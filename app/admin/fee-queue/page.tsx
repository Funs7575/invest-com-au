"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";

type FeeChange = {
  id: number; broker_id: number; broker_slug: string; broker_name: string;
  field_name: string; old_value: string | null; new_value: string | null;
  extracted_from: string | null; status: string;
  reviewed_by: string | null; reviewed_at: string | null; created_at: string;
};

const FIELD_LABELS: Record<string, string> = {
  asx_fee: "ASX Brokerage",
  us_fee: "US Brokerage",
  fx_rate: "FX Rate",
  inactivity_fee: "Inactivity Fee",
};

export default function AdminFeeQueuePage() {
  const [items, setItems] = useState<FeeChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [busy, setBusy] = useState<number | null>(null);

  const fetchItems = async () => {
    const res = await fetch("/api/admin/fee-queue");
    const data = await res.json();
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleAction = async (id: number, action: "approve" | "reject") => {
    setBusy(id);
    await fetch("/api/admin/fee-queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    await fetchItems();
    setBusy(null);
  };

  const filtered = filter === "pending" ? items.filter(i => i.status === "pending") : items;
  const pendingCount = items.filter(i => i.status === "pending").length;

  if (loading) return <div className="p-6 animate-pulse"><div className="h-8 w-48 bg-slate-200 rounded mb-4" /><div className="h-64 bg-slate-100 rounded-xl" /></div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Fee Change Queue</h1>
          <p className="text-xs text-slate-500">{pendingCount} pending · {items.length} total changes detected</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setFilter("pending")} className={`px-3 py-1.5 text-xs font-semibold rounded-full ${filter === "pending" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
            Pending {pendingCount > 0 && <span className="ml-1 bg-red-500 text-white text-[0.5rem] rounded-full px-1.5">{pendingCount}</span>}
          </button>
          <button onClick={() => setFilter("all")} className={`px-3 py-1.5 text-xs font-semibold rounded-full ${filter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>All</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
          {filter === "pending" ? "No pending fee changes. The scraper will detect changes automatically." : "No fee changes detected yet."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={item.id} className={`bg-white border rounded-lg p-4 ${item.status === "pending" ? "border-amber-200" : "border-slate-200"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-slate-900">{item.broker_name}</span>
                    <span className="text-[0.56rem] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{FIELD_LABELS[item.field_name] || item.field_name}</span>
                    <span className={`text-[0.56rem] font-bold px-1.5 py-0.5 rounded-full ${
                      item.status === "pending" ? "bg-amber-100 text-amber-700" :
                      item.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                      "bg-red-100 text-red-700"
                    }`}>{item.status}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-red-500 line-through">{item.old_value || "N/A"}</span>
                    <Icon name="arrow-right" size={14} className="text-slate-400" />
                    <span className="text-emerald-600 font-bold">{item.new_value || "N/A"}</span>
                  </div>
                  <div className="text-[0.56rem] text-slate-400 mt-1">
                    Detected {new Date(item.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {item.reviewed_at && ` · ${item.status} ${new Date(item.reviewed_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}`}
                  </div>
                </div>
                {item.status === "pending" && (
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => handleAction(item.id, "approve")}
                      disabled={busy === item.id}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                    >
                      ✓ Apply
                    </button>
                    <button
                      onClick={() => handleAction(item.id, "reject")}
                      disabled={busy === item.id}
                      className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-50"
                    >
                      ✗ Skip
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
