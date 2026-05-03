"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Severity = "" | "P0" | "P1" | "P2" | "P3";

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; id: string }
  | { kind: "rate_limited" }
  | { kind: "error" };

interface BugReportPayload {
  page_url: string;
  route?: string;
  user_message: string;
  email?: string;
  user_agent?: string;
  viewport?: string;
  severity_guess?: "P0" | "P1" | "P2" | "P3";
}

const SUPPORT_EMAIL = "hello@invest.com.au";

export default function ReportProblemButton() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [severity, setSeverity] = useState<Severity>("");
  const [validation, setValidation] = useState<string | null>(null);
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const closeModal = useCallback(() => {
    setOpen(false);
    setValidation(null);
    setState({ kind: "idle" });
    setMessage("");
    setEmail("");
    setSeverity("");
  }, []);

  // ESC key + click-outside handlers + initial focus
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!first || !last) return;
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);

    // Initial focus on textarea (skip if showing success state)
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);

    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [open, closeModal]);

  // Auto-close after success
  useEffect(() => {
    if (state.kind !== "success") return;
    const t = setTimeout(() => {
      closeModal();
    }, 3000);
    return () => clearTimeout(t);
  }, [state, closeModal]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const trimmed = message.trim();
      if (trimmed.length === 0) {
        setValidation("Please describe the problem.");
        return;
      }
      if (trimmed.length > 4000) {
        setValidation("Please keep it under 4000 characters.");
        return;
      }
      setValidation(null);
      setState({ kind: "submitting" });

      const payload: BugReportPayload = {
        page_url: window.location.href,
        route: window.location.pathname,
        user_message: trimmed,
        user_agent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      };
      const trimmedEmail = email.trim();
      if (trimmedEmail.length > 0) {
        payload.email = trimmedEmail;
      }
      if (severity !== "") {
        payload.severity_guess = severity;
      }

      try {
        const res = await fetch("/api/bug-report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.status === 201) {
          let id = "";
          try {
            const data = (await res.json()) as { ok?: boolean; id?: string };
            id = typeof data.id === "string" ? data.id.slice(0, 8) : "";
          } catch {
            id = "";
          }
          setState({ kind: "success", id });
          return;
        }
        if (res.status === 429) {
          setState({ kind: "rate_limited" });
          return;
        }
        setState({ kind: "error" });
      } catch {
        setState({ kind: "error" });
      }
    },
    [message, email, severity]
  );

  return (
    <>
      <button
        type="button"
        aria-label="Report a problem"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900 text-white text-xs font-medium shadow-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-colors"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m8 2 1.88 1.88" />
          <path d="M14.12 3.88 16 2" />
          <path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" />
          <path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" />
          <path d="M12 20v-9" />
          <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
          <path d="M6 13H2" />
          <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
          <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
          <path d="M22 13h-4" />
          <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
        </svg>
        <span>Report a problem</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-slate-900/60"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-problem-title"
            className="w-full max-w-md bg-white rounded-2xl shadow-xl p-5 sm:p-6"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <h2
                id="report-problem-title"
                className="text-base font-semibold text-slate-900"
              >
                Report a problem
              </h2>
              <button
                ref={closeBtnRef}
                type="button"
                aria-label="Close"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-400 rounded p-1 -mr-1 -mt-1"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {state.kind === "success" ? (
              <div role="status" className="py-6 text-center">
                <p className="text-sm font-semibold text-slate-900">
                  Thanks — we&apos;ve got it.
                </p>
                {state.id && (
                  <p className="mt-1 text-xs text-slate-500">
                    Reference: {state.id}
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <p className="text-xs text-slate-500 mb-3">
                  Describe what you saw. We&apos;ll capture the page and
                  browser details automatically.
                </p>
                <label
                  htmlFor="report-problem-message"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  What happened?
                </label>
                <textarea
                  id="report-problem-message"
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={4000}
                  required
                  aria-required="true"
                  aria-invalid={validation !== null}
                  aria-describedby={
                    validation ? "report-problem-error" : undefined
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  placeholder="The save button on /best/share-trading didn't work…"
                />
                {validation && (
                  <p
                    id="report-problem-error"
                    role="alert"
                    className="mt-1 text-xs text-red-600"
                  >
                    {validation}
                  </p>
                )}

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="report-problem-email"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Email (optional)
                    </label>
                    <input
                      id="report-problem-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      maxLength={320}
                      autoComplete="email"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="report-problem-severity"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      Severity (optional)
                    </label>
                    <select
                      id="report-problem-severity"
                      value={severity}
                      onChange={(e) =>
                        setSeverity(e.target.value as Severity)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                    >
                      <option value="">Not sure</option>
                      <option value="P0">P0 — Site is down for me</option>
                      <option value="P1">P1 — Major feature broken</option>
                      <option value="P2">P2 — Annoying but workable</option>
                      <option value="P3">P3 — Nit / suggestion</option>
                    </select>
                  </div>
                </div>

                {state.kind === "rate_limited" && (
                  <p
                    role="alert"
                    className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
                  >
                    Too many submissions, give it a minute.
                  </p>
                )}
                {state.kind === "error" && (
                  <p
                    role="alert"
                    className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                  >
                    Something went wrong — please email{" "}
                    <a
                      href={`mailto:${SUPPORT_EMAIL}`}
                      className="underline font-medium"
                    >
                      {SUPPORT_EMAIL}
                    </a>
                    .
                  </p>
                )}

                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={state.kind === "submitting"}
                    className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {state.kind === "submitting" ? "Sending…" : "Send report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
