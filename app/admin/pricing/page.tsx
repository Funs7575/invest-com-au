"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface PricingRow {
  id: number;
  advisor_type: string;
  price_cents: number;
  min_price_cents: number;
  max_price_cents: number;
  free_trial_leads: number;
  featured_monthly_cents: number;
  description: string | null;
  updated_at: string | null;
  updated_by: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  mortgage_broker: "Mortgage Brokers",
  buyers_agent: "Buyer's Agents",
  financial_planner: "Financial Planners",
  smsf_accountant: "SMSF Accountants",
  insurance_broker: "Insurance Brokers",
  tax_agent: "Tax Agents",
  wealth_manager: "Wealth Managers",
  estate_planner: "Estate Planners",
  property_advisor: "Property Advisors",
  crypto_advisor: "Crypto Advisors",
  aged_care_advisor: "Aged Care Advisors",
  debt_counsellor: "Debt Counsellors",
  real_estate_agent: "Real Estate Agents",
};

const TIER_COLORS: Record<string, string> = {
  mortgage_broker: "bg-rose-50 border-rose-200",
  buyers_agent: "bg-teal-50 border-teal-200",
  financial_planner: "bg-violet-50 border-violet-200",
  smsf_accountant: "bg-blue-50 border-blue-200",
  insurance_broker: "bg-sky-50 border-sky-200",
  tax_agent: "bg-amber-50 border-amber-200",
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(0);
}

function inputToCents(val: string): number {
  return Math.round(parseFloat(val || "0") * 100);
}

