"use client";

import { useEffect, useState, useCallback } from "react";
import AdminShell from "@/components/AdminShell";
import { createClient } from "@/lib/supabase/client";
import type { ProDeal, Broker } from "@/lib/types";

interface FormData {
  broker_slug: string;
  title: string;
  description: string;
  deal_value: string;
  redemption_code: string;
  redemption_url: string;
  redemption_instructions: string;
  terms: string;
  start_date: string;
  end_date: string;
  status: "active" | "expired" | "upcoming";
  featured: boolean;
  sort_order: number;
}

const emptyForm: FormData = {
  broker_slug: "",
  title: "",
  description: "",
  deal_value: "",
  redemption_code: "",
  redemption_url: "",
  redemption_instructions: "",
  terms: "",
  start_date: "",
  end_date: "",
  status: "upcoming",
  featured: false,
  sort_order: 0,
};

export default function ProDealsPage() {
  const supabase = createClient();
  const [items, setItems] = useState<ProDeal[]>([]);
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
        .from("pro_deals")
        .select("*")
        .order("sort_order")
        .order("created_at", { ascending: false }),
      supabase
        .from("brokers")
        .select("id, name, slug, status")
        .eq("status", "active")
        .order("name"),
    ]);
    if (itemsRes.data) setItems(itemsRes.data as ProDeal[]);
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

  const startEdit = (item: ProDeal) => {
    setEditing(item.id);
    setCreating(false);
    setForm({
      broker_slug: item.broker_slug,
      title: item.title,
      description: item.description || "",
      deal_value: item.deal_value || "",
      redemption_code: item.redemption_code || "",
      redemption_url: item.redemption_url || "",
      redemption_instructions: item.redemption_instructions || "",
      terms: item.terms || "",
      start_date: item.start_date || "",
      end_date: item.end_date || "",
      status: item.status,
      featured: item.featured,
      sort_order: item.sort_order,
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
    if (!form.title) {
      showMessage("error", "Title is required");
      return;
    }

    setSaving(true);
    const payload = {
      broker_slug: form.broker_slug,
      title: form.title,
      description: form.description || null,
      deal_value: form.deal_value || null,
      redemption_code: form.redemption_code || null,
      redemption_url: form.redemption_url || null,
      redemption_instructions: form.redemption_instructions || null,
      terms: form.terms || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status,
      featured: form.featured,
      sort_order: form.sort_order,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editing) {
      ({ error } = await supabase
        .from("pro_deals")
        .update(payload)
        .eq("id", editing));
    } else {
      ({ error } = await supabase.from("pro_deals").insert(payload));
    }

    setSaving(false);
    if (error) {
      showMessage("error", error.message);
    } else {
      showMessage("success", editing ? "Deal updated" : "Deal created");
      cancel();
      load();
    }
  };

  const deleteItem = async (id: number) => {
    if (!confirm("Delete this pro deal?")) return;
    const { error } = await supabase
      .from("pro_deals")
      .delete()
      .eq("id", id);
    if (error) {
      showMessage("error", error.message);
    } else {
      showMessage("success", "Deal deleted");
      load();
    }
  };

  const getBrokerName = (slug: string) =>
    brokers.find((b) => b.slug === slug)?.name || slug;

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-green-50 text-green-700",
      expired: "bg-red-50 text-red-700",
      upcoming: "bg-blue-50 text-blue-700",
    };
    return styles[status] || "bg-slate-50 text-slate-700";
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pro Deals</h1>
            <p className="text-sm text-slate-500">
              Manage exclusive broker deals for Pro subscribers
            </p>
          </div>
          <button
            onClick={startCreate}
            className="px-4 py-2 bg-green-700 text-white text-sm font-bold rounded-lg hover:bg-green-800 transition-colors"
          >
            + New Deal
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
              {editing ? "Edit Deal" : "Create Deal"}
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
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Deal Value
                </label>
                <input
                  type="text"
                  value={form.deal_value}
                  onChange={(e) =>
                    setForm({ ...form, deal_value: e.target.value })
                  }
                  placeholder="e.g. $50 credit"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Redemption Code
                </label>
                <input
                  type="text"
                  value={form.redemption_code}
                  onChange={(e) =>
                    setForm({ ...form, redemption_code: e.target.value })
                  }
                  placeholder="e.g. INVEST50"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Redemption URL
                </label>
                <input
                  type="text"
                  value={form.redemption_url}
                  onChange={(e) =>
                    setForm({ ...form, redemption_url: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Redemption Instructions
              </label>
              <textarea
                rows={2}
                value={form.redemption_instructions}
                onChange={(e) =>
                  setForm({
                    ...form,
                    redemption_instructions: e.target.value,
                  })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Terms
              </label>
              <textarea
                rows={2}
                value={form.terms}
                onChange={(e) =>
                  setForm({ ...form, terms: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) =>
                    setForm({ ...form, start_date: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) =>
                    setForm({ ...form, end_date: e.target.value })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value as FormData["status"],
                    })
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="upcoming">Upcoming</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) =>
                      setForm({ ...form, featured: e.target.checked })
                    }
                    className="rounded"
                  />
                  Featured Deal
                </label>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sort_order: parseInt(e.target.value) || 0,
                    })
                  }
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
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">
                      Title
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">
                      Deal Value
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">
                      Status
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">
                      Featured
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">
                      End Date
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
                      <td className="px-4 py-3">{item.title}</td>
                      <td className="px-4 py-3">
                        {item.deal_value || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadge(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.featured ? (
                          <span className="text-green-600">Yes</span>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.end_date || "—"}
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
                        No pro deals yet. Click &quot;+ New Deal&quot; to create one.
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
