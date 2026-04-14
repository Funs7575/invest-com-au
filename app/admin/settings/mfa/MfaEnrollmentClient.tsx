"use client";

import { useState } from "react";

/**
 * Client-side enrollment + disable UI.
 *
 * Enrollment flow:
 *   1. POST /api/admin/mfa/enroll → get secret + otpauth URL + codes
 *   2. Display the otpauth URL as a QR code (via a plain
 *      third-party render like https://api.qrserver.com — server
 *      only needs to ship the URL, not the image)
 *   3. Show the 10 recovery codes, ask the admin to copy them
 *   4. Ask the admin to enter a TOTP code to confirm the
 *      authenticator works before we consider enrolment "done"
 *      (safety net — otherwise a user could enrol, lose the phone,
 *      and be locked out)
 *
 * Disable flow requires a reason string (audit log).
 */
interface Props {
  enrolled: boolean;
  email: string;
}

interface EnrollResult {
  secret: string;
  otpAuthUrl: string;
  recoveryCodes: string[];
}

export default function MfaEnrollmentClient({ enrolled: initialEnrolled, email }: Props) {
  const [enrolled, setEnrolled] = useState(initialEnrolled);
  const [phase, setPhase] = useState<"idle" | "enrolling" | "confirming" | "done">("idle");
  const [result, setResult] = useState<EnrollResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function startEnroll() {
    if (!window.confirm("Enroll two-factor authentication on this account? You will be asked to scan a QR code with an authenticator app.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/mfa/enroll", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult({
        secret: data.secret,
        otpAuthUrl: data.otpAuthUrl,
        recoveryCodes: data.recoveryCodes,
      });
      setPhase("enrolling");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enrollment failed");
    } finally {
      setBusy(false);
    }
  }

  async function disableMfa() {
    const reason = window.prompt(
      "Reason for disabling MFA? This is logged.",
      "",
    );
    if (reason == null || reason.trim().length < 5) {
      setError("Reason must be at least 5 characters");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/mfa/enroll", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setEnrolled(false);
      setPhase("idle");
      setResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disable failed");
    } finally {
      setBusy(false);
    }
  }

  const qrSrc = result
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(result.otpAuthUrl)}`
    : null;

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-800"
        >
          {error}
        </div>
      )}

      {!enrolled && phase === "idle" && (
        <button
          type="button"
          onClick={startEnroll}
          disabled={busy}
          className="px-4 py-2 rounded bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? "…" : "Enable MFA"}
        </button>
      )}

      {phase === "enrolling" && result && (
        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-2">Step 1 — Scan the QR code</h2>
            <p className="text-xs text-slate-600 mb-3">
              Open your authenticator app (1Password, Authy, Google
              Authenticator) and add a new entry by scanning this code.
              The account will show as <code className="bg-slate-100 px-1 rounded">{email}</code>.
            </p>
            {qrSrc && (
              <div className="flex justify-center py-3">
                <img
                  src={qrSrc}
                  alt="MFA QR code"
                  width={240}
                  height={240}
                  className="border border-slate-200 rounded"
                />
              </div>
            )}
            <details className="text-xs text-slate-500 mt-2">
              <summary className="cursor-pointer hover:text-slate-700">Can&apos;t scan? Show the secret.</summary>
              <p className="font-mono text-[0.65rem] break-all mt-2 p-2 bg-slate-100 rounded">
                {result.secret}
              </p>
            </details>
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-2">Step 2 — Save your recovery codes</h2>
            <p className="text-xs text-slate-600 mb-3">
              You&apos;ll need one of these if you lose your device.
              Each can only be used once. Store them somewhere safe
              — a password manager or a printed copy in a locked
              drawer. <strong className="text-red-700">They will never be shown again.</strong>
            </p>
            <ol className="grid grid-cols-2 gap-2 font-mono text-xs bg-slate-50 border border-slate-200 rounded p-3">
              {result.recoveryCodes.map((code, i) => (
                <li key={i} className="text-slate-700">
                  {i + 1}. {code}
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(result.recoveryCodes.join("\n"));
              }}
              className="mt-2 px-3 py-1 text-xs rounded bg-white border border-slate-300 hover:bg-slate-50"
            >
              Copy codes
            </button>
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-2">Step 3 — Confirm it works</h2>
            <p className="text-xs text-slate-600 mb-3">
              Once you&apos;ve saved the codes and added the entry
              to your authenticator, sign out and sign back in. You
              should be prompted for a 6-digit code.
            </p>
            <button
              type="button"
              onClick={() => {
                setEnrolled(true);
                setPhase("done");
                setResult(null);
              }}
              className="px-4 py-2 rounded bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800"
            >
              I&apos;ve saved everything — finish enrolment
            </button>
          </div>
        </section>
      )}

      {enrolled && phase !== "enrolling" && (
        <button
          type="button"
          onClick={disableMfa}
          disabled={busy}
          className="px-4 py-2 rounded bg-white border border-red-300 text-red-700 font-semibold text-sm hover:bg-red-50 disabled:opacity-50"
        >
          {busy ? "…" : "Disable MFA"}
        </button>
      )}
    </div>
  );
}
