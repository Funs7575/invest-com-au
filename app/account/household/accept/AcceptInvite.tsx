"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * AcceptInvite — confirm-and-claim UI for a household invitation.
 *
 * The server has already verified the signed-in user and matched the token to a
 * pending invite (or not). On accept we POST the token; the server re-runs the
 * email gate + one-household cap (the authoritative checks).
 */

const ERROR_COPY: Record<string, string> = {
  wrong_email:
    "This invitation was sent to a different email address. Sign in with the address the invite was sent to, then try again.",
  not_found: "This invitation link is invalid or has already been used.",
  not_pending: "This invitation has already been used or was cancelled.",
  already_in_household:
    "You're already in a household. Leave it first if you want to join a different one.",
  no_email: "Your account has no email address on file.",
  db_error: "Something went wrong. Please try again.",
};

export default function AcceptInvite({
  token,
  signedInEmail,
  householdName,
  hasMatch,
  alreadyInHousehold,
}: {
  token: string;
  signedInEmail: string;
  householdName: string | null;
  hasMatch: boolean;
  alreadyInHousehold: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function accept() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/account/household/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        household?: { name?: string };
      };
      if (!res.ok) {
        setError(ERROR_COPY[body.error ?? "db_error"] ?? "Something went wrong.");
        return;
      }
      setDone(body.household?.name ?? householdName ?? "your household");
      // Refresh so the dashboard / switcher pick up the new membership.
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-violet-200 bg-violet-50 p-6 text-center"
      >
        <div aria-hidden className="text-3xl">
          🏡
        </div>
        <h1 className="mt-2 text-xl font-extrabold text-violet-900">
          You&apos;re sharing a household
        </h1>
        <p className="mt-1 text-sm text-violet-800">
          You&apos;ve joined <strong>{done}</strong>. You can now view the goals,
          balances and watchlist items your partner shares — and choose what to
          share back.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <a
            href="/account/household"
            className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800"
          >
            Open your household
          </a>
          <a
            href="/account/net-worth"
            className="rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-100"
          >
            See your combined net worth
          </a>
        </div>
      </div>
    );
  }

  if (alreadyInHousehold) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-bold text-slate-900">You&apos;re already in a household</h1>
        <p className="mt-1 text-sm text-slate-500">
          You can only be in one household at a time. To join a different one,
          leave your current household first.
        </p>
        <a
          href="/account/household"
          className="mt-4 inline-block rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800"
        >
          Manage your household
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h1 className="text-xl font-bold text-slate-900">Join a household</h1>
      {hasMatch ? (
        <p className="mt-1 text-sm text-slate-500">
          You&apos;ve been invited to join{" "}
          <strong>{householdName ?? "a household"}</strong>. Accepting lets you
          view each other&apos;s shared goals, balances and watchlist items.
          Sharing grants read access only — each person stays the owner of their
          items.
        </p>
      ) : (
        <p className="mt-1 text-sm text-slate-500">
          We couldn&apos;t find a pending invitation for{" "}
          <strong>{signedInEmail}</strong>. If your partner used a different
          email address, sign in with that address. Otherwise, ask them to send a
          fresh invitation.
        </p>
      )}

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs text-slate-600">
          Signed in as <strong>{signedInEmail}</strong>
        </p>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void accept()}
        disabled={busy || !hasMatch || !token}
        aria-busy={busy}
        className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Joining…" : "Accept & join household"}
      </button>
    </div>
  );
}
