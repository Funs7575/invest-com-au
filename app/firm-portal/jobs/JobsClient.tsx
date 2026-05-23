"use client";

import { useState, useEffect, useCallback } from "react";

const JOB_TYPE_OPTIONS = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "casual", label: "Casual" },
] as const;

const JOB_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
] as const;

type JobType = (typeof JOB_TYPE_OPTIONS)[number]["value"];
type JobStatus = (typeof JOB_STATUS_OPTIONS)[number]["value"];

interface JobPost {
  id: string;
  title: string;
  location: string;
  type: JobType;
  description: string;
  status: JobStatus;
  created_at: string;
  updated_at: string;
}

type FormMode = "create" | "edit";

interface FormState {
  title: string;
  location: string;
  type: JobType;
  description: string;
  status: JobStatus;
}

const EMPTY_FORM: FormState = {
  title: "",
  location: "",
  type: "full_time",
  description: "",
  status: "draft",
};

const STATUS_BADGE: Record<JobStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  closed: "bg-amber-50 text-amber-700 border border-amber-200",
  archived: "bg-red-50 text-red-600 border border-red-100",
};

const JOB_TYPE_LABEL: Record<JobType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  casual: "Casual",
};

export default function JobsClient() {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Form state
  const [mode, setMode] = useState<FormMode | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);

  // Applications drawer
  const [applicationsJobId, setApplicationsJobId] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/firm-portal/jobs");
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        setErr(d.error ?? "Failed to load jobs.");
        return;
      }
      const d = (await res.json()) as { jobs: JobPost[] };
      setJobs(d.jobs ?? []);
    } catch {
      setErr("Network error loading jobs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  function openCreate() {
    setMode("create");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErr(null);
  }

  function openEdit(job: JobPost) {
    setMode("edit");
    setEditingId(job.id);
    setForm({
      title: job.title,
      location: job.location,
      type: job.type,
      description: job.description,
      status: job.status,
    });
    setFormErr(null);
  }

  function closeForm() {
    setMode(null);
    setEditingId(null);
    setFormErr(null);
  }

  function handleFormChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setFormErr(null);
    try {
      const url =
        mode === "edit" ? `/api/firm-portal/jobs/${editingId}` : "/api/firm-portal/jobs";
      const method = mode === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = (await res.json()) as { error?: string; job?: JobPost };
      if (!res.ok) {
        setFormErr(d.error ?? "Save failed.");
        return;
      }
      closeForm();
      await loadJobs();
    } catch {
      setFormErr("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(id: string, title: string) {
    if (!confirm(`Archive "${title}"? It will be removed from the public board.`)) return;
    try {
      const res = await fetch(`/api/firm-portal/jobs/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        alert(d.error ?? "Archive failed.");
        return;
      }
      await loadJobs();
    } catch {
      alert("Network error. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {loading
            ? "Loading…"
            : `${jobs.length} job post${jobs.length !== 1 ? "s" : ""}`}
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="text-sm font-semibold bg-blue-700 text-white rounded-xl px-4 py-2 hover:bg-blue-800 transition-colors"
        >
          + New job post
        </button>
      </div>

      {err && (
        <p role="alert" className="text-sm text-red-600">
          {err}
        </p>
      )}

      {/* Slide-in form panel */}
      {mode && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">
              {mode === "create" ? "Create job post" : "Edit job post"}
            </h2>
            <button
              type="button"
              onClick={closeForm}
              aria-label="Close form"
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSave} noValidate className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="job-title"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Job title *
                </label>
                <input
                  id="job-title"
                  name="title"
                  type="text"
                  required
                  maxLength={200}
                  value={form.title}
                  onChange={handleFormChange}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="e.g. Senior Financial Planner"
                />
              </div>
              <div>
                <label
                  htmlFor="job-location"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Location *
                </label>
                <input
                  id="job-location"
                  name="location"
                  type="text"
                  required
                  maxLength={100}
                  value={form.location}
                  onChange={handleFormChange}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="e.g. Sydney CBD or Remote"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="job-type"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Employment type *
                </label>
                <select
                  id="job-type"
                  name="type"
                  required
                  value={form.type}
                  onChange={handleFormChange}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                >
                  {JOB_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="job-status"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Status
                </label>
                <select
                  id="job-status"
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                >
                  {JOB_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="job-description"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Description *
              </label>
              <textarea
                id="job-description"
                name="description"
                required
                minLength={10}
                maxLength={8000}
                rows={8}
                value={form.description}
                onChange={handleFormChange}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
                placeholder="Role overview, responsibilities, required qualifications…"
              />
              <p className="text-xs text-slate-400 mt-1">
                {form.description.length}/8000 characters
              </p>
            </div>

            {formErr && (
              <p role="alert" className="text-sm text-red-600">
                {formErr}
              </p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={closeForm}
                className="text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="text-sm font-semibold bg-blue-700 text-white rounded-xl px-5 py-2 hover:bg-blue-800 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : mode === "create" ? "Create" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Job post list */}
      {!loading && jobs.length === 0 && !mode && (
        <div className="text-center py-16 text-slate-500 text-sm border border-dashed border-slate-200 rounded-2xl">
          No job posts yet.{" "}
          <button
            type="button"
            onClick={openCreate}
            className="text-blue-700 hover:underline font-medium"
          >
            Create your first post
          </button>{" "}
          to attract advisors.
        </div>
      )}

      {jobs.length > 0 && (
        <ul className="space-y-3" aria-label="Your job posts">
          {jobs.map((job) => (
            <li
              key={job.id}
              className="bg-white border border-slate-200 rounded-2xl p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {job.title}
                    </h3>
                    <span
                      className={`text-[0.65rem] font-semibold rounded-full px-2 py-0.5 ${STATUS_BADGE[job.status]}`}
                    >
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </span>
                    <span className="text-[0.65rem] font-semibold bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
                      {JOB_TYPE_LABEL[job.type]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {job.location} &middot; posted{" "}
                    {new Date(job.created_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">
                    {job.description}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setApplicationsJobId(applicationsJobId === job.id ? null : job.id)}
                    className="text-xs font-medium text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
                  >
                    Applications
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(job)}
                    className="text-xs font-medium text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors"
                  >
                    Edit
                  </button>
                  {job.status !== "archived" && (
                    <button
                      type="button"
                      onClick={() => handleArchive(job.id, job.title)}
                      className="text-xs font-medium text-red-600 border border-red-100 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </div>

              {/* Inline applications panel */}
              {applicationsJobId === job.id && (
                <ApplicationsPanel jobId={job.id} jobTitle={job.title} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Inline panel that fetches + displays applications for a job post. */
function ApplicationsPanel({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  interface Application {
    id: string;
    applicant_name: string;
    applicant_email: string;
    message: string;
    created_at: string;
  }

  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<Application[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/firm-portal/jobs/${jobId}/applications`);
        if (!res.ok) {
          const d = (await res.json()) as { error?: string };
          if (!cancelled) setErr(d.error ?? "Failed to load applications.");
          return;
        }
        const d = (await res.json()) as { applications: Application[] };
        if (!cancelled) setApps(d.applications ?? []);
      } catch {
        if (!cancelled) setErr("Network error.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  return (
    <div className="mt-4 pt-4 border-t border-slate-100" aria-label={`Applications for ${jobTitle}`}>
      <h4 className="text-xs font-bold text-slate-700 mb-3">
        Applications for &ldquo;{jobTitle}&rdquo;
      </h4>

      {loading && <p className="text-xs text-slate-400">Loading…</p>}
      {err && <p className="text-xs text-red-600">{err}</p>}

      {!loading && !err && apps.length === 0 && (
        <p className="text-xs text-slate-500 italic">No applications yet.</p>
      )}

      {apps.length > 0 && (
        <ul className="space-y-3">
          {apps.map((app) => (
            <li
              key={app.id}
              className="bg-slate-50 border border-slate-100 rounded-xl p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                <p className="text-xs font-semibold text-slate-800">
                  {app.applicant_name}
                </p>
                <a
                  href={`mailto:${app.applicant_email}`}
                  className="text-xs text-blue-700 hover:underline"
                >
                  {app.applicant_email}
                </a>
                <p className="text-[0.65rem] text-slate-400 ml-auto">
                  {new Date(app.created_at).toLocaleDateString("en-AU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <p className="text-xs text-slate-600 whitespace-pre-line">
                {app.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
