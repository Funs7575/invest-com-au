"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Accept / decline buttons for an incoming pending referral. Posts to
 * `/api/referrals/[id]/{accept,decline}` and refreshes the page on success
 * so the new status renders without a hard reload.
 */

interface Props {
  referralId: number;
}

export default function ReferralActions({ referralId }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "accept" | "decline") {
    setBusy(action);
    setError(null);
    try {
      const res = await fetch(`/api/referrals/${referralId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? `Request failed (${res.status}).`);
        setBusy(null);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
      setBusy(null);
    }
  }

  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
      <button
        type="button"
        onClick={() => run("decline")}
        disabled={busy !== null}
        style={{
          padding: "6px 12px",
          border: "1px solid #cbd5e1",
          background: "#fff",
          color: "#0f172a",
          borderRadius: 6,
          fontSize: 13,
          cursor: busy ? "not-allowed" : "pointer",
        }}
      >
        {busy === "decline" ? "Declining…" : "Decline"}
      </button>
      <button
        type="button"
        onClick={() => run("accept")}
        disabled={busy !== null}
        style={{
          padding: "6px 12px",
          border: "none",
          background: "#0ea5e9",
          color: "#fff",
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
          cursor: busy ? "not-allowed" : "pointer",
        }}
      >
        {busy === "accept" ? "Accepting…" : "Accept"}
      </button>
      {error ? (
        <span
          role="alert"
          style={{ color: "#b91c1c", fontSize: 12, marginLeft: 8 }}
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
