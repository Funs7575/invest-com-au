"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function UnsubscribeClient() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [emailParam]);

  const handleUnsubscribe = async () => {
    if (!email || !email.includes("@")) {
      setMessage("Please enter a valid email address.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.message || "You have been unsubscribed.");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 mb-2">Unsubscribed</h1>
        <p className="text-sm text-slate-500 mb-6">
          {message}
        </p>
        <p className="text-xs text-slate-400 mb-6">
          You won&apos;t receive any more emails from us. If you change your mind, you can re-subscribe anytime from your account settings.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors"
        >
          Back to Invest.com.au
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="w-14 h-14 mx-auto mb-4 bg-slate-100 rounded-full flex items-center justify-center">
        <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h1 className="text-xl font-extrabold text-slate-900 mb-2">Unsubscribe</h1>
      <p className="text-sm text-slate-500 mb-6">
        Enter your email to unsubscribe from all Invest.com.au marketing emails.
      </p>

      <div className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-colors"
        />

        {status === "error" && message && (
          <p className="text-xs text-red-600">{message}</p>
        )}

        <button
          onClick={handleUnsubscribe}
          disabled={status === "loading" || !email}
          className="w-full py-3 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {status === "loading" ? "Processing..." : "Unsubscribe"}
        </button>
      </div>

      <p className="text-xs text-slate-400 mt-6">
        If you have an account, you can also manage preferences from{" "}
        <Link href="/account" className="underline hover:text-slate-600">
          your account settings
        </Link>.
      </p>
    </div>
  );
}
