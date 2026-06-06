"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

export default function JoinClubPage({ params }: { params: Promise<{ clubId: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clubId, setClubId] = useState<string>("");
  const [displayName, setDisplayName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    params.then(({ clubId: id }) => setClubId(id));
  }, [params]);

  const token = searchParams.get("token");

  if (!token) {
    return (
      <div className="container-custom max-w-md py-16 text-center">
        <p className="text-slate-600">Invalid invite link.</p>
      </div>
    );
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Please enter a display name.");
      return;
    }
    if (!clubId) return;
    setJoining(true);
    setError("");
    try {
      const res = await fetch(
        `/api/clubs/${clubId}/invite?token=${encodeURIComponent(token!)}&displayName=${encodeURIComponent(displayName.trim())}`,
      );
      const j = (await res.json()) as { ok?: boolean; error?: string; alreadyMember?: boolean };
      if (!res.ok) {
        setError(j.error ?? "Could not join. The invite may have expired.");
        return;
      }
      router.push(`/clubs/${clubId}`);
    } catch {
      setError("Could not join. Try again.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="container-custom max-w-md py-16">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Join Investment Club</h1>
      <p className="text-sm text-slate-500 mb-6">
        Choose a display name — other members will see this, not your account name.
      </p>
      <form onSubmit={handleJoin} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Your display name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
            placeholder="e.g. Alex"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
        </div>
        {error && <p role="alert" className="text-red-600 text-xs">{error}</p>}
        <button
          type="submit"
          disabled={joining || !clubId}
          className="w-full px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {joining ? "Joining…" : "Join club"}
        </button>
        <p className="text-[10px] text-slate-400 text-center">
          Investment clubs are for information-sharing only. General information — not personal financial advice.
        </p>
      </form>
    </div>
  );
}
