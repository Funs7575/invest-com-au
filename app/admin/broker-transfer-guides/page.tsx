"use client";

import { useEffect, useState, useCallback } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";
import type { BrokerTransferGuide, Broker } from "@/lib/types";

interface FormData {
  broker_slug: string;
  transfer_type: "outbound" | "inbound";
  steps: string; // JSON string for editing
  chess_transfer_fee: number;
  supports_in_specie: boolean;
  in_specie_notes: string;
  special_requirements: string; // newline-separated
  estimated_timeline_days: number;
  exit_fees: string;
  helpful_links: string; // JSON string
}

const emptyForm: FormData = {
  broker_slug: "",
  transfer_type: "outbound",
  steps: "[]",
  chess_transfer_fee: 5400,
  supports_in_specie: true,
  in_specie_notes: "",
  special_requirements: "",
  estimated_timeline_days: 5,
  exit_fees: "",
  helpful_links: "[]",
};

export default function BrokerTransferGuidesPage() {
  const supabase = createClient();
  const [guides, setGuides] = useState<BrokerTransferGuide[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [guidesRes, brokersRes] = await Promise.all([
      supabase
        .from("broker_transfer_guides")
        .select("*")
        .order("broker_slug")
        .order("transfer_type"),
      supabase
        .from("brokers")
        .select("id, name, slug, status")
        .eq("status", "active")
        .order("name"),
    ]);
    if (guidesRes.data) setGuides(guidesRes.data as BrokerTransferGuide[]);
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

  const startEdit = (guide: BrokerTransferGuide) => {
    setEditing(guide.id);
    setCreating(false);
    setForm({
      broker_slug: guide.broker_slug,
      transfer_type: guide.transfer_type,
      steps: JSON.stringify(guide.steps, null, 2),
      chess_transfer_fee: guide.chess_transfer_fee,
      supports_in_specie: guide.supports_in_specie,
      in_specie_notes: guide.in_specie_notes || "",
      special_requirements: (guide.special_requirements || []).join("\n"),
      estimated_timeline_days: guide.estimated_timeline_days,
      exit_fees: guide.exit_fees || "",
      helpful_links: JSON.stringify(guide.helpful_links || [], null, 2),
    });
  };

  const cancel = () => {
    setEditing(null);
    setCreating(false);
    setForm(emptyForm);
  };

  const save = async () => {
    // Validate JSON fields
    let stepsJson, linksJson;
    try {
      stepsJson = JSON.parse(form.steps);
    } catch {
      showMessage("error", "Invalid JSON in Steps field");
      return;
    }
    try {
      linksJson = JSON.parse(form.helpful_links);
    } catch {
      showMessage("error", "Invalid JSON in Helpful Links field");
      return;
    }

    if (!form.broker_slug) {
      showMessage("error", "Broker is required");
      return;
    }

    setSaving(true);
    const payload = {
      broker_slug: form.broker_slug,
      transfer_type: form.transfer_type,
      steps: stepsJson,
      chess_transfer_fee: form.chess_transfer_fee,
      supports_in_specie: form.supports_in_specie,
      in_specie_notes: form.in_specie_notes || null,
      special_requirements: form.special_requirements
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      estimated_timeline_days: form.estimated_timeline_days,
      exit_fees: form.exit_fees || null,
      helpful_links: linksJson,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editing) {
      ({ error } = await supabase
        .from("broker_transfer_guides")
        .update(payload)
        .eq("id", editing));
    } else {
      ({ error } = await supabase
        .from("broker_transfer_guides")
        .insert(payload));
    }

    setSaving(false);
    if (error) {
      showMessage("error", error.message);
    } else {
      showMessage("success", editing ? "Guide updated" : "Guide created");
      cancel();
      load();
    }
  };

  const deleteGuide = async (id: number) => {
    if (!confirm("Delete this transfer guide?")) return;
    const { error } = await supabase
      .from("broker_transfer_guides")
      .delete()
      .eq("id", id);
    if (error) {
      showMessage("error", error.message);
    } else {
      showMessage("success", "Guide deleted");
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
            <h1 className="text-2xl font-bold">Broker Transfer Guides</h1>
            <p className="text-sm text-slate-500">
              Manage broker-specific inbound and outbound transfer instructions
            </p>
          </div>
          <button
            onClick={startCreate}
            className="px-4 py-2 bg-green-700 text-white text-sm font-bold rounded-lg hover:bg-green-800 transition-colors"
          >
            + New Guide
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
              {editing ? "Edit Guide" : "Create Guide"}
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
                  Transfer Type
                </label>
                <div className="flex gap-4 mt-1">
                  {(["outbound", "inbound"] as const).map((t) => (
                    <label key={t} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="transfer_type"
                        value={t}
                        checked={form.transfer_type === t}
                        onChange={() =>
                          setForm({ ...form, transfer_type: t })
                        }
                        className="text-green-700"
                      />
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  CHESS Transfer Fee (cents)
                </label>
                <input
                  type="number"
                  value={form.chess_transfer_fee}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      chess_transfer_fee: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Timeline (days)
                </label>
                <input
                  type="number"
                  value={form.estimated_timeline_days}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      estimated_timeline_days: parseInt(e.target.value) || 5,
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Exit Fees
                </label>
                <input
                  type="text"
                  value={form.exit_fees}
                  onChange={(e) =>
                    setForm({ ...form, exit_fees: e.target.value })
                  }
                  placeholder="None"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.supports_in_specie}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      supports_in_specie: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                Supports In-Specie Transfer
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                In-Specie Notes
              </label>
              <input
                type="text"
                value={form.in_specie_notes}
                onChange={(e) =>
                  setForm({ ...form, in_specie_notes: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Special Requirements (one per line)
              </label>
              <textarea
                rows={3}
                value={form.special_requirements}
                onChange={(e) =>
                  setForm({ ...form, special_requirements: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Steps (JSON)
              </label>
              <textarea
                rows={12}
                value={form.steps}
                onChange={(e) =>
                  setForm({ ...form, steps: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                placeholder='[{"title":"...","description":"...","time_estimate":"...","warning":"..."}]'
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Helpful Links (JSON)
              </label>
              <textarea
                rows={4}
                value={form.helpful_links}
                onChange={(e) =>
                  setForm({ ...form, helpful_links: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                placeholder='[{"label":"...","url":"..."}]'
              />
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
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">
                      Type
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">
                      Steps
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">
                      Timeline
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">
                      CHESS Fee
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">
                      In-Specie
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {guides.map((guide) => (
                    <tr
                      key={guide.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 font-medium">
                        {getBrokerName(guide.broker_slug)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            guide.transfer_type === "inbound"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {guide.transfer_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {guide.steps?.length || 0}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {guide.estimated_timeline_days}d
                      </td>
                      <td className="px-4 py-3 text-center">
                        ${(guide.chess_transfer_fee / 100).toFixed(0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {guide.supports_in_specie ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-red-400">✗</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => startEdit(guide)}
                          className="text-xs text-green-700 hover:underline mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteGuide(guide.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {guides.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-slate-400"
                      >
                        No transfer guides yet. Click &quot;+ New Guide&quot; to create one.
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
