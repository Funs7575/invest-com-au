"use client";

import { useEffect, useState, useCallback } from "react";
import AdminShell from "@/components/AdminShell";
import ConfirmDialog from "@/components/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import { downloadCSV } from "@/lib/csv-export";
import TableSkeleton from "@/components/TableSkeleton";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
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
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [deleteTarget, setDeleteTarget] = useState<ProDeal | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const dirty = creating || editing !== null;
  const { confirmNavigation } = useUnsavedChanges(dirty);

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

  const cloneDeal = (item: ProDeal) => {
    setEditing(null);
    setCreating(true);
    setForm({
      broker_slug: item.broker_slug,
      title: item.title + " (Copy)",
      description: item.description || "",
      deal_value: item.deal_value || "",
      redemption_code: item.redemption_code || "",
      redemption_url: item.redemption_url || "",
      redemption_instructions: item.redemption_instructions || "",
      terms: item.terms || "",
      start_date: item.start_date || "",
      end_date: item.end_date || "",
      status: "upcoming",
      featured: false,
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

  const deleteItem = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("pro_deals")
      .delete()
      .eq("id", deleteTarget.id);
    if (error) {
      showMessage("error", error.message);
    } else {
      showMessage("success", "Deal deleted");
      load();
    }
    setDeleteTarget(null);
  };

  const getBrokerName = (slug: string) =>
    brokers.find((b) => b.slug === slug)?.name || slug;

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    return !q || item.title.toLowerCase().includes(q) || (item.description || "").toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey as keyof typeof a];
    const bVal = b[sortKey as keyof typeof b];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    const cmp = typeof aVal === "number" && typeof bVal === "number"
      ? aVal - bVal
      : String(aVal).localeCompare(String(bVal));
    return sortDir === "asc" ? cmp : -cmp;
  });

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: "bg-emerald-50 text-emerald-700",
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
              Exclusive deals for Pro members. These incentivise subscriptions and add value.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadCSV(
                "pro-deals.csv",
                ["Title", "Description", "Broker", "Discount", "Code", "Status", "Expiry"],
                items.map((item) => [
                  item.title,
                  item.description || "",
                  getBrokerName(item.broker_slug),
                  item.deal_value || "",
                  item.redemption_code || "",
                  item.status,
                  item.end_date || "",
                ])
              )}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={startCreate}
              className="px-4 py-2 bg-emerald-700 text-white text-sm font-bold rounded-lg hover:bg-emerald-800 transition-colors"
            >
              + New Deal
            </button>
          </div>
        </div>

        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        />

        {message && (
          <div
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
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
                <p className="text-xs text-slate-400 mt-0.5">Dollar value of the deal shown to users</p>
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
                className="px-4 py-2 bg-emerald-700 text-white text-sm font-bold rounded-lg hover:bg-emerald-800 transition-colors disabled:opacity-50"
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
          <TableSkeleton rows={4} cols={7} />
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:text-slate-900" onClick={() => toggleSort("broker_slug")}>
                      Broker {sortKey === "broker_slug" ? (sortDir === "asc" ? "\u2191" : "\u2193") : ""}
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:text-slate-900" onClick={() => toggleSort("title")}>
                      Title {sortKey === "title" ? (sortDir === "asc" ? "\u2191" : "\u2193") : ""}
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:text-slate-900" onClick={() => toggleSort("deal_value")}>
                      Deal Value {sortKey === "deal_value" ? (sortDir === "asc" ? "\u2191" : "\u2193") : ""}
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:text-slate-900" onClick={() => toggleSort("status")}>
                      Status {sortKey === "status" ? (sortDir === "asc" ? "\u2191" : "\u2193") : ""}
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600">
                      Featured
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:text-slate-900" onClick={() => toggleSort("end_date")}>
                      End Date {sortKey === "end_date" ? (sortDir === "asc" ? "\u2191" : "\u2193") : ""}
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((item) => (
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
                          <span className="text-emerald-600">Yes</span>
                        ) : (
                          <span className="text-slate-400">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.end_date || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => cloneDeal(item)}
                          className="text-xs text-blue-600 hover:underline mr-3"
                        >
                          Clone
                        </button>
                        <button
                          onClick={() => startEdit(item)}
                          className="text-xs text-emerald-700 hover:underline mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <div className="text-center py-12">
                          <div className="text-3xl mb-2">💎</div>
                          <p className="text-sm font-medium text-slate-700 mb-1">No pro deals yet</p>
                          <p className="text-xs text-slate-400 max-w-sm mx-auto">
                            Pro deals are exclusive broker offers available only to Pro subscribers, such as reduced fees, bonus credits, or special sign-up incentives.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Pro Deal"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={deleteItem}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminShell>
  );
}
