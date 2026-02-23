"use client";

import { useEffect, useState, useCallback } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";
import type { BrokerHealthScore, Broker } from "@/lib/types";

interface FormData {
  broker_slug: string;
  overall_score: number;
  regulatory_score: number;
  regulatory_notes: string;
  client_money_score: number;
  client_money_notes: string;
  financial_stability_score: number;
  financial_stability_notes: string;
  platform_reliability_score: number;
  platform_reliability_notes: string;
  insurance_score: number;
  insurance_notes: string;
  afsl_number: string;
  afsl_status: string;
}

const emptyForm: FormData = {
  broker_slug: "",
  overall_score: 0,
  regulatory_score: 0,
  regulatory_notes: "",
  client_money_score: 0,
  client_money_notes: "",
  financial_stability_score: 0,
  financial_stability_notes: "",
  platform_reliability_score: 0,
  platform_reliability_notes: "",
  insurance_score: 0,
  insurance_notes: "",
  afsl_number: "",
  afsl_status: "",
};

export default function HealthScoresPage() {
  const supabase = createClient();
  const [items, setItems] = useState<BrokerHealthScore[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [itemsRes, brokersRes] = await Promise.all([
      supabase
        .from("broker_health_scores")
        .select("*")
        .order("broker_slug"),
      supabase
        .from("brokers")
        .select("id, name, slug, status")
        .eq("status", "active")
        .order("name"),
    ]);
    if (itemsRes.data) setItems(itemsRes.data as BrokerHealthScore[]);
    if (brokersRes.data) setBrokers(brokersRes.data as Broker[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const startCreate = () => {
    setCreating(true);
    setEditing(null);
    setForm(emptyForm);
  };

  const startEdit = (item: BrokerHealthScore) => {
    setEditing(item.id);
    setCreating(false);
    setForm({
      broker_slug: item.broker_slug,
      overall_score: item.overall_score,
      regulatory_score: item.regulatory_score,
      regulatory_notes: item.regulatory_notes || "",
      client_money_score: item.client_money_score,
      client_money_notes: item.client_money_notes || "",
      financial_stability_score: item.financial_stability_score,
      financial_stability_notes: item.financial_stability_notes || "",
      platform_reliability_score: item.platform_reliability_score,
      platform_reliability_notes: item.platform_reliability_notes || "",
      insurance_score: item.insurance_score,
      insurance_notes: item.insurance_notes || "",
      afsl_number: item.afsl_number || "",
      afsl_status: item.afsl_status || "",
    });
  };

  const cancel = () => {
    setEditing(null);
    setCreating(false);
    setForm(emptyForm);
  };

  const save = async () => {
    if (!form.broker_slug) {
      showMessage("error", "Broker is required");
      return;
    }

    setSaving(true);
    const payload = {
      broker_slug: form.broker_slug,
      overall_score: form.overall_score,
      regulatory_score: form.regulatory_score,
      regulatory_notes: form.regulatory_notes || null,
      client_money_score: form.client_money_score,
      client_money_notes: form.client_money_notes || null,
      financial_stability_score: form.financial_stability_score,
      financial_stability_notes: form.financial_stability_notes || null,
      platform_reliability_score: form.platform_reliability_score,
      platform_reliability_notes: form.platform_reliability_notes || null,
      insurance_score: form.insurance_score,
      insurance_notes: form.insurance_notes || null,
      afsl_number: form.afsl_number || null,
      afsl_status: form.afsl_status || null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editing) {
      ({ error } = await supabase
        .from("broker_health_scores")
        .update(payload)
        .eq("id", editing));
    } else {
      ({ error } = await supabase
        .from("broker_health_scores")
        .insert(payload));
    }

    setSaving(false);
    if (error) {
      showMessage("error", error.message);
    } else {
      showMessage("success", editing ? "Health score updated" : "Health score created");
      cancel();
      load();
    }
  };

  const deleteItem = async (id: number) => {
    if (!confirm("Delete this health score?")) return;
    const { error } = await supabase
      .from("broker_health_scores")
      .delete()
      .eq("id", id);
    if (error) {
      showMessage("error", error.message);
    } else {
      showMessage("success", "Health score deleted");
      load();
    }
  };

  const getBrokerName = (slug: string) =>
    brokers.find((b) => b.slug === slug)?.name || slug;

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Broker Health Scores</h1>
            <p className="text-sm text-slate-500">
              Manage broker health and risk scores across multiple categories
            </p>
          </div>
          <button
            onClick={startCreate}
            className="px-4 py-2 bg-green-700 text-white text-sm font-bold rounded-lg hover:bg-green-800 transition-colors"
          >
            + New Health Score
          </button>
        </div>

        {message && (
          <div
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Form */}
        {(creating || editing) && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold">
              {editing ? "Edit Health Score" : "Create Health Score"}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Broker
                </label>
                <select
                  value={form.broker_slug}
                  onChange={(e) =>
                    setForm({ ...form, broker_slug: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select broker...</option>
                  {brokers.map((b) => (
                    <option key={b.slug} value={b.slug}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Overall Score
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.overall_score}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      overall_score: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Regulatory Score
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.regulatory_score}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      regulatory_score: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Regulatory Notes
                </label>
                <input
                  type="text"
                  value={form.regulatory_notes}
                  onChange={(e) =>
                    setForm({ ...form, regulatory_notes: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Client Money Score
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.client_money_score}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      client_money_score: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Client Money Notes
                </label>
                <input
                  type="text"
                  value={form.client_money_notes}
                  onChange={(e) =>
                    setForm({ ...form, client_money_notes: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Financial Stability Score
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.financial_stability_score}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      financial_stability_score:
                        parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Financial Stability Notes
                </label>
                <input
                  type="text"
                  value={form.financial_stability_notes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      financial_stability_notes: e.target.value,
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Platform Reliability Score
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.platform_reliability_score}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      platform_reliability_score:
                        parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Platform Reliability Notes
                </label>
                <input
                  type="text"
                  value={form.platform_reliability_notes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      platform_reliability_notes: e.target.value,
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Insurance Score
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.insurance_score}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      insurance_score: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Insurance Notes
                </label>
                <input
                  type="text"
                  value={form.insurance_notes}
                  onChange={(e) =>
                    setForm({ ...form, insurance_notes: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  AFSL Number
                </label>
                <input
                  type="text"
                  value={form.afsl_number}
                  onChange={(e) =>
                    setForm({ ...form, afsl_number: e.target.value })
                  }
                  placeholder="e.g. 243480"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  AFSL Status
                </label>
                <input
                  type="text"
                  value={form.afsl_status}
                  onChange={(e) =>
                    setForm({ ...form, afsl_status: e.target.value })
                  }
                  placeholder="e.g. Current"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={save}
                disabled={saving}
                className="px-4 py-2 bg-green-700 text-white text-sm font-bold rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </button>
              <button
                onClick={cancel}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">
                      Broker
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">
                      Overall
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">
                      Regulatory
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">
                      Client Money
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">
                      Stability
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">
                      AFSL #
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-medium">
                        {getBrokerName(item.broker_slug)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            item.overall_score >= 80
                              ? "bg-green-50 text-green-700"
                              : item.overall_score >= 60
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {item.overall_score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.regulatory_score}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.client_money_score}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.financial_stability_score}
                      </td>
                      <td className="px-4 py-3">
                        {item.afsl_number || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => startEdit(item)}
                          className="text-xs text-green-700 hover:underline mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-slate-400"
                      >
                        No health scores yet. Click &quot;+ New Health Score&quot; to
                        create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