export default function AdminPricingPage() {
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<PricingRow>>({});
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [logs, setLogs] = useState<{ advisor_type: string; field_changed: string; old_value: string; new_value: string; changed_at: string }[]>([]);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    const [{ data: pricingData }, { data: logData }] = await Promise.all([
      supabase.from("lead_pricing").select("*").order("price_cents", { ascending: false }),
      supabase.from("lead_pricing_log").select("*").order("changed_at", { ascending: false }).limit(20),
    ]);
    setPricing((pricingData as PricingRow[]) || []);
    setLogs((logData as typeof logs) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleEdit = (row: PricingRow) => {
    setEditRow(row.advisor_type);
    setEditValues({
      price_cents: row.price_cents,
      min_price_cents: row.min_price_cents,
      max_price_cents: row.max_price_cents,
      free_trial_leads: row.free_trial_leads,
      featured_monthly_cents: row.featured_monthly_cents,
    });
  };

  const handleSave = async (row: PricingRow) => {
    setSaving(row.advisor_type);
    setMessage(null);

    const updates: Record<string, number> = {};
    const logEntries: { advisor_type: string; field_changed: string; old_value: string; new_value: string; changed_by: string }[] = [];

    if (editValues.price_cents !== undefined && editValues.price_cents !== row.price_cents) {
      updates.price_cents = editValues.price_cents;
      logEntries.push({ advisor_type: row.advisor_type, field_changed: "price_cents", old_value: String(row.price_cents), new_value: String(editValues.price_cents), changed_by: "admin" });
    }
    if (editValues.min_price_cents !== undefined && editValues.min_price_cents !== row.min_price_cents) {
      updates.min_price_cents = editValues.min_price_cents;
      logEntries.push({ advisor_type: row.advisor_type, field_changed: "min_price_cents", old_value: String(row.min_price_cents), new_value: String(editValues.min_price_cents), changed_by: "admin" });
    }
    if (editValues.max_price_cents !== undefined && editValues.max_price_cents !== row.max_price_cents) {
      updates.max_price_cents = editValues.max_price_cents;
      logEntries.push({ advisor_type: row.advisor_type, field_changed: "max_price_cents", old_value: String(row.max_price_cents), new_value: String(editValues.max_price_cents), changed_by: "admin" });
    }
    if (editValues.free_trial_leads !== undefined && editValues.free_trial_leads !== row.free_trial_leads) {
      updates.free_trial_leads = editValues.free_trial_leads;
      logEntries.push({ advisor_type: row.advisor_type, field_changed: "free_trial_leads", old_value: String(row.free_trial_leads), new_value: String(editValues.free_trial_leads), changed_by: "admin" });
    }
    if (editValues.featured_monthly_cents !== undefined && editValues.featured_monthly_cents !== row.featured_monthly_cents) {
      updates.featured_monthly_cents = editValues.featured_monthly_cents;
      logEntries.push({ advisor_type: row.advisor_type, field_changed: "featured_monthly_cents", old_value: String(row.featured_monthly_cents), new_value: String(editValues.featured_monthly_cents), changed_by: "admin" });
    }

    if (Object.keys(updates).length === 0) {
      setEditRow(null);
      setSaving(null);
      return;
    }

    const { error } = await supabase
      .from("lead_pricing")
      .update({ ...updates, updated_at: new Date().toISOString(), updated_by: "admin" })
      .eq("advisor_type", row.advisor_type);

    if (error) {
      setMessage({ type: "error", text: `Failed to save: ${error.message}` });
    } else {
      // Log changes
      if (logEntries.length > 0) {
        await supabase.from("lead_pricing_log").insert(logEntries);
      }

      // Apply to all professionals of this type who don't have a custom price
      await supabase
        .from("professionals")
        .update({ lead_price_cents: updates.price_cents || row.price_cents })
        .eq("type", row.advisor_type)
        .is("preferred_lead_price_cents", null);

      if (updates.free_trial_leads !== undefined) {
        // Don't retroactively change free leads for existing advisors
      }

      setMessage({ type: "success", text: `${TYPE_LABELS[row.advisor_type] || row.advisor_type} pricing updated` });
    }

    setEditRow(null);
    setSaving(null);
    loadData();
  };

  const handleApplyAll = async (type: string, priceCents: number) => {
    if (!confirm(`Apply ${formatCents(priceCents)}/lead to ALL ${TYPE_LABELS[type]}? This will override individual pricing.`)) return;
    setSaving(type);
    await supabase.from("professionals").update({ lead_price_cents: priceCents }).eq("type", type);
    setMessage({ type: "success", text: `Applied ${formatCents(priceCents)} to all ${TYPE_LABELS[type]}` });
    setSaving(null);
  };

  // Calculate estimated monthly revenue
  const totalMonthlyEstimate = pricing.reduce((sum, row) => {
    // Rough estimate: 2 leads/month per vertical
    return sum + (row.price_cents * 2);
  }, 0);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading pricing...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lead Pricing Management</h1>
          <p className="text-sm text-slate-500 mt-1">Set per-category lead prices, free trial leads, and featured listing fees</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Est. monthly revenue (2 leads/vertical)</p>
          <p className="text-lg font-bold text-emerald-600">{formatCents(totalMonthlyEstimate)}/mo</p>
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm font-medium ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message.text}
        </div>
      )}

      {/* Pricing Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Vertical</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-700">Lead Price</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-700 hidden md:table-cell">Min</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-700 hidden md:table-cell">Max</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-700">Free Leads</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-700 hidden md:table-cell">Featured/mo</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pricing.map((row) => {
                const isEditing = editRow === row.advisor_type;
                const tierColor = TIER_COLORS[row.advisor_type] || "bg-slate-50 border-slate-200";

                return (
                  <tr key={row.advisor_type} className={`${isEditing ? "bg-blue-50/50" : "hover:bg-slate-50"} transition-colors`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${row.price_cents >= 7000 ? "bg-rose-500" : row.price_cents >= 5000 ? "bg-amber-500" : "bg-slate-400"}`} />
                        <div>
                          <p className="font-semibold text-slate-900">{TYPE_LABELS[row.advisor_type] || row.advisor_type}</p>
                          <p className="text-[0.65rem] text-slate-400">{row.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-slate-400">$</span>
                          <input
                            type="number"
                            className="w-16 px-2 py-1 border border-blue-300 rounded text-center text-sm font-bold"
                            value={centsToInput(editValues.price_cents || 0)}
                            onChange={(e) => setEditValues({ ...editValues, price_cents: inputToCents(e.target.value) })}
                          />
                        </div>
                      ) : (
                        <span className="font-bold text-slate-900 text-base">{formatCents(row.price_cents)}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center hidden md:table-cell">
                      {isEditing ? (
                        <input
                          type="number"
                          className="w-14 px-1 py-1 border border-slate-300 rounded text-center text-xs"
                          value={centsToInput(editValues.min_price_cents || 0)}
                          onChange={(e) => setEditValues({ ...editValues, min_price_cents: inputToCents(e.target.value) })}
                        />
                      ) : (
                        <span className="text-slate-400">{formatCents(row.min_price_cents)}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center hidden md:table-cell">
                      {isEditing ? (
                        <input
                          type="number"
                          className="w-14 px-1 py-1 border border-slate-300 rounded text-center text-xs"
                          value={centsToInput(editValues.max_price_cents || 0)}
                          onChange={(e) => setEditValues({ ...editValues, max_price_cents: inputToCents(e.target.value) })}
                        />
                      ) : (
                        <span className="text-slate-400">{formatCents(row.max_price_cents)}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          className="w-12 px-1 py-1 border border-slate-300 rounded text-center text-xs"
                          value={editValues.free_trial_leads || 0}
                          onChange={(e) => setEditValues({ ...editValues, free_trial_leads: parseInt(e.target.value) || 0 })}
                        />
                      ) : (
                        <span className="text-slate-600">{row.free_trial_leads}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center hidden md:table-cell">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-slate-400 text-xs">$</span>
                          <input
                            type="number"
                            className="w-14 px-1 py-1 border border-slate-300 rounded text-center text-xs"
                            value={centsToInput(editValues.featured_monthly_cents || 0)}
                            onChange={(e) => setEditValues({ ...editValues, featured_monthly_cents: inputToCents(e.target.value) })}
                          />
                        </div>
                      ) : (
                        <span className="text-slate-500">{row.featured_monthly_cents > 0 ? `${formatCents(row.featured_monthly_cents)}/mo` : "—"}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleSave(row)}
                            disabled={saving === row.advisor_type}
                            className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {saving === row.advisor_type ? "..." : "Save"}
                          </button>
                          <button onClick={() => setEditRow(null)} className="px-2 py-1 text-xs text-slate-500 hover:text-slate-900">
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleEdit(row)} className="px-3 py-1 border border-slate-200 text-xs font-medium rounded hover:bg-slate-50">
                            Edit
                          </button>
                          <button onClick={() => handleApplyAll(row.advisor_type, row.price_cents)} className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                            Apply All
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Pricing Changes */}
      {logs.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Recent Pricing Changes</h2>
          <div className="space-y-2">
            {logs.map((log, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-slate-600">
                <span className="text-slate-400 w-32 shrink-0">{new Date(log.changed_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <span className="font-medium text-slate-900">{TYPE_LABELS[log.advisor_type] || log.advisor_type}</span>
                <span className="text-slate-400">{log.field_changed}:</span>
                <span className="text-red-500 line-through">{formatCents(parseInt(log.old_value || "0"))}</span>
                <span className="text-slate-400">→</span>
                <span className="text-emerald-600 font-bold">{formatCents(parseInt(log.new_value || "0"))}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
