"use client";

import { useState } from "react";

/**
 * Refer-a-brief dialog mounted from a row in the squad inbox.
 *
 * The host inbox row (added by PR #836 as `SquadInboxClaimRow.tsx`)
 * renders a "Refer →" button and toggles `open`. This component
 * stays self-contained so it can be dropped into the row without
 * adopting any of the row's data model.
 *
 * Props are intentionally minimal: the brief id + the calling team's
 * slug. The server route resolves the from-team via the slug and the
 * authenticated session.
 */

interface VerifiedTeam {
  id: number;
  slug: string;
  name: string;
  team_category: string;
}

interface ReferDialogProps {
  open: boolean;
  onClose: () => void;
  briefId: number;
  fromTeamSlug: string;
  /** Pre-fetched list of verified teams (excluding the current team). */
  verifiedTeams: VerifiedTeam[];
  /** Optional callback invoked after a successful referral. */
  onReferred?: () => void;
}

export default function ReferDialog({
  open,
  onClose,
  briefId,
  fromTeamSlug,
  verifiedTeams,
  onReferred,
}: ReferDialogProps) {
  const [toTeamId, setToTeamId] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Early return when closed — state is naturally fresh on the next mount
  // (parent toggles `open`, unmounting the form). Avoids a reset-effect
  // that would cascade re-renders.
  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!toTeamId) {
      setError("Pick a squad to refer to.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/teams/${encodeURIComponent(fromTeamSlug)}/referrals`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            briefId,
            toTeamId,
            note: note.trim() || null,
          }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? `Request failed (${res.status}).`);
        setSubmitting(false);
        return;
      }
      onReferred?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="refer-dialog-title"
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          width: "100%",
          maxWidth: 480,
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        }}
      >
        <h2 id="refer-dialog-title" style={{ margin: 0, fontSize: 18 }}>
          Refer this brief to another squad
        </h2>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 6 }}>
          Pick a verified squad that&apos;s a better fit for this brief.
          They&apos;ll see it in their inbox and can accept or decline.
        </p>

        <label
          htmlFor="refer-to-team"
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            marginTop: 16,
            color: "#0f172a",
          }}
        >
          Refer to
        </label>
        <select
          id="refer-to-team"
          value={toTeamId ?? ""}
          onChange={(e) => setToTeamId(Number(e.target.value) || null)}
          required
          disabled={submitting}
          style={{
            width: "100%",
            padding: "8px 10px",
            marginTop: 6,
            border: "1px solid #cbd5e1",
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          <option value="">Pick a squad…</option>
          {verifiedTeams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {t.team_category}
            </option>
          ))}
        </select>

        <label
          htmlFor="refer-note"
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            marginTop: 16,
            color: "#0f172a",
          }}
        >
          Why are you referring? <span style={{ color: "#94a3b8" }}>(optional)</span>
        </label>
        <textarea
          id="refer-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
          rows={4}
          disabled={submitting}
          placeholder="e.g. SMSF property structuring — outside our scope."
          style={{
            width: "100%",
            padding: "8px 10px",
            marginTop: 6,
            border: "1px solid #cbd5e1",
            borderRadius: 6,
            fontSize: 14,
            fontFamily: "inherit",
            resize: "vertical",
          }}
        />

        {error ? (
          <p
            role="alert"
            style={{
              color: "#b91c1c",
              fontSize: 13,
              marginTop: 12,
              marginBottom: 0,
            }}
          >
            {error}
          </p>
        ) : null}

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginTop: 20,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: "8px 16px",
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#0f172a",
              borderRadius: 6,
              fontSize: 14,
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !toTeamId}
            style={{
              padding: "8px 16px",
              border: "none",
              background: "#0ea5e9",
              color: "#fff",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: submitting || !toTeamId ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Referring…" : "Refer brief"}
          </button>
        </div>
      </form>
    </div>
  );
}
