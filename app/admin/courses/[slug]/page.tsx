"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import AdminShell from "@/components/AdminShell";

interface CourseData {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  price: number;
  pro_price: number | null;
  status: string;
  level: string;
  revenue_share_percent: number;
  estimated_hours: number | null;
  guarantee: string | null;
  cover_image_url: string | null;
  stripe_price_id: string | null;
  stripe_pro_price_id: string | null;
  featured: boolean;
  sort_order: number;
  creator_id: number | null;
}

interface LessonRow {
  id: number;
  course_slug: string;
  module_index: number;
  module_title: string;
  lesson_index: number;
  title: string;
  slug: string;
  video_url: string | null;
  video_duration_seconds: number | null;
  duration_minutes: number;
  is_free_preview: boolean;
  content: string | null;
}

export default function AdminCourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [course, setCourse] = useState<CourseData | null>(null);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<number | null>(null);
  const { toast: showToast } = useToast();

  // Course edit form
  const [courseForm, setCourseForm] = useState<Partial<CourseData>>({});

  // Lesson form
  const [lessonForm, setLessonForm] = useState({
    title: "",
    slug: "",
    module_index: "1",
    module_title: "",
    lesson_index: "1",
    video_url: "",
    duration_minutes: "10",
    is_free_preview: false,
    content: "",
  });

  useEffect(() => {
    fetchData();
  }, [slug]);

  const fetchData = async () => {
    const supabase = createClient();

    const { data: courseData } = await supabase
      .from("courses")
      .select("*")
      .eq("slug", slug)
      .single();

    if (courseData) {
      setCourse(courseData as CourseData);
      setCourseForm(courseData as CourseData);
    }

    const { data: lessonData } = await supabase
      .from("course_lessons")
      .select("*")
      .eq("course_slug", slug)
      .order("module_index")
      .order("lesson_index");

    setLessons((lessonData as LessonRow[]) || []);
    setLoading(false);
  };

  const autoSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleSaveCourse = async () => {
    if (!course) return;
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("courses")
      .update({
        title: courseForm.title,
        subtitle: courseForm.subtitle || null,
        description: courseForm.description || null,
        price: courseForm.price,
        pro_price: courseForm.pro_price || null,
        status: courseForm.status,
        level: courseForm.level,
        revenue_share_percent: courseForm.revenue_share_percent,
        estimated_hours: courseForm.estimated_hours,
        guarantee: courseForm.guarantee || null,
        cover_image_url: courseForm.cover_image_url || null,
        stripe_price_id: courseForm.stripe_price_id || null,
        stripe_pro_price_id: courseForm.stripe_pro_price_id || null,
        featured: courseForm.featured,
        sort_order: courseForm.sort_order,
        updated_at: new Date().toISOString(),
        ...(courseForm.status === "published" && course.status !== "published"
          ? { published_at: new Date().toISOString() }
          : {}),
      })
      .eq("id", course.id);

    if (error) {
      showToast(`Error: ${error.message}`, "error");
    } else {
      showToast("Course updated!", "success");
      setEditing(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase.from("course_lessons").insert({
      course_slug: slug,
      title: lessonForm.title,
      slug: lessonForm.slug || autoSlug(lessonForm.title),
      module_index: parseInt(lessonForm.module_index),
      module_title: lessonForm.module_title,
      lesson_index: parseInt(lessonForm.lesson_index),
      video_url: lessonForm.video_url || null,
      duration_minutes: parseInt(lessonForm.duration_minutes) || 10,
      is_free_preview: lessonForm.is_free_preview,
      content: lessonForm.content || null,
    });

    if (error) {
      showToast(`Error: ${error.message}`, "error");
    } else {
      showToast("Lesson added!", "success");
      setShowAddLesson(false);
      setLessonForm({
        title: "", slug: "", module_index: "1", module_title: "",
        lesson_index: "1", video_url: "", duration_minutes: "10",
        is_free_preview: false, content: "",
      });
      fetchData();
    }
    setSaving(false);
  };

  const handleUpdateLesson = async (lessonId: number, updates: Partial<LessonRow>) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("course_lessons")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", lessonId);

    if (error) {
      showToast(`Error: ${error.message}`, "error");
    } else {
      showToast("Lesson updated!", "success");
      setEditingLessonId(null);
      fetchData();
    }
  };

  const handleDeleteLesson = async (lessonId: number) => {
    if (!confirm("Delete this lesson? This cannot be undone.")) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("course_lessons")
      .delete()
      .eq("id", lessonId);

    if (error) {
      showToast(`Error: ${error.message}`, "error");
    } else {
      showToast("Lesson deleted", "success");
      fetchData();
    }
  };

  if (loading) {
    return (
      <AdminShell>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-48" />
          <div className="h-40 bg-slate-200 rounded" />
        </div>
      </AdminShell>
    );
  }

  if (!course) {
    return (
      <AdminShell>
        <div className="text-center py-16">
          <p className="text-slate-500">Course not found.</p>
          <Link href="/admin/courses" className="text-emerald-700 hover:underline text-sm mt-2 inline-block">
            ← Back to Courses
          </Link>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/courses" className="text-xs text-slate-500 hover:text-emerald-700 mb-1 inline-block">
            ← Back to Courses
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{course.title}</h1>
          <p className="text-sm text-slate-500">/{course.slug}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/courses/${course.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            View →
          </Link>
          <button
            onClick={() => setEditing(!editing)}
            className="px-3 py-2 text-xs font-medium text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50"
          >
            {editing ? "Cancel" : "Edit Course"}
          </button>
        </div>
      </div>

      {/* Course edit form */}
      {editing && (
        <div className="mb-8 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h2 className="font-bold text-slate-900">Edit Course Details</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
              <input
                type="text"
                value={courseForm.title || ""}
                onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={courseForm.status || "draft"}
                onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subtitle</label>
            <input
              type="text"
              value={courseForm.subtitle || ""}
              onChange={(e) => setCourseForm({ ...courseForm, subtitle: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              value={courseForm.description || ""}
              onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
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
                value={courseForm.price ? (courseForm.price / 100).toFixed(2) : "0"}
                onChange={(e) => setCourseForm({ ...courseForm, price: Math.round(parseFloat(e.target.value || "0") * 100) })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="297.00"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pro Price (AUD)</label>
              <input
                type="number"
                step="0.01"
                value={courseForm.pro_price ? (courseForm.pro_price / 100).toFixed(2) : ""}
                onChange={(e) => setCourseForm({ ...courseForm, pro_price: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : null })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="197.00"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Level</label>
              <select
                value={courseForm.level || "beginner"}
                onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Stripe Price ID</label>
              <input
                type="text"
                value={courseForm.stripe_price_id || ""}
                onChange={(e) => setCourseForm({ ...courseForm, stripe_price_id: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Stripe Pro Price ID</label>
              <input
                type="text"
                value={courseForm.stripe_pro_price_id || ""}
                onChange={(e) => setCourseForm({ ...courseForm, stripe_pro_price_id: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Hours</label>
              <input
                type="number"
                step="0.5"
                value={courseForm.estimated_hours || ""}
                onChange={(e) => setCourseForm({ ...courseForm, estimated_hours: e.target.value ? parseFloat(e.target.value) : null })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="3.0"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Revenue Share %</label>
              <input
                type="number"
                min="0"
                max="100"
                value={courseForm.revenue_share_percent || 0}
                onChange={(e) => setCourseForm({ ...courseForm, revenue_share_percent: parseInt(e.target.value) || 0 })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Guarantee</label>
              <input
                type="text"
                value={courseForm.guarantee || ""}
                onChange={(e) => setCourseForm({ ...courseForm, guarantee: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={courseForm.featured || false}
                onChange={(e) => setCourseForm({ ...courseForm, featured: e.target.checked })}
              />
              Featured
            </label>
            <div>
              <label className="text-xs font-semibold text-slate-700 mr-2">Sort Order</label>
              <input
                type="number"
                value={courseForm.sort_order || 0}
                onChange={(e) => setCourseForm({ ...courseForm, sort_order: parseInt(e.target.value) || 0 })}
                className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleSaveCourse}
            disabled={saving}
            className="px-5 py-2.5 bg-emerald-700 text-white text-sm font-bold rounded-lg hover:bg-emerald-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}

      {/* Lessons section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">
          Lessons ({lessons.length})
        </h2>
        <button
          onClick={() => setShowAddLesson(!showAddLesson)}
          className="px-3 py-1.5 bg-emerald-700 text-white text-xs font-semibold rounded-lg hover:bg-emerald-800 transition-colors"
        >
          {showAddLesson ? "Cancel" : "+ Add Lesson"}
        </button>
      </div>

      {/* Add lesson form */}
      {showAddLesson && (
        <form onSubmit={handleAddLesson} className="mb-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-900">New Lesson</h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Title *</label>
              <input
                type="text"
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value, slug: autoSlug(e.target.value) })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Slug</label>
              <input
                type="text"
                value={lessonForm.slug}
                onChange={(e) => setLessonForm({ ...lessonForm, slug: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Module #</label>
              <input
                type="number"
                min="1"
                value={lessonForm.module_index}
                onChange={(e) => setLessonForm({ ...lessonForm, module_index: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Module Title</label>
              <input
                type="text"
                value={lessonForm.module_title}
                onChange={(e) => setLessonForm({ ...lessonForm, module_title: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lesson #</label>
              <input
                type="number"
                min="1"
                value={lessonForm.lesson_index}
                onChange={(e) => setLessonForm({ ...lessonForm, lesson_index: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Duration (min)</label>
              <input
                type="number"
                value={lessonForm.duration_minutes}
                onChange={(e) => setLessonForm({ ...lessonForm, duration_minutes: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Video URL (YouTube / Vimeo)</label>
            <input
              type="url"
              value={lessonForm.video_url}
              onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Content (HTML)</label>
            <textarea
              value={lessonForm.content}
              onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
              rows={6}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={lessonForm.is_free_preview}
              onChange={(e) => setLessonForm({ ...lessonForm, is_free_preview: e.target.checked })}
            />
            Free Preview
          </label>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-emerald-700 text-white text-sm font-bold rounded-lg hover:bg-emerald-800 disabled:opacity-50 transition-colors"
          >
            {saving ? "Adding..." : "Add Lesson"}
          </button>
        </form>
      )}

      {/* Lessons list */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Module</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">#</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Title</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-700">Video</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-700">Free</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lessons.map((l) => (
              <React.Fragment key={l.id}>
              <tr className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {l.module_index}. {l.module_title}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{l.lesson_index}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{l.title}</div>
                  <div className="text-xs text-slate-400">{l.slug}</div>
                </td>
                <td className="px-4 py-3 text-center">
                  {l.video_url ? (
                    <span className="text-emerald-600 text-xs">✓</span>
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {l.is_free_preview ? (
                    <span className="text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">FREE</span>
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => {
                      setEditingLessonId(editingLessonId === l.id ? null : l.id);
                      setLessonForm({
                        title: l.title,
                        slug: l.slug,
                        module_index: String(l.module_index),
                        module_title: l.module_title,
                        lesson_index: String(l.lesson_index),
                        video_url: l.video_url || "",
                        duration_minutes: String(l.duration_minutes),
                        is_free_preview: l.is_free_preview,
                        content: l.content || "",
                      });
                    }}
                    className="text-emerald-600 hover:text-emerald-800 text-xs font-medium"
                  >
                    {editingLessonId === l.id ? "Cancel" : "Edit"}
                  </button>
                  <Link
                    href={`/courses/${slug}/${l.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-500 hover:text-emerald-700 text-xs"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleDeleteLesson(l.id)}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
              {editingLessonId === l.id && (
                <tr>
                  <td colSpan={6} className="px-4 py-4 bg-slate-50">
                    <div className="space-y-3">
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                          <input
                            type="text"
                            value={lessonForm.title}
                            onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Video URL</label>
                          <input
                            type="url"
                            value={lessonForm.video_url}
                            onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                            placeholder="https://youtube.com/watch?v=..."
                          />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Module #</label>
                          <input
                            type="number"
                            min="1"
                            value={lessonForm.module_index}
                            onChange={(e) => setLessonForm({ ...lessonForm, module_index: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Module Title</label>
                          <input
                            type="text"
                            value={lessonForm.module_title}
                            onChange={(e) => setLessonForm({ ...lessonForm, module_title: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Lesson #</label>
                          <input
                            type="number"
                            min="1"
                            value={lessonForm.lesson_index}
                            onChange={(e) => setLessonForm({ ...lessonForm, lesson_index: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
                          />
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-2 text-sm pb-1.5">
                            <input
                              type="checkbox"
                              checked={lessonForm.is_free_preview}
                              onChange={(e) => setLessonForm({ ...lessonForm, is_free_preview: e.target.checked })}
                            />
                            Free Preview
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Content (HTML)</label>
                        <textarea
                          value={lessonForm.content}
                          onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                          rows={4}
                          className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-mono"
                        />
                      </div>
                      <button
                        onClick={() => handleUpdateLesson(l.id, {
                          title: lessonForm.title,
                          slug: lessonForm.slug,
                          module_index: parseInt(lessonForm.module_index),
                          module_title: lessonForm.module_title,
                          lesson_index: parseInt(lessonForm.lesson_index),
                          video_url: lessonForm.video_url || null,
                          duration_minutes: parseInt(lessonForm.duration_minutes) || 10,
                          is_free_preview: lessonForm.is_free_preview,
                          content: lessonForm.content || null,
                        })}
                        className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold rounded-lg hover:bg-emerald-800 transition-colors"
                      >
                        Save Changes
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
            ))}
            {lessons.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No lessons yet. Add your first lesson above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
