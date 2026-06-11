"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

// Intentionally no callbacks — password/signup flows do window.location.reload()
// and magic-link flows send an email; both re-enter via the parent's checkSession path.
type Props = Record<string, never>;

export default function AdvisorPortalLogin(_props: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"magic" | "password" | "signup">("magic");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error" | "success">("idle");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
              <p className="text-xs text-slate-500 mt-3">Check spam if you don&apos;t see it within a minute.</p>
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
                type="email" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-slate-900"
                onKeyDown={(e) => e.key === "Enter" && mode === "magic" && handleLogin()}
              />

              {mode !== "magic" && (
                <div className="relative mb-3">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "Create a password (8+ characters)" : "Password"}
                    className="w-full px-3 py-2.5 pr-10 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword
                      ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                      : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    }
                  </button>
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={status === "sending" || !email || (mode !== "magic" && !password)}
                className="w-full py-2.5 bg-slate-900 text-white font-semibold rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {status === "sending"
                  ? "Please wait..."
                  : mode === "magic"
                  ? "Send Login Link"
                  : mode === "signup"
                  ? "Create Account"
                  : "Log In"}
              </button>

              {error && <p role="alert" className="text-xs text-red-600 mt-2 text-center">{error}</p>}

              <div className="mt-4 pt-3 border-t border-slate-100 text-center space-y-2">
                {mode === "magic" ? (
                  <>
                    <button
                      onClick={() => { setMode("password"); setError(""); }}
                      aria-pressed={false}
                      className="text-sm text-slate-600 hover:text-slate-900 block w-full"
                    >
                      Use password instead
                    </button>
                    <button
                      onClick={() => { setMode("signup"); setError(""); }}
                      aria-pressed={false}
                      className="text-sm text-violet-600 hover:text-violet-800 block w-full font-medium"
                    >
                      First time? Set up a password
                    </button>
                  </>
                ) : mode === "password" ? (
                  <>
                    <button
                      onClick={() => { setMode("magic"); setError(""); }}
                      aria-pressed={false}
                      className="text-sm text-slate-600 hover:text-slate-900 block w-full"
                    >
                      Use magic link instead
                    </button>
                    <button
                      onClick={() => { setMode("signup"); setError(""); }}
                      aria-pressed={false}
                      className="text-sm text-violet-600 hover:text-violet-800 block w-full font-medium"
                    >
                      First time? Create account
                    </button>
                    <button
                      onClick={() => { setMode("magic"); setError(""); setEmail(""); }}
                      className="text-xs text-slate-500 hover:text-slate-600 block w-full"
                    >
                      Forgot password? Use magic link
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { setMode("password"); setError(""); }}
                    aria-pressed={false}
                    className="text-sm text-slate-600 hover:text-slate-900 block w-full"
                  >
                    Already have an account? Log in
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        <p className="text-center text-xs text-slate-500 mt-4">
          Not listed yet?{" "}
          <Link href="/for-advisors" className="text-slate-600 hover:text-slate-900 font-medium">
            Join the directory →
          </Link>
        </p>
      </div>
    </div>
  );
}
