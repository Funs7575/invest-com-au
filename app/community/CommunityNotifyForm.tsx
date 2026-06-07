"use client";

import { useState } from "react";
import Icon from "@/components/Icon";

export default function CommunityNotifyForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    setErrorMsg("");
    setStatus("submitting");
    try {
      const res = await fetch("/api/community-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-emerald-700 font-semibold mt-4">
        <Icon name="check-circle" size={16} className="text-emerald-500" />
        You&apos;re on the list — we&apos;ll email you when community launches!
      </div>
    );
  }

  return (
    <div className="mt-5 max-w-sm mx-auto">
      <p className="text-xs text-slate-500 mb-2 text-center">Be the first to know when we launch</p>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setErrorMsg(""); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="your@email.com"
          autoComplete="email"
          aria-label="Email address"
          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          disabled={status === "submitting"}
        />
        <button
          onClick={submit}
          disabled={status === "submitting"}
          aria-busy={status === "submitting"}
          className="px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {status === "submitting" ? "Saving…" : "Notify Me"}
        </button>
      </div>
      {errorMsg && <p role="alert" className="text-xs text-red-600 mt-1">{errorMsg}</p>}
      {status === "error" && <p role="alert" className="text-xs text-red-600 mt-1">Something went wrong — please try again.</p>}
    </div>
  );
}
