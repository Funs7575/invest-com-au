"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import AdminShell from "@/components/AdminShell";
import { useToast } from "@/components/Toast";
import type { CourseLesson, CoursePurchase } from "@/lib/types";

export default function AdminCoursePage() {
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [purchases, setPurchases] = useState<CoursePurchase[]>([]);
  const [editing, setEditing] = useState<CourseLesson | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"lessons" | "purchases">("lessons");

  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();

  const loadLessons = useCallback(async () => {
    const { data } = await supabase
      .from("course_lessons")
      .select("*")
      .order("module_index")
      .order("lesson_index");
    if (data) setLessons(data as CourseLesson[]);
  }, [supabase]);

  const loadPurchases = useCallback(async () => {
    const { data } = await supabase
      .from("course_purchases")
      .select("*")
      .order("purchased_at", { ascending: false });
    if (data) setPurchases(data as CoursePurchase[]);
  }, [supabase]);

  useEffect(() => {
    loadLessons();
    loadPurchases();
  }, [loadLessons, loadPurchases]);

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);

    const { error } = await supabase
      .from("course_lessons")
      .update({
        title: editing.title,
        content: editing.content || "",
        duration_minutes: editing.duration_minutes,
        is_free_preview: editing.is_free_preview,
        related_brokers: editing.related_brokers || [],
        updated_at: new Date().toISOString(),
      })
      .eq("id", editing.id);

    if (error) {
      toast("Save failed: " + error.message, "error");
    } else {
      toast("Lesson saved", "success");
      setEditing(null);
      loadLessons();
    }
    setSaving(false);
  };

  // Revenue stats
  const totalRevenue = purchases.reduce((s, p) => s + p.amount_paid, 0);
  const totalPurchases = purchases.length;

  // Group lessons by module
  const moduleGroups: Record<number, CourseLesson[]> = {};
  lessons.forEach((l) => {
    if (!moduleGroups[l.module_index]) moduleGroups[l.module_index] = [];
    moduleGroups[l.module_index].push(l);
  });

  return (
    <AdminShell>
      <h1 className="text-2xl font-bold mb-1">Course Management</h1>
      <p className="text-sm text-slate-500 mb-6">
        Manage lessons, view purchases, and track revenue.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Total Lessons</p>
          <p className="text-2xl font-bold">{lessons.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Free Previews</p>
          <p className="text-2xl font-bold">{lessons.filter((l) => l.is_free_preview).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Total Purchases</p>
          <p className="text-2xl font-bold">{totalPurchases}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Revenue</p>
          <p className="text-2xl font-bold text-green-700">
            ${(totalRevenue / 100).toLocaleString("en-AU", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {(["lessons", "purchases"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t
                ? "border-green-600 text-green-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "lessons" ? "Lessons" : "Purchases"}
          </button>
        ))}
      </div>

      {tab === "lessons" && (
        <>
          {editing ? (
            /* ─── Edit Lesson ─── */
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">
                  Edit Lesson: {editing.title}
                </h2>
                <button
                  onClick={() => setEditing(null)}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  ← Back
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editing.title}
                    onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Content (HTML)
                  </label>
                  <textarea
                    value={editing.content || ""}
                    onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                    rows={20}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={editing.duration_minutes}
                      onChange={(e) =>
                        setEditing({ ...editing, duration_minutes: parseInt(e.target.value) || 10 })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Free Preview
                    </label>
                    <select
                      value={editing.is_free_preview ? "true" : "false"}
                      onChange={(e) =>
                        setEditing({ ...editing, is_free_preview: e.target.value === "true" })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="false">No — Paid Only</option>
                      <option value="true">Yes — Free Preview</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Related Brokers (comma-separated slugs)
                  </label>
                  <input
                    type="text"
                    value={(editing.related_brokers || []).join(", ")}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        related_brokers: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    placeholder="stake, commsec, selfwealth"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2 bg-green-700 text-white text-sm font-bold rounded-lg hover:bg-green-800 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Lesson"}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="px-5 py-2 border border-slate-200 text-sm font-medium rounded-lg hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ─── Lessons List ─── */
            <div className="space-y-6">
              {Object.entries(moduleGroups)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([moduleIndex, moduleLessons]) => (
                  <div key={moduleIndex} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                      <h3 className="text-sm font-bold text-slate-700">
                        Module {moduleIndex}: {moduleLessons[0]?.module_title}
                      </h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {moduleLessons.map((lesson) => (
                        <div
                          key={lesson.id}
                          className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs text-slate-400 font-mono w-6 text-center">
                              {lesson.lesson_index}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">
                                {lesson.title}
                              </p>
                              <p className="text-xs text-slate-400">
                                /course/{lesson.slug} · {lesson.duration_minutes} min
                                {lesson.content ? "" : " · ⚠️ No content"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {lesson.is_free_preview && (
                              <span className="text-[0.55rem] px-2 py-0.5 bg-green-50 text-green-600 rounded-full font-medium">
                                FREE
                              </span>
                            )}
                            <button
                              onClick={() => setEditing(lesson)}
                              className="text-xs text-green-700 hover:text-green-800 font-medium"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </>
      )}

      {tab === "purchases" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {purchases.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No purchases yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th scope="col" className="text-left px-4 py-2 text-xs font-medium text-slate-500">User ID</th>
                    <th scope="col" className="text-left px-4 py-2 text-xs font-medium text-slate-500">Course</th>
                    <th scope="col" className="text-right px-4 py-2 text-xs font-medium text-slate-500">Amount</th>
                    <th scope="col" className="text-left px-4 py-2 text-xs font-medium text-slate-500">Stripe Payment</th>
                    <th scope="col" className="text-left px-4 py-2 text-xs font-medium text-slate-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchases.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-xs text-slate-600 font-mono truncate max-w-[150px]">
                        {p.user_id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-600">{p.course_slug}</td>
                      <td className="px-4 py-2 text-xs text-right font-medium text-green-700">
                        ${(p.amount_paid / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-400 font-mono truncate max-w-[150px]">
                        {p.stripe_payment_id || "—"}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-500">
                        {new Date(p.purchased_at).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}
