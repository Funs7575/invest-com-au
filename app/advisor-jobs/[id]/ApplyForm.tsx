"use client";

import { useState } from "react";

interface Props {
  jobId: string;
  jobTitle: string;
}

interface FormState {
  applicant_name: string;
  applicant_email: string;
  message: string;
}

export default function ApplyForm({ jobId, jobTitle }: Props) {
  const [form, setForm] = useState<FormState>({
    applicant_name: "",
    applicant_email: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/careers/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, job_id: jobId }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const msg =
          data !== null &&
          typeof data === "object" &&
          "error" in data &&
          typeof (data as Record<string, unknown>).error === "string"
            ? (data as { error: string }).error
            : "Failed to submit. Please try again.";
        setError(msg);
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-sm text-emerald-800"
      >
        <p className="font-bold mb-1">Application submitted!</p>
        <p>
          Thank you for applying for <strong>{jobTitle}</strong>. The hiring
          firm will review your application and be in touch directly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label
          htmlFor="applicant_name"
          className="block text-sm font-semibold text-slate-700 mb-1"
        >
          Full name <span aria-hidden="true">*</span>
        </label>
        <input
          id="applicant_name"
          name="applicant_name"
          type="text"
          autoComplete="name"
          required
          maxLength={120}
          value={form.applicant_name}
          onChange={handleChange}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Jane Smith"
        />
      </div>

      <div>
        <label
          htmlFor="applicant_email"
          className="block text-sm font-semibold text-slate-700 mb-1"
        >
          Email address <span aria-hidden="true">*</span>
        </label>
        <input
          id="applicant_email"
          name="applicant_email"
          type="email" autoCapitalize="off" autoCorrect="off" spellCheck={false}
          autoComplete="email"
          required
          value={form.applicant_email}
          onChange={handleChange}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="jane@example.com"
        />
      </div>

      <div>
        <label
          htmlFor="message"
          className="block text-sm font-semibold text-slate-700 mb-1"
        >
          Cover message <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          minLength={10}
          maxLength={3000}
          rows={6}
          value={form.message}
          onChange={handleChange}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-y"
          placeholder="Introduce yourself and explain why you're a great fit…"
        />
        <p className="text-xs text-slate-500 mt-1">
          {form.message.length}/3000 characters
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-blue-700 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? "Submitting…" : "Submit application"}
      </button>
    </form>
  );
}
