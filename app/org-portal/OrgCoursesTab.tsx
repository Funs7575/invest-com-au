"use client";

import { useState, useEffect } from "react";
import Icon from "@/components/Icon";
import type { Organisation } from "./types";

interface Course {
  id: number;
  title: string;
  description: string;
  status: string;
  price_cents: number;
  level: string;
  estimated_hours: number;
  created_at: string;
}

type Props = {
  org: Organisation | null;
};

const STATUS_COLORS: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700",
  draft: "bg-slate-100 text-slate-600",
  archived: "bg-slate-100 text-slate-500",
  pending_review: "bg-amber-100 text-amber-700",
};

const LEVELS = ["beginner", "intermediate", "advanced"];

export default function OrgCoursesTab({ org }: Props) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceDollars, setPriceDollars] = useState("");
  const [level, setLevel] = useState("beginner");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/org-auth/courses");
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          setCourses(data.courses ?? []);
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/org-auth/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          price_cents: Math.round(parseFloat(priceDollars || "0") * 100),
          level,
          estimated_hours: parseFloat(estimatedHours || "0"),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCourses((prev) => [data.course, ...prev]);
        setShowCreate(false);
        setTitle("");
        setDescription("");
        setPriceDollars("");
        setLevel("beginner");
        setEstimatedHours("");
      } else {
        const d = await res.json();
        setCreateError(d.error ?? "Failed to create course.");
      }
    } catch {
      setCreateError("Network error. Please try again.");
    }
    setCreating(false);
  };

  const atFreeTierLimit = org?.tier === "free" && courses.length >= 1;

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-24 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Courses</h1>
          <p className="text-sm text-slate-500">{courses.length} course{courses.length !== 1 ? "s" : ""}</p>
        </div>

        {atFreeTierLimit ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-700 font-medium">
            Free tier: 1 course max.{" "}
            <a href="/for-providers#pricing" className="text-amber-800 underline hover:text-amber-900 font-bold">
              Upgrade to add more
            </a>
          </div>
        ) : (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Icon name="plus" size={16} />
            Create Course
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && !atFreeTierLimit && (
        <div className="bg-white border border-teal-200 rounded-xl p-5 mb-5">
          <h2 className="text-sm font-bold text-slate-900 mb-4">New Course</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Title *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Introduction to Self-Managed Super Funds"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Brief description of what this course covers..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Price (AUD)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceDollars}
                  onChange={(e) => setPriceDollars(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Level</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">CPD Hours</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  placeholder="1.0"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {createError && (
              <p className="text-xs text-red-600">{createError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCreate}
                disabled={creating || !title.trim()}
                className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? "Creating..." : "Create Course"}
              </button>
              <button
                onClick={() => { setShowCreate(false); setCreateError(""); }}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-medium rounded-lg text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course list */}
      {courses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <Icon name="book-open" size={32} className="text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 mb-1">No courses yet</h3>
          <p className="text-xs text-slate-500 mb-4">Create your first CPD course to start enrolling students.</p>
          {!atFreeTierLimit && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg hover:bg-teal-700"
            >
              Create Your First Course
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {courses.map((course) => (
            <div key={course.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{course.title}</h3>
                  <span className={`shrink-0 text-[0.56rem] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[course.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {course.status.replace("_", " ")}
                  </span>
                </div>
                {course.description && (
                  <p className="text-xs text-slate-500 truncate mb-1">{course.description}</p>
                )}
                <div className="flex items-center gap-3 text-[0.62rem] text-slate-400">
                  <span className="capitalize">{course.level}</span>
                  <span>{course.estimated_hours}h CPD</span>
                  <span>${(course.price_cents / 100).toFixed(0)} AUD</span>
                  <span>{new Date(course.created_at).toLocaleDateString("en-AU")}</span>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                  Edit
                </button>
                <button className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                  Preview
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
