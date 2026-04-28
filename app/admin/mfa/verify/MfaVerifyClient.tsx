"use client";

import { useState } from "react";

interface Props {
  adminEmail: string;
  redirectTo: string;
}

export default function MfaVerifyClient({ adminEmail, redirectTo }: Props) {
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Please enter a code.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const body = useRecovery
        ? { recovery_code: trimmed }
        : { code: trimmed };
      const res = await fetch("/api/admin/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        window.location.href = redirectTo;
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(
        (data as { error?: string }).error ||
          `Verification failed (${res.status}).`,
      );
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Two-factor verification
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Signed in as{" "}
            <span className="font-medium text-slate-700">{adminEmail}</span>
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm"
        >
          {error && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3"
            >
              {error}
            </div>
          )}

          {!useRecovery ? (
            <div>
              <label
                htmlFor="mfa-code"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Authenticator code
              </label>
              <input
                id="mfa-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="6-digit code"
                maxLength={6}
                autoFocus
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Open your authenticator app and enter the 6-digit code.
              </p>
            </div>
          ) : (
            <div>
              <label
                htmlFor="recovery-code"
                className="block text-sm font-semibold text-slate-700 mb-1"
              >
                Recovery code
              </label>
              <input
                id="recovery-code"
                type="text"
                autoComplete="off"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter a recovery code"
                autoFocus
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-700/30 focus:border-emerald-700"
              />
              <p className="text-xs text-slate-500 mt-1.5">
                Each recovery code can only be used once.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? "Verifying…" : "Verify"}
          </button>

          <button
            type="button"
            onClick={() => {
              setUseRecovery((v) => !v);
              setCode("");
              setError(null);
            }}
            className="w-full text-xs text-slate-500 hover:text-slate-700 text-center py-1"
          >
            {useRecovery
              ? "Use authenticator code instead"
              : "Lost your device? Use a recovery code"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 mt-4">
          Need to enroll?{" "}
          <a
            href="/admin/settings/mfa"
            className="text-emerald-700 hover:underline font-medium"
          >
            Manage MFA settings
          </a>
        </p>
      </div>
    </div>
  );
}
