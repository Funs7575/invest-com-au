"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

export default function OrgPortalLogin() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const handleSendLink = async () => {
    if (!email) return;
    setStatus("sending");
    setError("");
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + "/org-portal",
        },
      });
      if (authError) {
        setError(authError.message || "Failed to send login link.");
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Link href="/" className="text-xl font-extrabold text-slate-900">
            Invest.com.au
          </Link>
          <p className="text-sm text-slate-500 mt-1">Organisation Portal</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {status === "sent" ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon name="mail" size={24} className="text-teal-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Check your email</h2>
              <p className="text-sm text-slate-500">
                We&apos;ve sent a login link to <strong>{email}</strong>. Click the link to access your organisation dashboard.
              </p>
              <p className="text-xs text-slate-400 mt-3">Check spam if you don&apos;t see it within a minute.</p>
              <button
                onClick={() => { setStatus("idle"); setError(""); }}
                className="mt-4 text-xs text-slate-500 hover:text-slate-700"
              >
                Try a different email
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Log in</h2>
              <p className="text-sm text-slate-500 mb-4">
                We&apos;ll email you a secure login link.
              </p>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@organisation.com"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-teal-600"
                onKeyDown={(e) => e.key === "Enter" && handleSendLink()}
              />

              <button
                onClick={handleSendLink}
                disabled={status === "sending" || !email}
                className="w-full py-2.5 bg-teal-600 text-white font-semibold rounded-lg text-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {status === "sending" ? "Sending..." : "Send magic link"}
              </button>

              {error && (
                <p className="text-xs text-red-600 mt-2 text-center">{error}</p>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Want to list your CPD courses?{" "}
          <Link href="/for-providers" className="text-slate-600 hover:text-slate-900 font-medium">
            Learn more →
          </Link>
        </p>
      </div>
    </div>
  );
}
