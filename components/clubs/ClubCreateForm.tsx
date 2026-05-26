"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClubCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !displayName.trim()) {
      setError("Club name and your display name are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/clubs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || null, displayName: displayName.trim() }),
      });
      const json = (await res.json()) as { clubId?: string; error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not create club.");
        return;
      }
      router.push(`/clubs/${json.clubId}`);
      router.refresh();
    } catch {
      setError("Could not create club. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          Club name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="e.g. ETF Enthusiasts AUS"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          Description <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="What will your group focus on?"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          Your display name in this club
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={40}
          placeholder="e.g. Alex · stays anonymous to other members"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        />
        <p className="text-[10px] text-slate-400 mt-1">
          Other members see this name, not your account name.
        </p>
      </div>
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-lg hover:bg-slate-900 transition-colors disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create club"}
      </button>
    </form>
  );
}
