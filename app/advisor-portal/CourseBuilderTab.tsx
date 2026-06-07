"use client";

import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/Icon";
import type { Advisor } from "./types";

// ─── Types ────────────────────────────────────────────────────────────────────

type CourseStatus = "draft" | "submitted" | "published" | "rejected";

type Course = {
  id: number;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  status: CourseStatus;
  price: number; // cents
  level?: string | null;
  estimated_hours?: number | null;
  cover_image_url?: string | null;
  submitted_at?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at?: string | null;
};

type Lesson = {
  id: number;
  slug: string;
  title: string;
  module_title: string;
  module_index: number;
  lesson_index: number;
  content?: string | null;
  video_url?: string | null;
  duration_minutes?: number | null;
  is_free_preview?: boolean | null;
  created_at?: string;
  updated_at?: string | null;
};

type LessonFormState = {
  title: string;
  module_title: string;
  module_index: number;
  lesson_index: number;
  content: string;
  video_url: string;
  duration_minutes: string;
  is_free_preview: boolean;
};

type BuilderMode = "list" | "editor" | "submit-preview";

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<CourseStatus, { label: string; classes: string }> = {
  draft: { label: "Draft", classes: "bg-slate-100 text-slate-600" },
  submitted: { label: "Under Review", classes: "bg-blue-100 text-blue-700" },
  published: { label: "Published", classes: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", classes: "bg-red-100 text-red-700" },
};

function StatusBadge({ status }: { status: CourseStatus }) {
  const { label, classes } = STATUS_BADGE[status] ?? STATUS_BADGE.draft;
  return (
    <span className={`inline-flex items-center text-[0.6rem] font-bold px-2 py-0.5 rounded-full ${classes}`}>
      {label}
    </span>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div className="flex items-center gap-0 mb-6">
      {labels.map((label, i) => {
        const isActive = i + 1 === step;
        const isDone = i + 1 < step;
        return (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.6rem] font-bold shrink-0 ${
                  isDone
                    ? "bg-violet-600 text-white"
                    : isActive
                    ? "bg-slate-900 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {isDone ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-xs font-semibold whitespace-nowrap ${
                  isActive ? "text-slate-900" : isDone ? "text-violet-600" : "text-slate-400"
                }`}
              >
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div className={`w-8 h-0.5 mx-2 shrink-0 ${isDone ? "bg-violet-300" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  advisor: Advisor | null;
};

export default function CourseBuilderTab({ advisor }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<BuilderMode>("list");

  // The course being created / edited
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);

  // Builder step (1=details, 2=curriculum, 3=preview+submit)
  const [step, setStep] = useState(1);

  // Step 1 form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    level: "beginner" as "beginner" | "intermediate" | "advanced",
    price: "",
    estimated_hours: "",
    cover_image_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Step 2 — lesson editor
  const [addingLesson, setAddingLesson] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonForm, setLessonForm] = useState<LessonFormState>({
    title: "",
    module_title: "Module 1",
    module_index: 1,
    lesson_index: 1,
    content: "",
    video_url: "",
    duration_minutes: "",
    is_free_preview: false,
  });
  const [lessonSaving, setLessonSaving] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [deletingLessonId, setDeletingLessonId] = useState<number | null>(null);

  // Submitting for review
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const payoutsEnabled = Boolean(advisor?.stripe_connect_payouts_enabled);

  // ── fetch course list ──

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/advisor-auth/courses");
      if (res.ok) {
        const data = await res.json() as { courses: Course[] };
        setCourses(data.courses ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/advisor-auth/courses");
        if (res.ok && !cancelled) {
          const data = await res.json() as { courses: Course[] };
          setCourses(data.courses ?? []);
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // ── fetch lessons for the course being edited ──

  const fetchLessons = useCallback(async (courseId: number) => {
    setLessonsLoading(true);
    try {
      const res = await fetch(`/api/advisor-auth/courses/${courseId}/lessons`);
      if (res.ok) {
        const data = await res.json() as { lessons: Lesson[] };
        setLessons(data.lessons ?? []);
      }
    } catch { /* ignore */ }
    setLessonsLoading(false);
  }, []);

  // ── helpers ──

  const resetForm = () => {
    setForm({ title: "", description: "", level: "beginner", price: "", estimated_hours: "", cover_image_url: "" });
    setFormError(null);
    setStep(1);
    setLessons([]);
  };

  const startNewCourse = () => {
    setEditingCourse(null);
    resetForm();
    setMode("editor");
  };

  const startEditCourse = (course: Course) => {
    setEditingCourse(course);
    setForm({
      title: course.title,
      description: course.description ?? "",
      level: (course.level as "beginner" | "intermediate" | "advanced") ?? "beginner",
      price: course.price ? (course.price / 100).toFixed(2) : "",
      estimated_hours: course.estimated_hours != null ? String(course.estimated_hours) : "",
      cover_image_url: course.cover_image_url ?? "",
    });
    setFormError(null);
    setStep(1);
    fetchLessons(course.id);
    setMode("editor");
  };

  // ── Step 1: save course details ──

  const saveCourseDetails = async () => {
    if (!form.title.trim() || form.title.trim().length < 5) {
      setFormError("Title must be at least 5 characters.");
      return;
    }
    setSaving(true);
    setFormError(null);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      level: form.level,
      price: form.price ? parseFloat(form.price) : undefined,
      estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : undefined,
      cover_image_url: form.cover_image_url.trim() || undefined,
    };

    try {
      if (editingCourse) {
        const res = await fetch("/api/advisor-auth/courses", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId: editingCourse.id, ...payload }),
        });
        if (!res.ok) {
          const d = await res.json() as { error?: string };
          setFormError(d.error ?? "Failed to save course.");
          setSaving(false);
          return;
        }
        const data = await res.json() as { course: Course };
        setEditingCourse(data.course);
      } else {
        const res = await fetch("/api/advisor-auth/courses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json() as { error?: string };
          setFormError(d.error ?? "Failed to create course.");
          setSaving(false);
          return;
        }
        const data = await res.json() as { course: Course };
        setEditingCourse(data.course);
        await fetchLessons(data.course.id);
      }
      setStep(2);
    } catch {
      setFormError("Network error. Please try again.");
    }
    setSaving(false);
  };

  // ── Step 2: lesson form helpers ──

  const resetLessonForm = () => {
    // Default module_index/lesson_index to next available
    const maxLesson = lessons.reduce((m, l) => (l.lesson_index > m ? l.lesson_index : m), 0);
    setLessonForm({
      title: "",
      module_title: lessons[0]?.module_title ?? "Module 1",
      module_index: lessons[0]?.module_index ?? 1,
      lesson_index: maxLesson + 1,
      content: "",
      video_url: "",
      duration_minutes: "",
      is_free_preview: false,
    });
    setLessonError(null);
  };

  const saveLesson = async () => {
    if (!editingCourse) return;
    if (!lessonForm.title.trim() || lessonForm.title.trim().length < 2) {
      setLessonError("Lesson title must be at least 2 characters.");
      return;
    }
    setLessonSaving(true);
    setLessonError(null);

    const payload = {
      title: lessonForm.title.trim(),
      module_title: lessonForm.module_title.trim() || "Module 1",
      module_index: lessonForm.module_index,
      lesson_index: lessonForm.lesson_index,
      content: lessonForm.content.trim() || undefined,
      video_url: lessonForm.video_url.trim() || undefined,
      duration_minutes: lessonForm.duration_minutes ? parseInt(lessonForm.duration_minutes) : undefined,
      is_free_preview: lessonForm.is_free_preview,
    };

    try {
      if (editingLesson) {
        const res = await fetch(`/api/advisor-auth/courses/${editingCourse.id}/lessons`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId: editingLesson.id, ...payload }),
        });
        if (!res.ok) {
          const d = await res.json() as { error?: string };
          setLessonError(d.error ?? "Failed to update lesson.");
          setLessonSaving(false);
          return;
        }
      } else {
        const res = await fetch(`/api/advisor-auth/courses/${editingCourse.id}/lessons`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json() as { error?: string };
          setLessonError(d.error ?? "Failed to create lesson.");
          setLessonSaving(false);
          return;
        }
      }
      await fetchLessons(editingCourse.id);
      setAddingLesson(false);
      setEditingLesson(null);
      resetLessonForm();
    } catch {
      setLessonError("Network error. Please try again.");
    }
    setLessonSaving(false);
  };

  const deleteLesson = async (lessonId: number) => {
    if (!editingCourse) return;
    setDeletingLessonId(lessonId);
    try {
      await fetch(`/api/advisor-auth/courses/${editingCourse.id}/lessons`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      });
      await fetchLessons(editingCourse.id);
    } catch { /* ignore */ }
    setDeletingLessonId(null);
  };

  // ── Step 3: submit for review ──

  const submitForReview = async () => {
    if (!editingCourse) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/advisor-auth/courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: editingCourse.id, status: "submitted" }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        setSubmitError(d.error ?? "Failed to submit course.");
        setSubmitting(false);
        return;
      }
      // Refresh list and go back to list view
      await fetchCourses();
      setMode("list");
      resetForm();
    } catch {
      setSubmitError("Network error. Please try again.");
    }
    setSubmitting(false);
  };

  // ─── STRIPE CTA (no payouts enabled) ───────────────────────────────────────

  if (!payoutsEnabled) {
    return (
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-1">Courses</h2>
        <p className="text-sm text-slate-500 mb-5">Create and sell investment courses directly to your audience.</p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-4">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
            <Icon name="book-open" size={18} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-900 mb-1">Connect Stripe to Sell Courses</h3>
            <p className="text-xs text-amber-700 mb-3">
              To create and sell courses you need to connect a Stripe account so we can send you your revenue share. Navigate to the{" "}
              <strong>Billing</strong> tab and complete Stripe Connect setup to get started.
            </p>
            <p className="text-[0.62rem] text-amber-600">
              Advisors keep <strong>70% of course revenue</strong>. Invest.com.au retains 30% for platform access, marketing, and student support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── EDITOR VIEW ───────────────────────────────────────────────────────────

  if (mode === "editor" || mode === "submit-preview") {
    const canSubmit = editingCourse && lessons.length >= 1 && editingCourse.status === "draft";

    return (
      <div>
        {/* Back button */}
        <button
          onClick={() => {
            setMode("list");
            resetForm();
            fetchCourses();
          }}
          className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700 mb-4"
        >
          <Icon name="arrow-left" size={14} /> Back to courses
        </button>

        <h2 className="text-lg font-bold text-slate-900 mb-1">
          {editingCourse ? "Edit Course" : "New Course"}
        </h2>
        {editingCourse && (
          <div className="flex items-center gap-2 mb-4">
            <StatusBadge status={editingCourse.status as CourseStatus} />
            {editingCourse.status === "rejected" && editingCourse.rejection_reason && (
              <span className="text-xs text-red-600">{editingCourse.rejection_reason}</span>
            )}
          </div>
        )}

        <StepIndicator step={step} labels={["Course Details", "Curriculum", "Preview & Submit"]} />

        {/* ── STEP 1: Course Details ── */}
        {step === 1 && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <label htmlFor="course-title" className="block text-xs font-bold text-slate-700 mb-1">
                Course Title <span className="text-red-500">*</span>
              </label>
              <input
                id="course-title"
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Building Your First Investment Portfolio"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
              {form.title.length > 0 && form.title.length < 5 && (
                <p className="text-[0.6rem] text-amber-600 mt-0.5">Title must be at least 5 characters</p>
              )}
            </div>

            <div>
              <label htmlFor="course-description" className="block text-xs font-bold text-slate-700 mb-1">Description</label>
              <textarea
                id="course-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What will students learn? Who is this course for? What topics does it cover?"
                rows={4}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-vertical"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cb-level" className="block text-xs font-bold text-slate-700 mb-1">Level</label>
                <select
                  id="cb-level"
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value as "beginner" | "intermediate" | "advanced" })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label htmlFor="cb-price" className="block text-xs font-bold text-slate-700 mb-1">Price (AUD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                  <input
                    id="cb-price"
                    type="number" inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="297.00"
                    className="w-full pl-7 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="cb-hours" className="block text-xs font-bold text-slate-700 mb-1">Estimated Hours</label>
                <input
                  id="cb-hours"
                  type="number" inputMode="decimal"
                  step="0.5"
                  min="0"
                  value={form.estimated_hours}
                  onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })}
                  placeholder="e.g. 4.5"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>
              <div>
                <label htmlFor="cb-cover-url" className="block text-xs font-bold text-slate-700 mb-1">Cover Image URL</label>
                <input
                  id="cb-cover-url"
                  type="url"
                  value={form.cover_image_url}
                  onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>
            </div>

            {/* Revenue share callout */}
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
              <p className="text-xs font-bold text-violet-800 mb-0.5">Revenue Share</p>
              <p className="text-xs text-violet-600">
                You receive <strong>70%</strong> of each sale. Invest.com.au retains 30% for platform access, payment processing, and marketing.
                {form.price && parseFloat(form.price) > 0 && (
                  <> On a ${parseFloat(form.price).toFixed(2)} course, you earn <strong>${(parseFloat(form.price) * 0.7).toFixed(2)}</strong> per sale.</>
                )}
              </p>
            </div>

            {formError && (
              <div role="alert" className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">{formError}</div>
            )}

            <div className="flex justify-end">
              <button
                onClick={saveCourseDetails}
                disabled={saving || !form.title.trim() || form.title.trim().length < 5}
                className="px-5 py-2.5 bg-slate-900 text-white font-semibold text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving..." : "Save & Continue →"}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Curriculum ── */}
        {step === 2 && editingCourse && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-slate-900">{editingCourse.title}</p>
                <p className="text-xs text-slate-500">Build your curriculum — organise lessons into modules.</p>
              </div>
              <button
                onClick={() => {
                  resetLessonForm();
                  setEditingLesson(null);
                  setAddingLesson(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition-colors"
              >
                <Icon name="plus" size={14} /> Add Lesson
              </button>
            </div>

            {/* Lessons list grouped by module */}
            {lessonsLoading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            ) : lessons.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center mb-4">
                <Icon name="book-open" size={32} className="text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-900 mb-1">No lessons yet</h3>
                <p className="text-xs text-slate-500 mb-3">Add at least one lesson before submitting for review.</p>
                <button
                  onClick={() => { resetLessonForm(); setEditingLesson(null); setAddingLesson(true); }}
                  className="px-4 py-2 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700"
                >
                  Add First Lesson
                </button>
              </div>
            ) : (
              <LessonGroupList
                lessons={lessons}
                deletingLessonId={deletingLessonId}
                onEdit={(lesson) => {
                  setEditingLesson(lesson);
                  setLessonForm({
                    title: lesson.title,
                    module_title: lesson.module_title,
                    module_index: lesson.module_index,
                    lesson_index: lesson.lesson_index,
                    content: lesson.content ?? "",
                    video_url: lesson.video_url ?? "",
                    duration_minutes: lesson.duration_minutes != null ? String(lesson.duration_minutes) : "",
                    is_free_preview: lesson.is_free_preview ?? false,
                  });
                  setAddingLesson(true);
                  setLessonError(null);
                }}
                onDelete={deleteLesson}
              />
            )}

            {/* Inline lesson form */}
            {addingLesson && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4 space-y-3">
                <h4 className="text-sm font-bold text-slate-900">
                  {editingLesson ? "Edit Lesson" : "New Lesson"}
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="cb-module-name" className="block text-xs font-bold text-slate-600 mb-1">Module Name</label>
                    <input
                      id="cb-module-name"
                      type="text"
                      value={lessonForm.module_title}
                      onChange={(e) => setLessonForm({ ...lessonForm, module_title: e.target.value })}
                      placeholder="e.g. Module 1: Foundations"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="cb-module-index" className="block text-xs font-bold text-slate-600 mb-1">Module #</label>
                      <input
                        id="cb-module-index"
                        type="number" inputMode="decimal"
                        min="1"
                        value={lessonForm.module_index}
                        onChange={(e) => setLessonForm({ ...lessonForm, module_index: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                      />
                    </div>
                    <div>
                      <label htmlFor="cb-lesson-index" className="block text-xs font-bold text-slate-600 mb-1">Lesson #</label>
                      <input
                        id="cb-lesson-index"
                        type="number" inputMode="decimal"
                        min="1"
                        value={lessonForm.lesson_index}
                        onChange={(e) => setLessonForm({ ...lessonForm, lesson_index: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="lesson-title" className="block text-xs font-bold text-slate-600 mb-1">
                    Lesson Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="lesson-title"
                    type="text"
                    value={lessonForm.title}
                    onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                    placeholder="e.g. What Is a Share?"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="lesson-video-url" className="block text-xs font-bold text-slate-600 mb-1">
                      Video URL{" "}
                      <span className="text-slate-400 font-normal">(YouTube / Vimeo)</span>
                    </label>
                    <input
                      id="lesson-video-url"
                      type="url"
                      value={lessonForm.video_url}
                      onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                      placeholder="https://youtube.com/..."
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                    />
                  </div>
                  <div>
                    <label htmlFor="lesson-duration" className="block text-xs font-bold text-slate-600 mb-1">Duration (minutes)</label>
                    <input
                      id="lesson-duration"
                      type="number" inputMode="decimal"
                      min="0"
                      value={lessonForm.duration_minutes}
                      onChange={(e) => setLessonForm({ ...lessonForm, duration_minutes: e.target.value })}
                      placeholder="e.g. 12"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="lesson-content" className="block text-xs font-bold text-slate-600 mb-1">
                    Description / Notes
                  </label>
                  <textarea
                    id="lesson-content"
                    value={lessonForm.content}
                    onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                    placeholder="Brief notes or summary for this lesson..."
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/30 resize-vertical"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lessonForm.is_free_preview}
                    onChange={(e) => setLessonForm({ ...lessonForm, is_free_preview: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                  <span className="text-xs text-slate-700">Free preview — accessible without purchase</span>
                </label>

                {lessonError && (
                  <div role="alert" className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">{lessonError}</div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={saveLesson}
                    disabled={lessonSaving || !lessonForm.title.trim() || lessonForm.title.trim().length < 2}
                    className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {lessonSaving ? "Saving..." : editingLesson ? "Update Lesson" : "Add Lesson"}
                  </button>
                  <button
                    onClick={() => { setAddingLesson(false); setEditingLesson(null); setLessonError(null); }}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Nav buttons */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-semibold"
              >
                <Icon name="arrow-left" size={14} /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={lessons.length === 0}
                className="px-5 py-2.5 bg-slate-900 text-white font-semibold text-sm rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Continue to Preview →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Preview + Submit ── */}
        {step === 3 && editingCourse && (
          <div>
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-4">
              <h3 className="text-base font-bold text-slate-900 mb-3">Course Summary</h3>

              <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                <div>
                  <span className="text-slate-500">Title</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{editingCourse.title}</p>
                </div>
                <div>
                  <span className="text-slate-500">Level</span>
                  <p className="font-semibold text-slate-900 mt-0.5 capitalize">{editingCourse.level ?? "Beginner"}</p>
                </div>
                <div>
                  <span className="text-slate-500">Price</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {editingCourse.price ? `$${(editingCourse.price / 100).toFixed(2)} AUD` : "Free"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Your Earnings (70%)</span>
                  <p className="font-semibold text-emerald-700 mt-0.5">
                    {editingCourse.price
                      ? `$${(editingCourse.price / 100 * 0.7).toFixed(2)} per sale`
                      : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Estimated Hours</span>
                  <p className="font-semibold text-slate-900 mt-0.5">
                    {editingCourse.estimated_hours != null ? `${editingCourse.estimated_hours}h` : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Lessons</span>
                  <p className="font-semibold text-slate-900 mt-0.5">{lessons.length}</p>
                </div>
              </div>

              {editingCourse.description && (
                <div className="mb-4">
                  <p className="text-xs text-slate-500 mb-1">Description</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{editingCourse.description}</p>
                </div>
              )}

              {/* Lesson list preview */}
              <h4 className="text-xs font-bold text-slate-700 mb-2">Curriculum ({lessons.length} lessons)</h4>
              {Object.entries(
                lessons.reduce<Record<string, Lesson[]>>((acc, l) => {
                  const key = `${l.module_index}|${l.module_title}`;
                  if (!acc[key]) acc[key] = [];
                  acc[key]!.push(l);
                  return acc;
                }, {})
              )
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([key, moduleLessons]) => {
                  const [, moduleTitle] = key.split("|");
                  return (
                    <div key={key} className="mb-2">
                      <p className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-wide mb-1">{moduleTitle}</p>
                      {moduleLessons.sort((a, b) => a.lesson_index - b.lesson_index).map((l) => (
                        <div key={l.id} className="flex items-center gap-2 text-xs text-slate-600 py-1 border-b border-slate-100 last:border-0">
                          <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[0.55rem] font-bold text-slate-500 shrink-0">{l.lesson_index}</span>
                          <span className="flex-1">{l.title}</span>
                          {l.is_free_preview && <span className="text-[0.55rem] text-emerald-600 font-bold px-1.5 py-0.5 bg-emerald-50 rounded">Free</span>}
                          {l.duration_minutes != null && <span className="text-slate-400">{l.duration_minutes}m</span>}
                        </div>
                      ))}
                    </div>
                  );
                })}
            </div>

            {/* Submission requirements */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <h4 className="text-xs font-bold text-amber-800 mb-2">Before submitting for review</h4>
              <ul className="text-xs text-amber-700 space-y-1">
                <li className="flex items-center gap-1.5">
                  <span className={lessons.length >= 1 ? "text-emerald-500" : "text-amber-400"}>
                    {lessons.length >= 1 ? "✓" : "○"}
                  </span>
                  At least 1 lesson ({lessons.length} added)
                </li>
                <li className="flex items-center gap-1.5">
                  <span className={editingCourse.title.length >= 5 ? "text-emerald-500" : "text-amber-400"}>
                    {editingCourse.title.length >= 5 ? "✓" : "○"}
                  </span>
                  Title provided
                </li>
                <li className="flex items-center gap-1.5">
                  <span className={editingCourse.price != null ? "text-emerald-500" : "text-amber-400"}>
                    {editingCourse.price != null ? "✓" : "○"}
                  </span>
                  Price set
                </li>
              </ul>
              <p className="text-[0.62rem] text-amber-600 mt-2">
                Our team will review your course within 3-5 business days. You&apos;ll be notified by email when approved or if changes are needed.
              </p>
            </div>

            {submitError && (
              <div role="alert" className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700 mb-4">{submitError}</div>
            )}

            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-semibold"
              >
                <Icon name="arrow-left" size={14} /> Back
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => { setMode("list"); fetchCourses(); }}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Save as Draft
                </button>
                {canSubmit && (
                  <button
                    onClick={submitForReview}
                    disabled={submitting}
                    aria-busy={submitting}
                    className="px-5 py-2.5 bg-violet-600 text-white font-bold text-sm rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? "Submitting..." : "Submit for Review"}
                  </button>
                )}
                {editingCourse.status !== "draft" && (
                  <span className="self-center text-xs text-slate-500">
                    {editingCourse.status === "submitted" && "Course is under review"}
                    {editingCourse.status === "published" && "Course is published"}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── LIST VIEW ──────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Courses</h2>
          <p className="text-xs text-slate-500">Create and sell investment courses — you earn 70% of every sale.</p>
        </div>
        <button
          onClick={startNewCourse}
          className="flex items-center gap-1.5 px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Icon name="plus" size={16} /> New Course
        </button>
      </div>

      {/* Revenue share callout */}
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-4 mb-5 flex items-start gap-3">
        <div className="w-8 h-8 bg-violet-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
          <Icon name="book-open" size={16} className="text-violet-600" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-violet-800 mb-0.5">Advisor Course Creator</h3>
          <p className="text-xs text-violet-600">
            Publish educational courses on Invest.com.au and earn <strong>70% of each sale</strong>.
            Courses are reviewed by our team before going live to ensure quality for students.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <div key={i} className="h-20 bg-white border border-slate-200 rounded-xl animate-pulse" />)}
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <Icon name="book-open" size={36} className="text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 mb-1">No courses yet</h3>
          <p className="text-xs text-slate-500 mb-4">
            Create your first course to start earning from your expertise.
          </p>
          <button
            onClick={startNewCourse}
            className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700"
          >
            Create Your First Course →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <div key={course.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
              {course.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={course.cover_image_url}
                  alt={course.title}
                  className="w-14 h-14 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Icon name="book-open" size={24} className="text-slate-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{course.title}</h3>
                  <StatusBadge status={course.status as CourseStatus} />
                </div>
                <div className="flex items-center gap-3 text-[0.62rem] text-slate-400 flex-wrap">
                  <span className="capitalize">{course.level ?? "beginner"}</span>
                  {course.price > 0 && <span>${(course.price / 100).toFixed(0)} AUD</span>}
                  {course.estimated_hours != null && <span>{course.estimated_hours}h</span>}
                  <span>Created {new Date(course.created_at).toLocaleDateString("en-AU")}</span>
                </div>
                {course.status === "rejected" && course.rejection_reason && (
                  <div className="mt-1.5 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 text-xs text-red-700">
                    <strong>Rejection reason:</strong> {course.rejection_reason}
                  </div>
                )}
                {course.status === "submitted" && (
                  <p className="text-[0.62rem] text-blue-600 mt-1">Under review — we&apos;ll notify you within 3-5 business days.</p>
                )}
              </div>
              <div className="flex gap-1.5 shrink-0">
                {(course.status === "draft" || course.status === "rejected") && (
                  <button
                    onClick={() => startEditCourse(course)}
                    className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Edit
                  </button>
                )}
                {course.status === "published" && (
                  <a
                    href={`/courses/${course.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    View ↗
                  </a>
                )}
                {course.status === "submitted" && (
                  <button
                    onClick={() => startEditCourse(course)}
                    className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors"
                  >
                    View
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Lesson group list subcomponent ──────────────────────────────────────────

function LessonGroupList({
  lessons,
  deletingLessonId,
  onEdit,
  onDelete,
}: {
  lessons: Lesson[];
  deletingLessonId: number | null;
  onEdit: (l: Lesson) => void;
  onDelete: (id: number) => void;
}) {
  // Group by module
  const grouped = lessons.reduce<Record<string, Lesson[]>>((acc, l) => {
    const key = `${l.module_index}|${l.module_title}`;
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(l);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([key, moduleLessons]) => {
          const [moduleIndexStr, moduleTitle] = key.split("|");
          return (
            <div key={key} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                <p className="text-xs font-bold text-slate-700">
                  Module {moduleIndexStr}: {moduleTitle}
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {moduleLessons
                  .sort((a, b) => a.lesson_index - b.lesson_index)
                  .map((lesson) => (
                    <div key={lesson.id} className="px-4 py-3 flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-[0.6rem] font-bold text-violet-600 shrink-0">
                        {lesson.lesson_index}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{lesson.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {lesson.video_url && (
                            <span className="text-[0.55rem] text-slate-400 flex items-center gap-0.5">
                              <Icon name="play" size={10} className="text-slate-400" /> Video
                            </span>
                          )}
                          {lesson.duration_minutes != null && (
                            <span className="text-[0.55rem] text-slate-400">{lesson.duration_minutes}m</span>
                          )}
                          {lesson.is_free_preview && (
                            <span className="text-[0.55rem] text-emerald-600 font-bold px-1.5 py-0.5 bg-emerald-50 rounded-full">
                              Free Preview
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => onEdit(lesson)}
                          className="text-xs px-2 py-1 text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDelete(lesson.id)}
                          disabled={deletingLessonId === lesson.id}
                          className="text-xs px-2 py-1 text-red-500 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {deletingLessonId === lesson.id ? "..." : "Delete"}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
    </div>
  );
}
