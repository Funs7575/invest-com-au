"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import AdminShell from "@/components/AdminShell";
import ConfirmDialog from "@/components/ConfirmDialog";
import { downloadCSV } from "@/lib/csv-export";
import TableSkeleton from "@/components/TableSkeleton";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

interface ConsultationRow {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  consultant_id: number;
  consultant: { id: number; full_name: string } | null;
  duration_minutes: number;
  price: number;
  pro_price: number | null;
  stripe_price_id: string | null;
  stripe_pro_price_id: string | null;
  cal_link: string;
  category: string;
  status: string;
  featured: boolean;
  sort_order: number;
  created_at: string;
}

interface BookingRow {
  id: number;
  user_id: string;
  consultation_id: number;
  consultation: { title: string } | null;
  stripe_payment_id: string | null;
  amount_paid: number;
  cal_booking_uid: string | null;
  status: string;
  booked_at: string;
  user_email?: string;
}

export default function AdminConsultationsPage() {
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"consultations" | "bookings">("consultations");
  const [showCreate, setShowCreate] = useState(false);
  const [consultants, setConsultants] = useState<{ id: number; full_name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { toast: showToast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<ConsultationRow | null>(null);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const dirty = showCreate || editingId !== null;
  const { confirmNavigation } = useUnsavedChanges(dirty);

  const emptyForm = {
    title: "",
    slug: "",
    description: "",
    consultant_id: "",
    duration_minutes: "30",
    price: "",
    pro_price: "",
    stripe_price_id: "",
    stripe_pro_price_id: "",
    cal_link: "",
    category: "general",
    status: "draft",
    featured: false,
    sort_order: "0",
  };

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const supabase = createClient();

    // Fetch consultations with consultant
    const { data: consultData } = await supabase
      .from("consultations")
      .select("*, consultant:team_members(id, full_name)")
      .order("sort_order", { ascending: true });

    const normalized = ((consultData as unknown as any[]) || []).map((c) => ({
      ...c,
      consultant: Array.isArray(c.consultant)
        ? c.consultant[0] ?? null
        : c.consultant ?? null,
    })) as ConsultationRow[];
    setConsultations(normalized);

    // Fetch team members for dropdown
    const { data: members } = await supabase
      .from("team_members")
      .select("id, full_name")
      .order("full_name");
    setConsultants(members || []);

    // Fetch bookings with consultation title
    const { data: bookingData } = await supabase
      .from("consultation_bookings")
      .select("*, consultation:consultations(title)")
      .order("booked_at", { ascending: false })
      .limit(100);

    const normalizedBookings = ((bookingData as unknown as any[]) || []).map((b) => ({
      ...b,
      consultation: Array.isArray(b.consultation)
        ? b.consultation[0] ?? null
        : b.consultation ?? null,
    })) as BookingRow[];
    setBookings(normalizedBookings);

    setLoading(false);
  };

  const autoSlug = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.cal_link.trim()) return;
    setSaving(true);

    const supabase = createClient();
    const payload = {
      title: form.title.trim(),
      slug: form.slug || autoSlug(form.title),
      description: form.description || null,
      consultant_id: form.consultant_id ? parseInt(form.consultant_id) : null,
      duration_minutes: parseInt(form.duration_minutes) || 30,
      price: Math.round(parseFloat(form.price || "0") * 100),
      pro_price: form.pro_price
        ? Math.round(parseFloat(form.pro_price) * 100)
        : null,
      stripe_price_id: form.stripe_price_id || null,
      stripe_pro_price_id: form.stripe_pro_price_id || null,
      cal_link: form.cal_link.trim(),
      category: form.category,
      status: form.status,
      featured: form.featured,
      sort_order: parseInt(form.sort_order) || 0,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editingId) {
      ({ error } = await supabase
        .from("consultations")
        .update(payload)
        .eq("id", editingId));
    } else {
      ({ error } = await supabase.from("consultations").insert(payload));
    }

    if (error) {
      showToast(`Error: ${error.message}`, "error");
    } else {
      showToast(editingId ? "Consultation updated!" : "Consultation created!", "success");
      setShowCreate(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchData();
    }

    setSaving(false);
  };

  const startEdit = (c: ConsultationRow) => {
    setEditingId(c.id);
    setForm({
      title: c.title,
      slug: c.slug,
      description: c.description || "",
      consultant_id: c.consultant_id?.toString() || "",
      duration_minutes: c.duration_minutes.toString(),
      price: (c.price / 100).toFixed(2),
      pro_price: c.pro_price ? (c.pro_price / 100).toFixed(2) : "",
      stripe_price_id: c.stripe_price_id || "",
      stripe_pro_price_id: c.stripe_pro_price_id || "",
      cal_link: c.cal_link,
      category: c.category,
      status: c.status,
      featured: c.featured,
      sort_order: c.sort_order.toString(),
    });
    setShowCreate(true);
  };

  const cloneConsultation = (c: ConsultationRow) => {
    setEditingId(null);
    setForm({
      title: c.title + " (Copy)",
      slug: c.slug + "-copy",
      description: c.description || "",
      consultant_id: c.consultant_id?.toString() || "",
      duration_minutes: c.duration_minutes.toString(),
      price: (c.price / 100).toFixed(2),
      pro_price: c.pro_price ? (c.pro_price / 100).toFixed(2) : "",
      stripe_price_id: "",
      stripe_pro_price_id: "",
      cal_link: c.cal_link,
      category: c.category,
      status: "draft",
      featured: false,
      sort_order: c.sort_order.toString(),
    });
    setShowCreate(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const supabase = createClient();
    const { error } = await supabase.from("consultations").delete().eq("id", deleteTarget.id);
    if (error) {
      showToast(`Error: ${error.message}`, "error");
    } else {
      showToast("Consultation deleted", "success");
      fetchData();
    }
    setDeleteTarget(null);
  };

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sortedConsultations = [...consultations].sort((a, b) => {
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
    const colors: Record<string, string> = {
      draft: "bg-slate-100 text-slate-600",
      published: "bg-green-100 text-green-700",
      archived: "bg-red-100 text-red-600",
      pending: "bg-yellow-100 text-yellow-700",
      confirmed: "bg-green-100 text-green-700",
      completed: "bg-blue-100 text-blue-700",
      cancelled: "bg-red-100 text-red-600",
    };
    return (
      <span
        className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors[status] || "bg-slate-100 text-slate-600"}`}
      >
        {status}
      </span>
    );
  };

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consultations</h1>
          <p className="text-sm text-slate-500 mt-1">Manage 1-on-1 consultation products. Users book paid sessions with financial experts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (tab === "consultations") {
                const rows = consultations.map((c) => [
                  c.title,
                  c.consultant?.full_name || "",
                  `${c.duration_minutes} min`,
                  `$${(c.price / 100).toFixed(2)}`,
                  c.pro_price ? `$${(c.pro_price / 100).toFixed(2)}` : "",
                  c.cal_link,
                  c.category,
                  c.status,
                  c.featured ? "Yes" : "No",
                ]);
                downloadCSV("consultations.csv", ["Title", "Consultant", "Duration", "Price", "Pro Price", "Cal Link", "Category", "Status", "Featured"], rows);
              } else {
                const rows = bookings.map((b) => [
                  b.user_id,
                  b.consultation?.title || `#${b.consultation_id}`,
                  `$${(b.amount_paid / 100).toFixed(2)}`,
                  b.status,
                  new Date(b.booked_at).toLocaleDateString("en-AU"),
                  b.stripe_payment_id || "",
                ]);
                downloadCSV("consultation-bookings.csv", ["User ID", "Consultation", "Amount", "Status", "Booked Date", "Stripe Payment ID"], rows);
              }
            }}
            className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-lg hover:bg-green-100 border border-green-200 transition-colors"
          >
            Export CSV ↓
          </button>
          <button
            onClick={() => {
              if (showCreate && editingId) {
                setEditingId(null);
                setForm(emptyForm);
              }
              setShowCreate(!showCreate);
            }}
            className="px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-800 transition-colors"
          >
            {showCreate ? "Cancel" : "+ New Consultation"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 mb-6">
        <button
          onClick={() => setTab("consultations")}
          className={`pb-2 text-sm font-semibold transition-colors ${
            tab === "consultations"
              ? "text-green-700 border-b-2 border-green-700"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          All Consultations ({consultations.length})
        </button>
        <button
          onClick={() => setTab("bookings")}
          className={`pb-2 text-sm font-semibold transition-colors ${
            tab === "bookings"
              ? "text-green-700 border-b-2 border-green-700"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Bookings ({bookings.length})
        </button>
      </div>

      {/* Create / Edit form */}
      {showCreate && (
        <form
          onSubmit={handleSave}
          className="mb-8 bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <h2 className="font-bold text-lg text-slate-900">
            {editingId ? "Edit Consultation" : "Create New Consultation"}
          </h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) =>
                  setForm({
                    ...form,
                    title: e.target.value,
                    slug: editingId ? form.slug : autoSlug(e.target.value),
                  })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Slug
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Consultant *
              </label>
              <select
                value={form.consultant_id}
                onChange={(e) =>
                  setForm({ ...form, consultant_id: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                required
              >
                <option value="">Select consultant</option>
                {consultants.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Duration (min)
              </label>
              <select
                value={form.duration_minutes}
                onChange={(e) =>
                  setForm({ ...form, duration_minutes: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="45">45 min</option>
                <option value="60">60 min</option>
                <option value="90">90 min</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="general">General</option>
                <option value="portfolio">Portfolio Review</option>
                <option value="tax">Tax Planning</option>
                <option value="broker-selection">Broker Selection</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Price (AUD)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="99.00"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pro Price (AUD)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.pro_price}
                onChange={(e) =>
                  setForm({ ...form, pro_price: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="79.00 (blank = no discount)"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cal.com Link *
            </label>
            <input
              type="text"
              value={form.cal_link}
              onChange={(e) => setForm({ ...form, cal_link: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              placeholder="username/event-type"
              required
            />
            <p className="text-xs text-slate-400 mt-0.5">Booking calendar URL — users are redirected here after payment</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stripe Price ID
              </label>
              <input
                type="text"
                value={form.stripe_price_id}
                onChange={(e) =>
                  setForm({ ...form, stripe_price_id: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="price_..."
              />
              <p className="text-xs text-slate-400 mt-0.5">Link to the Stripe payment product. Create the product in Stripe first.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stripe Pro Price ID
              </label>
              <input
                type="text"
                value={form.stripe_pro_price_id}
                onChange={(e) =>
                  setForm({ ...form, stripe_pro_price_id: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="price_..."
              />
              <p className="text-xs text-slate-400 mt-0.5">Link to the Stripe payment product. Create the product in Stripe first.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sort Order
              </label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm({ ...form, sort_order: e.target.value })
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) =>
                    setForm({ ...form, featured: e.target.checked })
                  }
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">Featured</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Consultation"
                  : "Create Consultation"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                  setShowCreate(false);
                }}
                className="px-6 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      )}

      {loading ? (
        <TableSkeleton rows={4} cols={7} />
      ) : tab === "consultations" ? (
        /* Consultations table */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:text-slate-900" onClick={() => toggleSort("title")}>
                    Title {sortKey === "title" ? (sortDir === "asc" ? "\u2191" : "\u2193") : ""}
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Consultant
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Duration
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:text-slate-900" onClick={() => toggleSort("price")}>
                    Price {sortKey === "price" ? (sortDir === "asc" ? "\u2191" : "\u2193") : ""}
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Cal Link
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:text-slate-900" onClick={() => toggleSort("status")}>
                    Status {sortKey === "status" ? (sortDir === "asc" ? "\u2191" : "\u2193") : ""}
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:text-slate-900" onClick={() => toggleSort("featured")}>
                    Featured {sortKey === "featured" ? (sortDir === "asc" ? "\u2191" : "\u2193") : ""}
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedConsultations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-slate-400"
                    >
                      No consultations yet. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  sortedConsultations.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {c.title}
                        {c.featured && (
                          <span className="ml-2 text-xs text-amber-600">
                            ★
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {c.consultant?.full_name || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {c.duration_minutes} min
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        ${(c.price / 100).toFixed(0)}
                        {c.pro_price && (
                          <span className="text-xs text-amber-600 ml-1">
                            / ${(c.pro_price / 100).toFixed(0)} Pro
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                        {c.cal_link}
                      </td>
                      <td className="px-4 py-3">{statusBadge(c.status)}</td>
                      <td className="px-4 py-3 text-center">
                        {c.featured ? (
                          <span className="text-amber-600">★</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => cloneConsultation(c)}
                            className="text-xs text-blue-600 hover:underline mr-3"
                          >
                            Clone
                          </button>
                          <button
                            onClick={() => startEdit(c)}
                            className="text-xs text-green-700 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteTarget(c)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Bookings table */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600">
                    User
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Consultation
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Amount
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Status
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Booked
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600">
                    Stripe ID
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-slate-400"
                    >
                      No bookings yet.
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600 text-xs font-mono">
                        {b.user_id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-slate-900">
                        {b.consultation?.title || `#${b.consultation_id}`}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        ${(b.amount_paid / 100).toFixed(0)}
                      </td>
                      <td className="px-4 py-3">{statusBadge(b.status)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(b.booked_at).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono">
                        {b.stripe_payment_id
                          ? b.stripe_payment_id.slice(0, 16) + "..."
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Consultation"
        message={`Delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminShell>
  );
}
