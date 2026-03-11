"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Icon from "@/components/Icon";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";

type FeeChange = {
  id: number; broker_id: number; broker_slug: string; broker_name: string;
  field_name: string; old_value: string | null; new_value: string | null;
  extracted_from: string | null; status: string; priority: string;
  auto_applied: boolean; rule_id: number | null;
  reviewed_by: string | null; reviewed_at: string | null; created_at: string;
};

type AutoRule = {
  id: number; rule_name: string; field_name: string;
  condition: string; action: string; enabled: boolean;
};

type StaleBroker = {
  id: number; slug: string; name: string;
  fee_last_checked: string | null; fee_stale: boolean;
  fee_auto_disabled: boolean; fee_check_failures: number;
  status: string;
};

const FIELD_LABELS: Record<string, string> = {
  asx_fee: "ASX Brokerage", us_fee: "US Brokerage",
  fx_rate: "FX Rate", inactivity_fee: "Inactivity Fee",
};

const CONDITION_LABELS: Record<string, string> = {
  any_change: "Any change detected",
  decrease_only: "Fee decreases only",
  increase_under_10pct: "Increases under 10%",
  increase_over_20pct: "Increases over 20%",
  exact_match: "Exact value match",
};

export default function AdminFeeQueuePage() {
  const [items, setItems] = useState<FeeChange[]>([]);
  const [rules, setRules] = useState<AutoRule[]>([]);
  const [staleBrokers, setStaleBrokers] = useState<StaleBroker[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "urgent" | "auto" | "all">("pending");
  const [tab, setTab] = useState<"queue" | "rules" | "staleness">("queue");
  const [busy, setBusy] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const supabase = createClient();

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [queueRes, rulesRes, staleRes] = await Promise.all([
      fetch("/api/admin/fee-queue"),
      supabase.from("fee_auto_rules").select("*").order("id"),
      supabase.from("brokers")
        .select("id, slug, name, fee_last_checked, fee_stale, fee_auto_disabled, fee_check_failures, status")
        .eq("status", "active")
        .order("fee_last_checked", { ascending: true, nullsFirst: true })
        .limit(50),
    ]);
    const queueData = await queueRes.json();
    setItems(Array.isArray(queueData) ? queueData : []);
    setRules((rulesRes.data || []) as AutoRule[]);
    setStaleBrokers((staleRes.data || []) as StaleBroker[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAction = async (id: number, action: "approve" | "reject") => {
    setBusy(id);
    await fetch("/api/admin/fee-queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    await fetchAll();
    setBusy(null);
    setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const handleBulkAction = async (action: "approve" | "reject") => {
    if (selectedIds.size === 0) return;
    if (!confirm(`${action === "approve" ? "Apply" : "Skip"} ${selectedIds.size} fee changes?`)) return;
    setBusy(-1);
    for (const id of selectedIds) {
      await fetch("/api/admin/fee-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
    }
    setSelectedIds(new Set());
    await fetchAll();
    setBusy(null);
  };

  const toggleRule = async (rule: AutoRule) => {
    await supabase.from("fee_auto_rules").update({ enabled: !rule.enabled }).eq("id", rule.id);
    fetchAll();
  };

  const deleteRule = async (id: number) => {
    if (!confirm("Delete this automation rule?")) return;
    await supabase.from("fee_auto_rules").delete().eq("id", id);
    fetchAll();
  };

  const markStale = async (brokerId: number, stale: boolean) => {
    await supabase.from("brokers").update({
      fee_stale: stale,
      ...(stale ? { fee_stale_since: new Date().toISOString() } : { fee_stale_since: null }),
    }).eq("id", brokerId);
    fetchAll();
  };

  const toggleAutoDisable = async (brokerId: number, disabled: boolean) => {
    await supabase.from("brokers").update({
      fee_auto_disabled: disabled,
      ...(disabled ? { status: "paused" } : { status: "active" }),
    }).eq("id", brokerId);
    fetchAll();
  };

  const filtered = useMemo(() => {
    switch (filter) {
      case "pending": return items.filter(i => i.status === "pending");
      case "urgent": return items.filter(i => i.priority === "urgent");
      case "auto": return items.filter(i => i.auto_applied);
      default: return items;
    }
  }, [items, filter]);

  const pendingCount = items.filter(i => i.status === "pending").length;
  const urgentCount = items.filter(i => i.priority === "urgent").length;
  const autoCount = items.filter(i => i.auto_applied).length;

  const staleCount = staleBrokers.filter(b => {
    if (!b.fee_last_checked) return true;
    const daysSince = (Date.now() - new Date(b.fee_last_checked).getTime()) / 86400000;
    return daysSince > 30;
  }).length;

  const allPendingSelected = filtered.filter(i => i.status === "pending").every(i => selectedIds.has(i.id));
  const toggleSelectAll = () => {
    const pendingIds = filtered.filter(i => i.status === "pending").map(i => i.id);
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingIds));
    }
  };

  return (
    <AdminShell title="Fee Queue & Automation" subtitle="Review detected fee changes, set auto-apply rules, and monitor fee staleness">
      {/* Tab nav */}
      <div className="flex gap-1.5 mb-6">
        {([
          { key: "queue", label: "Fee Queue", count: pendingCount },
          { key: "rules", label: "Auto Rules", count: rules.filter(r => r.enabled).length },
          { key: "staleness", label: "Staleness", count: staleCount },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg ${tab === t.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {t.label}
            {t.count > 0 && <span className={`ml-1.5 text-[0.55rem] font-bold px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-white/20" : "bg-slate-200"}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      {loading && <div className="text-center py-12 text-slate-400">Loading...</div>}

      {/* ─── TAB: Fee Queue ─── */}
      {!loading && tab === "queue" && (
        <>
          {/* Filters + bulk actions */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div className="flex gap-1.5">
              {([
                { key: "pending", label: "Pending", count: pendingCount },
                { key: "urgent", label: "Urgent", count: urgentCount },
                { key: "auto", label: "Auto-applied", count: autoCount },
                { key: "all", label: "All", count: items.length },
              ] as const).map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full ${filter === f.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
            {selectedIds.size > 0 && (
              <div className="flex gap-1.5">
                <button onClick={() => handleBulkAction("approve")} disabled={busy === -1}
                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                  ✓ Apply {selectedIds.size} selected
                </button>
                <button onClick={() => handleBulkAction("reject")} disabled={busy === -1}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-50">
                  ✗ Skip {selectedIds.size}
                </button>
              </div>
            )}
          </div>

          {/* Select all */}
          {filtered.some(i => i.status === "pending") && (
            <div className="mb-3">
              <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                <input type="checkbox" checked={allPendingSelected} onChange={toggleSelectAll} className="rounded" />
                Select all pending
              </label>
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">
              {filter === "pending" ? "No pending fee changes. The scraper detects changes automatically." : "No items match this filter."}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(item => (
                <div key={item.id} className={`bg-white border rounded-lg p-4 ${
                  item.priority === "urgent" ? "border-red-200 bg-red-50/30" :
                  item.status === "pending" ? "border-amber-200" :
                  item.auto_applied ? "border-blue-200 bg-blue-50/30" : "border-slate-200"
                }`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      {item.status === "pending" && (
                        <input type="checkbox" checked={selectedIds.has(item.id)}
                          onChange={() => setSelectedIds(prev => {
                            const n = new Set(prev);
                            n.has(item.id) ? n.delete(item.id) : n.add(item.id);
                            return n;
                          })}
                          className="rounded mt-1 shrink-0"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-sm font-bold text-slate-900">{item.broker_name}</span>
                          <span className="text-[0.56rem] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{FIELD_LABELS[item.field_name] || item.field_name}</span>
                          {item.priority === "urgent" && <span className="text-[0.56rem] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">URGENT</span>}
                          {item.auto_applied && <span className="text-[0.56rem] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">AUTO</span>}
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
                          {item.extracted_from && <> · <a href={item.extracted_from} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">source</a></>}
                        </div>
                      </div>
                    </div>
                    {item.status === "pending" && (
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => handleAction(item.id, "approve")} disabled={busy === item.id}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-50">✓ Apply</button>
                        <button onClick={() => handleAction(item.id, "reject")} disabled={busy === item.id}
                          className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 disabled:opacity-50">✗ Skip</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── TAB: Auto Rules ─── */}
      {!loading && tab === "rules" && (
        <>
          <p className="text-sm text-slate-500 mb-4">
            Automation rules control how detected fee changes are handled. Fee decreases can be auto-approved, large increases can be flagged as urgent.
          </p>
          <div className="space-y-2 mb-6">
            {rules.map(rule => (
              <div key={rule.id} className={`bg-white border rounded-lg p-4 flex items-center justify-between gap-3 ${rule.enabled ? "border-slate-200" : "border-slate-100 opacity-60"}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{rule.rule_name}</span>
                    <span className={`text-[0.56rem] font-bold px-1.5 py-0.5 rounded-full ${
                      rule.action === "auto_approve" ? "bg-emerald-100 text-emerald-700" :
                      rule.action === "auto_reject" ? "bg-red-100 text-red-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>{rule.action.replace("_", " ")}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Field: <strong>{rule.field_name === "*" ? "all fields" : FIELD_LABELS[rule.field_name] || rule.field_name}</strong>
                    {" · "}Condition: <strong>{CONDITION_LABELS[rule.condition] || rule.condition}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleRule(rule)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg ${rule.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {rule.enabled ? "Enabled" : "Disabled"}
                  </button>
                  <button onClick={() => deleteRule(rule.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Icon name="trash-2" size={14} /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-2">How auto-rules work</h3>
            <ul className="text-xs text-slate-600 space-y-1.5">
              <li className="flex items-start gap-2"><Icon name="check" size={14} className="text-emerald-500 shrink-0 mt-0.5" />When the fee scraper detects a change, it checks all enabled rules in order.</li>
              <li className="flex items-start gap-2"><Icon name="check" size={14} className="text-emerald-500 shrink-0 mt-0.5" /><strong>Auto-approve:</strong> The change is applied to the broker immediately, no manual review needed.</li>
              <li className="flex items-start gap-2"><Icon name="check" size={14} className="text-emerald-500 shrink-0 mt-0.5" /><strong>Flag urgent:</strong> The change is marked as URGENT and appears first in your queue.</li>
              <li className="flex items-start gap-2"><Icon name="check" size={14} className="text-emerald-500 shrink-0 mt-0.5" />If no rule matches, the change goes to the queue as a normal pending item.</li>
            </ul>
          </div>
        </>
      )}

      {/* ─── TAB: Staleness ─── */}
      {!loading && tab === "staleness" && (
        <>
          <p className="text-sm text-slate-500 mb-4">
            Brokers whose fees haven&apos;t been verified in over 30 days. Stale fee data risks misleading users and damaging trust.
          </p>

          {/* Staleness summary */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-center">
              <p className="text-[0.6rem] text-slate-500 uppercase font-medium">Fresh (&lt;30d)</p>
              <p className="text-2xl font-extrabold text-emerald-600">{staleBrokers.filter(b => b.fee_last_checked && (Date.now() - new Date(b.fee_last_checked).getTime()) / 86400000 <= 30).length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-center">
              <p className="text-[0.6rem] text-slate-500 uppercase font-medium">Stale (&gt;30d)</p>
              <p className="text-2xl font-extrabold text-amber-600">{staleBrokers.filter(b => b.fee_last_checked && (Date.now() - new Date(b.fee_last_checked).getTime()) / 86400000 > 30 && (Date.now() - new Date(b.fee_last_checked).getTime()) / 86400000 <= 90).length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-3 text-center">
              <p className="text-[0.6rem] text-slate-500 uppercase font-medium">Critical (&gt;90d)</p>
              <p className="text-2xl font-extrabold text-red-600">{staleBrokers.filter(b => !b.fee_last_checked || (Date.now() - new Date(b.fee_last_checked).getTime()) / 86400000 > 90).length}</p>
            </div>
          </div>

          <div className="space-y-2">
            {staleBrokers.map(b => {
              const daysSince = b.fee_last_checked ? Math.round((Date.now() - new Date(b.fee_last_checked).getTime()) / 86400000) : 999;
              const severity = daysSince > 90 ? "critical" : daysSince > 30 ? "stale" : "fresh";
              return (
                <div key={b.id} className={`bg-white border rounded-lg px-4 py-3 flex items-center justify-between gap-3 ${
                  severity === "critical" ? "border-red-200" : severity === "stale" ? "border-amber-200" : "border-slate-200"
                }`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{b.name}</span>
                      {b.fee_auto_disabled && <span className="text-[0.56rem] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">DISABLED</span>}
                      {b.fee_stale && <span className="text-[0.56rem] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">STALE</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Last checked: {b.fee_last_checked ? `${daysSince} days ago (${new Date(b.fee_last_checked).toLocaleDateString("en-AU", { day: "numeric", month: "short" })})` : "Never"}
                      {b.fee_check_failures > 0 && <span className="text-red-500 ml-1">· {b.fee_check_failures} scraper failures</span>}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {!b.fee_stale && severity !== "fresh" && (
                      <button onClick={() => markStale(b.id, true)}
                        className="px-2.5 py-1 text-[0.6rem] font-semibold bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200">Mark Stale</button>
                    )}
                    {b.fee_stale && (
                      <button onClick={() => markStale(b.id, false)}
                        className="px-2.5 py-1 text-[0.6rem] font-semibold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200">Clear Stale</button>
                    )}
                    {!b.fee_auto_disabled && severity === "critical" && (
                      <button onClick={() => toggleAutoDisable(b.id, true)}
                        className="px-2.5 py-1 text-[0.6rem] font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200">Disable Broker</button>
                    )}
                    {b.fee_auto_disabled && (
                      <button onClick={() => toggleAutoDisable(b.id, false)}
                        className="px-2.5 py-1 text-[0.6rem] font-semibold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200">Re-enable</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </AdminShell>
  );
}
