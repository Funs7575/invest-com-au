"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

type Props = {
  // Intentionally no callbacks — password/signup flows do window.location.reload()
  // and magic-link flows send an email; both re-enter via the parent's checkSession path.
};

export default function AdvisorPortalLogin(_props: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"magic" | "password" | "signup">("magic");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error" | "success">("idle");
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/advisor-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setStatus("error");
        return;
      }
      if (mode === "magic") {
        setStatus("sent");
      } else if (mode === "signup" && data.needsConfirmation) {
        setStatus("sent");
      } else {
        // Password login or signup with auto-confirm — reload re-triggers checkSession in parent
        setStatus("success");
        window.location.reload();
      }
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <Link href="/" className="text-xl font-extrabold text-slate-900">Invest.com.au</Link>
          <p className="text-sm text-slate-500 mt-1">Advisor Portal</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {status === "sent" ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon name="mail" size={24} className="text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Check your email</h2>
              <p className="text-sm text-slate-500">We&apos;ve sent a login link to <strong>{email}</strong>. Click the link to access your dashboard.</p>
              <p className="text-xs text-slate-400 mt-3">Check spam if you don&apos;t see it within a minute.</p>
              <button onClick={() => { setStatus("idle"); setError(""); }} className="mt-4 text-xs text-slate-500 hover:text-slate-700">Try a different email</button>
            </div>
          ) : status === "success" ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon name="check" size={24} className="text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Logging you in...</h2>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                {mode === "signup" ? "Create your account" : "Log in"}
              </h2>
              <p className="text-sm text-slate-500 mb-4">
                {mode === "magic"
                  ? "We'll email you a secure login link."
                  : mode === "signup"
                  ? "Set up a password for your advisor account."
                  : "Enter your email and password."}
              </p>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-slate-900"
                onKeyDown={(e) => e.key === "Enter" && mode === "magic" && handleLogin()}
              />

              {mode !== "magic" && (
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "Create a password (8+ characters)" : "Password"}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              )}

              <button
                onClick={handleLogin}
                disabled={status === "sending" || !email || (mode !== "magic" && !password)}
                className="w-full py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {status === "sending"
                  ? "Please wait..."
                  : mode === "magic"
                  ? "Send Login Link"
                  : mode === "signup"
                  ? "Create Account"
                  : "Log In"}
              </button>

              {error && <p className="text-xs text-red-600 mt-2 text-center">{error}</p>}

              <div className="mt-4 pt-3 border-t border-slate-100 text-center space-y-1.5">
                {mode === "magic" ? (
                  <>
                    <button
                      onClick={() => { setMode("password"); setError(""); }}
                      className="text-xs text-slate-500 hover:text-slate-700 block w-full"
                    >
                      Use password instead
                    </button>
                    <button
                      onClick={() => { setMode("signup"); setError(""); }}
                      className="text-xs text-violet-600 hover:text-violet-800 block w-full font-medium"
                    >
                      First time? Set up a password
                    </button>
                  </>
                ) : mode === "password" ? (
                  <>
                    <button
                      onClick={() => { setMode("magic"); setError(""); }}
                      className="text-xs text-slate-500 hover:text-slate-700 block w-full"
                    >
                      Use magic link instead
                    </button>
                    <button
                      onClick={() => { setMode("signup"); setError(""); }}
                      className="text-xs text-violet-600 hover:text-violet-800 block w-full font-medium"
                    >
                      First time? Create account
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setMode("password"); setError(""); }}
                    className="text-xs text-slate-500 hover:text-slate-700 block w-full"
                  >
                    Already have an account? Log in
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        <p className="text-center text-xs text-slate-400 mt-4">
          Not listed yet?{" "}
          <Link href="/for-advisors" className="text-slate-600 hover:text-slate-900 font-medium">
            Join the directory →
          </Link>
        </p>
      </div>
    </div>
  );
}
