"use client";

import { useState } from "react";
import Link from "next/link";

import type { IntakeQuestion } from "@/lib/pro-intake";

interface FormProps {
  slug: string;
  questions: IntakeQuestion[];
}

export default function IntakeAnswerForm({ slug, questions }: FormProps) {
  const [email, setEmail] = useState("");
  const [values, setValues] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function setAnswer(qid: number, value: string) {
    setValues((prev) => ({ ...prev, [qid]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const answers = questions.map((q) => ({
        question_id: q.id,
        answer: values[q.id] ?? "",
      }));
      const res = await fetch(`/api/briefs/${slug}/intake-answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), answers }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Could not save your answers.");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your answers.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-800">
        <p className="font-semibold">Thanks — your provider has the context they need.</p>
        <p className="mt-2">
          They&apos;ll be in touch with next steps shortly. You can{" "}
          <Link
            href={`/briefs/${slug}?email=${encodeURIComponent(email)}`}
            className="underline"
          >
            return to your brief status
          </Link>{" "}
          any time.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <label className="block text-sm">
        <span className="font-semibold text-slate-700">
          Confirm the email you used on the brief
        </span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={200}
          autoComplete="email"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <ul className="space-y-4">
        {questions.map((q) => (
          <li key={q.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <label className="block text-sm">
              <span className="font-semibold text-slate-800">
                {q.prompt}
                {q.required && <span className="ml-1 text-rose-600">*</span>}
              </span>
              {q.kind === "select" && q.options.length > 0 ? (
                <select
                  required={q.required}
                  value={values[q.id] ?? ""}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">Select…</option>
                  {q.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={
                    q.kind === "number"
                      ? "number"
                      : q.kind === "email"
                        ? "email"
                        : q.kind === "phone"
                          ? "tel"
                          : "text"
                  }
                  required={q.required}
                  value={values[q.id] ?? ""}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  maxLength={1000}
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              )}
            </label>
          </li>
        ))}
      </ul>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-900 disabled:opacity-60"
      >
        {submitting ? "Sending…" : "Submit answers"}
      </button>
    </form>
  );
}
