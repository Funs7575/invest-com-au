"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Inline resend form on the auth-error page. Deliberately small — one
 * email input and one button — because the error page already explains
 * what went wrong. The entire point is to let the user retry in a single
 * click without navigating back to /auth/login.
 *
 * Uses the same browser-side createClient() as /auth/login so the PKCE
 * code_verifier cookie lands in THIS browser — which is critical for
 * the common cross-device failure case.
 */
export default function ResendMagicLinkForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "loading") return;

    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg("Please enter a valid email address.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const supabase = createClient();
      const siteUrl =
        process.env.NEXT_PUBLIC_SITE_URL ||
        (typeof window !== "undefined" ? window.location.origin : "");
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) {
        setErrorMsg(error.message || "Couldn't send the link. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
        <p className="text-sm font-semibold text-emerald-900 mb-1">
          Check your inbox
        </p>
        <p className="text-xs text-emerald-700 leading-relaxed">
          We sent a fresh sign-in link to <strong>{email}</strong>. Click it
          from this browser within the next 60 minutes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label htmlFor="resend-email" className="block text-xs font-semibold text-slate-700">
        Email address
      </label>
      <input
        id="resend-email"
        type="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (errorMsg) {
            setErrorMsg("");
            setStatus("idle");
          }
        }}
        autoComplete="email"
        disabled={status === "loading"}
        placeholder="you@email.com"
        aria-invalid={status === "error"}
        className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:opacity-60 ${
          status === "error" ? "border-red-400" : "border-slate-200 focus:border-amber-500"
        }`}
      />
      {errorMsg && (
        <p role="alert" className="text-xs text-red-600">
          {errorMsg}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full py-2.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === "loading" ? "Sending..." : "Send me a new sign-in link"}
      </button>
    </form>
  );
}
