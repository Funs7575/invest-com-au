"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useUser } from "@/lib/hooks/useUser";
import Toast from "@/components/Toast";

interface SaveComparisonButtonProps {
  brokerSlugs: string[];
  quizResults?: Record<string, unknown> | null;
  className?: string;
}

export default function SaveComparisonButton({
  brokerSlugs,
  quizResults,
  className,
}: SaveComparisonButtonProps) {
  const { user, loading: userLoading } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (showModal) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showModal]);

  // Close on Escape + focus trap
  useEffect(() => {
    if (!showModal) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowModal(false);
        setError(null);
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showModal]);

  const handleOpen = useCallback(() => {
    setName("");
    setNotes("");
    setError(null);
    setSaving(false);
    setShowModal(true);
  }, []);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter a name for this comparison.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/saved-comparisons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          broker_slugs: brokerSlugs,
          quiz_results: quizResults ?? null,
          notes: notes.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save comparison.");
        setSaving(false);
        return;
      }

      setShowModal(false);
      setShowToast(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  // Don't render anything while auth is loading
  if (userLoading) return null;

  // Disabled state: need at least 2 brokers to save a comparison
  const disabled = brokerSlugs.length < 2;

  return (
    <>
      {/* Main button */}
      {user ? (
        <button
          onClick={handleOpen}
          disabled={disabled}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl transition-colors ${
            disabled
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-slate-900 text-white hover:bg-slate-800"
          } ${className ?? ""}`}
          title={disabled ? "Add at least 2 brokers to save a comparison" : "Save this comparison"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          Save Comparison
        </button>
      ) : (
        <Link
          href="/auth/login?next=/compare"
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors ${className ?? ""}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
            />
          </svg>
          Sign in to save
        </Link>
      )}

      {/* Save modal */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              setShowModal(false);
              setError(null);
            }}
          />

          {/* Dialog */}
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-comparison-title"
            className="relative bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full p-6"
          >
            <h3
              id="save-comparison-title"
              className="text-lg font-bold text-slate-900 mb-1"
            >
              Save Comparison
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Save this {brokerSlugs.length}-broker comparison to your account for quick access later.
            </p>

            {/* Name input */}
            <label className="block mb-3">
              <span className="text-xs font-semibold text-slate-700 mb-1 block">
                Name <span className="text-red-400">*</span>
              </span>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Low-fee ETF brokers"
                maxLength={100}
                disabled={saving}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSave();
                  }
                }}
              />
            </label>

            {/* Notes input (optional) */}
            <label className="block mb-4">
              <span className="text-xs font-semibold text-slate-700 mb-1 block">
                Notes <span className="text-slate-400 font-normal">(optional)</span>
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes about this comparison..."
                maxLength={2000}
                rows={2}
                disabled={saving}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none"
              />
            </label>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setError(null);
                }}
                disabled={saving}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-900 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="px-4 py-2 text-sm font-semibold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Comparison"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      <Toast
        message="Comparison saved!"
        visible={showToast}
        onDone={() => setShowToast(false)}
        icon="check"
      />
    </>
  );
}
