"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import AdminShell from "@/components/AdminShell";

interface CourseRow {
  id: number;
  slug: string;
  title: string;
  status: string;
  price: number;
  pro_price: number | null;
  revenue_share_percent: number;
  featured: boolean;
  sort_order: number;
  created_at: string;
  creator: { id: number; full_name: string } | null;
}

interface RevenueByCreator {
  creator_id: number;
  creator_name: string;
  total_revenue: number;
  creator_share: number;
  platform_share: number;
  purchases: number;
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [revenue, setRevenue] = useState<RevenueByCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"courses" | "revenue">("courses");
  const [showCreate, setShowCreate] = useState(false);
  const [creators, setCreators] = useState<{ id: number; full_name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast: showToast } = useToast();

  // New course form state
  const [form, setForm] = useState({
    title: "",
    slug: "",
    subtitle: "",
    description: "",
    price: "",
    pro_price: "",
    creator_id: "",
    revenue_share_percent: "0",
    level: "beginner",
    stripe_price_id: "",
    stripe_pro_price_id: "",
    cover_image_url: "",
    guarantee: "30-day money-back guarantee — no questions asked.",
    status: "draft",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const supabase = createClient();

    // Fetch courses with creator
    const { data: coursesData } = await supabase
      .from("courses")
      .select("id, slug, title, status, price, pro_price, revenue_share_percent, featured, sort_order, created_at, creator:team_members(id, full_name)")
      .order("sort_order", { ascending: true });

    // Supabase returns joined relations as arrays; normalise to single object
    const normalized = ((coursesData as unknown as any[]) || []).map((c) => ({
      ...c,
      creator: Array.isArray(c.creator) ? c.creator[0] ?? null : c.creator ?? null,
    })) as CourseRow[];
    setCourses(normalized);

    // Fetch team members for creator dropdown
    const { data: members } = await supabase
      .from("team_members")
      .select("id, full_name")
      .order("full_name");

    setCreators(members || []);

    // Fetch revenue summary
    const { data: revenueData } = await supabase
      .from("course_revenue")
      .select("creator_id, total_amount, creator_amount, platform_amount, creator:team_members(full_name)");

    // Group by creator
    const grouped = new Map<number, RevenueByCreator>();
    ((revenueData as any[]) || []).forEach((r: any) => {
      const existing = grouped.get(r.creator_id);
      if (existing) {
        existing.total_revenue += r.total_amount;
        existing.creator_share += r.creator_amount;
        existing.platform_share += r.platform_amount;
        existing.purchases += 1;
      } else {
        grouped.set(r.creator_id, {
          creator_id: r.creator_id,
          creator_name: (Array.isArray(r.creator) ? r.creator[0]?.full_name : r.creator?.full_name) || "Unknown",
          total_revenue: r.total_amount,
          creator_share: r.creator_amount,
          platform_share: r.platform_amount,
          purchases: 1,
        });
      }
    });

    setRevenue(Array.from(grouped.values()));
    setLoading(false);
  };

  const autoSlug = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase.from("courses").insert({
      title: form.title.trim(),
      slug: form.slug || autoSlug(form.title),
      subtitle: form.subtitle || null,
      description: form.description || null,
      price: Math.round(parseFloat(form.price || "0") * 100),
      pro_price: form.pro_price ? Math.round(parseFloat(form.pro_price) * 100) : null,
      creator_id: form.creator_id ? parseInt(form.creator_id) : null,
      revenue_share_percent: parseInt(form.revenue_share_percent) || 0,
      level: form.level,
      stripe_price_id: form.stripe_price_id || null,
      stripe_pro_price_id: form.stripe_pro_price_id || null,
      cover_image_url: form.cover_image_url || null,
      guarantee: form.guarantee || null,
      status: form.status,
    });

    if (error) {
      showToast(`Error: ${error.message}`, "error");
    } else {
      showToast("Course created!", "success");
      setShowCreate(false);
      setForm({
        title: "", slug: "", subtitle: "", description: "", price: "", pro_price: "",
        creator_id: "", revenue_share_percent: "0", level: "beginner",
        stripe_price_id: "", stripe_pro_price_id: "", cover_image_url: "",
        guarantee: "30-day money-back guarantee — no questions asked.", status: "draft",
      });
      fetchData();
    }

    setSaving(false);
  };

  return (
    <AdminShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Courses</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-lg hover:bg-green-800 transition-colors"
        >
          {showCreate ? "Cancel" : "+ New Course"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 mb-6">
        <button
          onClick={() => setTab("courses")}
          className={`pb-2 text-sm font-semibold transition-colors ${
            tab === "courses" ? "text-green-700 border-b-2 border-green-700" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          All Courses
        </button>
        <button
          onClick={() => setTab("revenue")}
          className={`pb-2 text-sm font-semibold transition-colors ${
            tab === "revenue" ? "text-green-700 border-b-2 border-green-700" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Revenue by Creator
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="mb-8 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-bold text-lg text-slate-900">Create New Course</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value, slug: autoSlug(e.target.value) })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subtitle</label>
            <input
              type="text"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Price (AUD)</label>
              <input
                type="number"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="297.00"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pro Price (AUD)</label>
              <input
                type="number"
                step="0.01"
                value={form.pro_price}
                onChange={(e) => setForm({ ...form, pro_price: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="197.00"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Level</label>
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Creator</label>
              <select
                value={form.creator_id}
                onChange={(e) => setForm({ ...form, creator_id: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">None (In-house)</option>
                {creators.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Revenue Share %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={form.revenue_share_percent}
                onChange={(e) => setForm({ ...form, revenue_share_percent: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Stripe Price ID</label>
              <input
                type="text"
                value={form.stripe_price_id}
                onChange={(e) => setForm({ ...form, stripe_price_id: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="price_..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Stripe Pro Price ID</label>
              <input
                type="text"
                value={form.stripe_pro_price_id}
                onChange={(e) => setForm({ ...form, stripe_pro_price_id: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="price_..."
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Cover Image URL</label>
            <input
              type="url"
              value={form.cover_image_url}
              onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-green-700 text-white text-sm font-bold rounded-lg hover:bg-green-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "Creating..." : "Create Course"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-white border border-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tab === "courses" ? (
        /* Courses table */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Course</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Creator</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Price</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Share</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{c.title}</div>
                    <div className="text-xs text-slate-400">/{c.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.creator?.full_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    ${(c.price / 100).toFixed(0)}
                    {c.pro_price && (
                      <span className="text-xs text-slate-400 ml-1">
                        (Pro: ${(c.pro_price / 100).toFixed(0)})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {c.revenue_share_percent}%
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.status === "published" ? "bg-green-50 text-green-700" :
                      c.status === "draft" ? "bg-slate-100 text-slate-600" :
                      "bg-red-50 text-red-700"
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/courses/${c.slug}`}
                      className="text-green-700 hover:text-green-800 font-medium text-xs"
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No courses yet. Create your first course above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Revenue table */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Creator</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-700">Purchases</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-700">Total Revenue</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-700">Creator Share</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-700">Platform Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {revenue.map((r) => (
                <tr key={r.creator_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">{r.creator_name}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{r.purchases}</td>
                  <td className="px-4 py-3 text-right text-slate-600">${(r.total_revenue / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-green-700 font-medium">${(r.creator_share / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">${(r.platform_share / 100).toFixed(2)}</td>
                </tr>
              ))}
              {revenue.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No revenue data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
