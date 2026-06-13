"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  slug: string;
  /** Current viewer state: not-enrolled, enrolled, or waitlisted. */
  state: "none" | "enrolled" | "waitlisted";
  /** When the cohort is closed, enrolling joins the waitlist. */
  enrolmentOpen: boolean;
}

export default function EnrolButton({ slug, state, enrolmentOpen }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function post(path: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (res.status === 401) {
        window.location.href = `/auth/login?next=/challenges/${slug}`;
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      startTransition(() => router.refresh());
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "waitlisted") {
    return (
      <div>
        <p className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
          You&apos;re on the waitlist. We&apos;ll email you when the next cohort opens.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => post("/api/challenges/withdraw")}
          className="mt-2 text-xs font-medium text-slate-500 underline disabled:opacity-50"
        >
          Leave the waitlist
        </button>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </div>
    );
  }

  if (state === "enrolled") {
    return (
      <div>
        <button
          type="button"
          disabled={busy}
          onClick={() => post("/api/challenges/withdraw")}
          className="text-xs font-medium text-slate-500 underline disabled:opacity-50"
        >
          Withdraw from this challenge
        </button>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => post("/api/challenges/enrol")}
        className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {busy
          ? "Joining…"
          : enrolmentOpen
            ? "Enrol in this challenge"
            : "Join the waitlist"}
      </button>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
