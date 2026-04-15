"use client";

import { useState } from "react";

type RequestType = "export" | "delete";

export default function DataRightsForm() {
  const [email, setEmail] = useState("");
  const [type, setType] = useState<RequestType>("export");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (type === "delete") {
      const confirmed = window.confirm(
        "This will PERMANENTLY delete or anonymise all data we hold for this email. This cannot be undone. Are you sure?",
      );
      if (!confirmed) return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/privacy/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Request failed (${res.status})`);
      } else {
        setMessage(
          data.message ||
            "Check your email for a confirmation link. It expires in 24 hours.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div>
        <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
          Your email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
          placeholder="you@example.com"
        />
      </div>

      <fieldset>
        <legend className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Request type
        </legend>
        <div className="space-y-2">
          <label className={`flex items-start gap-3 p-3 rounded border cursor-pointer ${type === "export" ? "border-amber-400 bg-amber-50" : "border-slate-200"}`}>
            <input
              type="radio"
              name="request_type"
              value="export"
              checked={type === "export"}
              onChange={() => setType("export")}
              className="mt-1"
            />
            <div>
              <div className="text-sm font-semibold text-slate-900">Export my data</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Download a JSON bundle of every row linked to your email.
              </div>
            </div>
          </label>
          <label className={`flex items-start gap-3 p-3 rounded border cursor-pointer ${type === "delete" ? "border-red-400 bg-red-50" : "border-slate-200"}`}>
            <input
              type="radio"
              name="request_type"
              value="delete"
              checked={type === "delete"}
              onChange={() => setType("delete")}
              className="mt-1"
            />
            <div>
              <div className="text-sm font-semibold text-slate-900">Delete my data</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Permanently erase or anonymise everything we hold. Can't be undone.
              </div>
            </div>
          </label>
        </div>
      </fieldset>

      {error && (
        <div role="alert" className="px-3 py-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full py-2 rounded bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 disabled:opacity-50"
      >
        {busy ? "Sending…" : `Send ${type === "export" ? "export" : "deletion"} confirmation link`}
      </button>
    </form>
  );
}
