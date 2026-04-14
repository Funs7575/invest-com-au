"use client";

import { useState } from "react";
import {
  validateEmail,
  validateRequired,
  validateLength,
  compose,
} from "@/lib/field-validation";

/**
 * Complaints intake form — posts to /api/complaints/intake.
 *
 * Real-time validation via the Wave 6 field validators. The server
 * mirrors the same constraints so a tampered client can't bypass.
 */

const CATEGORIES = [
  { value: "lead_billing", label: "Lead billing or advisor credit" },
  { value: "advisor_conduct", label: "Advisor or broker conduct" },
  { value: "data_privacy", label: "Privacy / data handling" },
  { value: "platform", label: "Platform / site issue" },
  { value: "other", label: "Other" },
];

const emailValidator = compose(validateRequired, validateEmail);
const subjectValidator = validateLength({ min: 5, max: 200, label: "Subject" });
const bodyValidator = validateLength({ min: 20, max: 10_000, label: "Description" });

export default function ComplaintsIntakeForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation
    const emailErr = emailValidator(email);
    const subjErr = subjectValidator(subject);
    const bodyErr = bodyValidator(body);
    if (emailErr) return setError(emailErr);
    if (subjErr) return setError(subjErr);
    if (bodyErr) return setError(bodyErr);
    if (!category) return setError("Please pick a category");

    setStatus("sending");
    try {
      const res = await fetch("/api/complaints/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complainant_email: email,
          complainant_name: name || null,
          complainant_phone: phone || null,
          subject,
          body,
          category,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setReferenceId(data.reference_id);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to submit");
    }
  }

  if (status === "done") {
    return (
      <div
        role="status"
        className="bg-emerald-50 border border-emerald-200 rounded-xl p-6"
      >
        <h2 className="text-lg font-bold text-emerald-900 mb-2">
          Complaint received
        </h2>
        <p className="text-sm text-emerald-800 leading-relaxed mb-3">
          Your reference is:
        </p>
        <div className="bg-white border border-emerald-200 rounded px-4 py-3 font-mono text-sm text-slate-800 text-center mb-3">
          {referenceId}
        </div>
        <p className="text-xs text-emerald-800 leading-relaxed">
          We&apos;ve emailed confirmation to <code>{email}</code>. We
          will investigate and respond within 30 calendar days. If
          you don&apos;t hear from us, or aren&apos;t satisfied,
          you can escalate to AFCA at{" "}
          <a
            href="https://www.afca.org.au/make-a-complaint"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            afca.org.au
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white border border-slate-200 rounded-xl p-5 space-y-4"
      aria-label="Complaints intake form"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label htmlFor="c-name" className="block text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Your name <span className="text-slate-400">(optional)</span>
          </label>
          <input
            id="c-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none text-sm"
          />
        </div>
        <div>
          <label htmlFor="c-email" className="block text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Email *
          </label>
          <input
            id="c-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none text-sm"
          />
        </div>
      </div>

      <div>
        <label htmlFor="c-phone" className="block text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 mb-1">
          Phone <span className="text-slate-400">(optional)</span>
        </label>
        <input
          id="c-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none text-sm"
        />
      </div>

      <div>
        <label htmlFor="c-category" className="block text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 mb-1">
          Category *
        </label>
        <select
          id="c-category"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded bg-white focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none text-sm"
        >
          <option value="">Select one</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="c-subject" className="block text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 mb-1">
          Subject *
        </label>
        <input
          id="c-subject"
          type="text"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
          className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none text-sm"
        />
      </div>

      <div>
        <label htmlFor="c-body" className="block text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500 mb-1">
          What happened? *
        </label>
        <textarea
          id="c-body"
          required
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={10_000}
          placeholder="Describe the issue in as much detail as you can. Include dates, reference numbers, and any relevant context."
          className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none text-sm"
        />
        <p className="text-[0.6rem] text-slate-400 mt-1">
          {body.length} / 10,000 characters
        </p>
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full py-3 rounded bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 disabled:opacity-50"
      >
        {status === "sending" ? "Submitting…" : "Submit complaint"}
      </button>

      <p className="text-[0.65rem] text-slate-500 leading-relaxed">
        We will respond within 30 calendar days. If we don&apos;t,
        or you aren&apos;t satisfied with our response, you have
        the right to escalate to{" "}
        <a
          href="https://www.afca.org.au"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          AFCA
        </a>
        .
      </p>
    </form>
  );
}
