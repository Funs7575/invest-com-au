"use client";

import { useState, useCallback } from "react";

interface AskQuestionFormProps {
  brokerSlug: string;
  brokerName: string;
  pageType?: string;
  pageSlug?: string;
}

export default function AskQuestionForm({ brokerSlug, brokerName, pageType = "broker", pageSlug }: AskQuestionFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim().length < 10) {
      setErrorMsg("Question must be at least 10 characters");
      return;
    }
    if (displayName.trim().length < 2) {
      setErrorMsg("Please enter your name (at least 2 characters)");
      return;
    }

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broker_slug: brokerSlug,
          page_type: pageType,
          page_slug: pageSlug || brokerSlug,
          question: question.trim(),
          display_name: displayName.trim(),
          email: email.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit");
      }

      setStatus("success");
      setQuestion("");
      setDisplayName("");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }, [question, displayName, email, brokerSlug, pageType, pageSlug]);

  if (status === "success") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-green-800 font-medium">Thanks for your question!</p>
        <p className="text-xs text-green-600 mt-1">
          Our editorial team will review and answer it shortly. Approved questions appear on this page.
        </p>
        <button
          onClick={() => { setStatus("idle"); setIsOpen(false); }}
          className="text-xs text-green-700 underline mt-2 hover:text-green-900"
        >
          Ask another question
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Ask a question about {brokerName}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-bold text-slate-900 mb-3">
            Ask about {brokerName}
          </h3>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., Does this broker support DRP for ASX shares?"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            rows={3}
            maxLength={500}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              maxLength={100}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (optional — for answer notification)"
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          {errorMsg && (
            <p className="text-xs text-red-600 mt-2">{errorMsg}</p>
          )}
          <div className="flex items-center gap-3 mt-3">
            <button
              type="submit"
              disabled={status === "submitting"}
              className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {status === "submitting" ? "Submitting..." : "Submit Question"}
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Questions are moderated before appearing. We aim to answer within 48 hours.
          </p>
        </form>
      )}
    </div>
  );
}
