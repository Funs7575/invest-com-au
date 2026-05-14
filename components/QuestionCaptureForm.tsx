"use client";

import { useState } from "react";

const CATEGORY_OPTIONS = [
  { value: "share_broker", label: "Share brokers & trading" },
  { value: "super_fund", label: "Super & retirement" },
  { value: "crypto_exchange", label: "Crypto exchanges" },
  { value: "managed_funds", label: "Managed funds & ETFs" },
  { value: "property", label: "Property investing" },
  { value: "cross_border:uk", label: "UK pension transfer" },
  { value: "cross_border:us", label: "US expat planning (FATCA)" },
  { value: "cross_border:firb", label: "FIRB / foreign property" },
  { value: "advisor", label: "Finding a financial advisor" },
  { value: "general", label: "General investing question" },
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const Q_MIN = 10;
const Q_MAX = 500;

interface Props {
  category?: string;
}

interface PendingState {
  slug: string;
  message: string;
}

export default function QuestionCaptureForm({ category: initialCategory = "general" }: Props) {
  const [question, setQuestion] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [errors, setErrors] = useState<{ question?: string; email?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [pending, setPending] = useState<PendingState | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  function validate(): boolean {
    const next: typeof errors = {};
    if (question.trim().length < Q_MIN) {
      next.question = `Question must be at least ${Q_MIN} characters.`;
    } else if (question.trim().length > Q_MAX) {
      next.question = `Question must be ${Q_MAX} characters or fewer.`;
    }
    if (email && !EMAIL_RE.test(email)) {
      next.email = "Enter a valid email address, or leave it blank.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/answers/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          email: email.trim() || undefined,
          category,
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          setServerError("Too many questions submitted. Please try again in an hour.");
        } else {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setServerError(body.error ?? "Something went wrong. Please try again.");
        }
        return;
      }

      const data = (await res.json()) as { slug: string; status: string };
      setPending({
        slug: data.slug,
        message:
          "Your question has been submitted. Once our editorial team reviews it, we'll publish the answer — usually within 24 hours.",
      });
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (pending) {
    return (
      <div
        className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"
        data-testid="qq-pending-state"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-semibold text-emerald-800 mb-1">Question submitted</p>
        <p className="text-sm text-emerald-700">{pending.message}</p>
        <p className="text-xs text-emerald-600 mt-2">
          Reference:{" "}
          <code className="font-mono bg-emerald-100 px-1 rounded">{pending.slug}</code>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-5 space-y-4"
      data-testid="qq-capture-form"
      noValidate
    >
      <div>
        <label
          htmlFor="qq-question"
          className="block text-sm font-semibold text-slate-800 mb-1"
        >
          Your question
        </label>
        <textarea
          id="qq-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What's the cheapest broker for buying US shares in an SMSF?"
          rows={3}
          disabled={submitting}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60 resize-none"
          aria-describedby={errors.question ? "qq-question-error" : undefined}
          data-testid="qq-question-input"
        />
        <div className="flex justify-between items-start mt-1">
          {errors.question ? (
            <p
              id="qq-question-error"
              className="text-xs text-red-600"
              role="alert"
              data-testid="qq-question-error"
            >
              {errors.question}
            </p>
          ) : (
            <span />
          )}
          <span className="text-xs text-slate-400 tabular-nums">
            {question.length}/{Q_MAX}
          </span>
        </div>
      </div>

      <div>
        <label
          htmlFor="qq-category"
          className="block text-sm font-semibold text-slate-800 mb-1"
        >
          Topic
        </label>
        <select
          id="qq-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={submitting}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60"
          data-testid="qq-category-select"
        >
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="qq-email"
          className="block text-sm font-semibold text-slate-800 mb-1"
        >
          Email{" "}
          <span className="font-normal text-slate-500">(optional — get notified when published)</span>
        </label>
        <input
          id="qq-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={submitting}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60"
          aria-describedby={errors.email ? "qq-email-error" : undefined}
          data-testid="qq-email-input"
        />
        {errors.email && (
          <p
            id="qq-email-error"
            className="text-xs text-red-600 mt-1"
            role="alert"
            data-testid="qq-email-error"
          >
            {errors.email}
          </p>
        )}
      </div>

      {serverError && (
        <p
          className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
          role="alert"
          data-testid="qq-server-error"
        >
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60 transition-colors"
        data-testid="qq-submit-btn"
      >
        {submitting ? "Submitting…" : "Ask the research desk →"}
      </button>

      <p className="text-xs text-slate-400 text-center leading-relaxed">
        General information only. Not personal financial advice.{" "}
        <span className="text-slate-500">Questions are reviewed before publishing.</span>
      </p>
    </form>
  );
}
