"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * HouseholdManager — household create/invite + roster + leave/revoke/delete.
 *
 * Two modes:
 *   - No household yet → a create form (name + partner email).
 *   - In a household   → the viral "you're sharing a household" panel, roster,
 *     and the leave (partner) / delete (owner) / revoke (owner) controls.
 *
 * All writes go to /api/account/household{,/leave}; the server re-checks the
 * flag + ownership + the one-household cap. We never receive invite tokens.
 */

export interface HouseholdMemberView {
  id: string;
  email: string;
  role: "owner" | "partner";
  status: "pending" | "accepted" | "revoked" | "left";
  isMe: boolean;
  label: string;
}

export interface HouseholdView {
  householdName: string;
  myRole: "owner" | "partner";
  members: HouseholdMemberView[];
}

const ERROR_COPY: Record<string, string> = {
  already_in_household: "You're already in a household. Leave it first to start another.",
  invalid_email: "Enter a valid email address for your partner.",
  self_invite: "You can't invite your own email — add your partner's address.",
  db_error: "Something went wrong. Please try again.",
  forbidden: "You don't have permission to do that.",
  not_found: "That household could not be found.",
  "Too many attempts. Please try again later.": "Too many attempts. Please try again later.",
};

function friendlyError(code: string | undefined): string {
  if (!code) return "Something went wrong. Please try again.";
  return ERROR_COPY[code] ?? "Something went wrong. Please try again.";
}

export default function HouseholdManager({
  initialView,
}: {
  initialView: HouseholdView | null;
}) {
  const router = useRouter();
  const [view] = useState<HouseholdView | null>(initialView);

  if (view) {
    return <ActiveHousehold view={view} onChange={() => router.refresh()} />;
  }
  return <CreateHousehold onCreated={() => router.refresh()} />;
}

function CreateHousehold({ onCreated }: { onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Enter your partner's email address.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/account/household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner_email: email.trim(),
          name: name.trim() || undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; invited_email?: string };
      if (!res.ok) {
        setError(friendlyError(body.error));
        return;
      }
      setSentTo(body.invited_email ?? email.trim());
      onCreated();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-violet-200 bg-violet-50 p-5"
      >
        <h2 className="text-lg font-bold text-violet-900">Invitation sent</h2>
        <p className="mt-1 text-sm text-violet-800">
          We&apos;ve emailed <strong>{sentTo}</strong> an invitation to join your
          household. Once they accept with that email address, you can start
          sharing goals, balances and watchlist items.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold text-slate-900">Invite your partner</h2>
      <p className="mt-1 text-sm text-slate-500">
        We&apos;ll create a household and email them a link to join.
      </p>
      <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="hh-name"
            className="mb-1 block text-xs font-medium text-slate-700"
          >
            Household name (optional)
          </label>
          <input
            id="hh-name"
            type="text"
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Our household"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="hh-email"
            className="mb-1 block text-xs font-medium text-slate-700"
          >
            Partner&apos;s email <span className="text-red-600">*</span>
          </label>
          <input
            id="hh-email"
            type="email"
            required
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="partner@example.com"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs text-slate-600">
            Accepting grants your partner <strong>read access</strong> to the
            items you choose to share. Only the owner of an item can edit or
            remove it. Nothing is shared until you turn it on, item by item.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          aria-busy={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Sending invitation…" : "Create household & send invite"}
        </button>
      </form>
    </section>
  );
}

function ActiveHousehold({
  view,
  onChange,
}: {
  view: HouseholdView;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOwner = view.myRole === "owner";
  const acceptedPartner = view.members.find(
    (m) => m.role === "partner" && m.status === "accepted",
  );
  const pendingPartner = view.members.find(
    (m) => m.role === "partner" && m.status === "pending",
  );

  async function post(url: string, body: Record<string, unknown>, key: string) {
    setError(null);
    setBusy(key);
    try {
      const res = await fetch(url, {
        method: url === "/api/account/household" ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        ...(url === "/api/account/household" ? {} : { body: JSON.stringify(body) }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        setError(friendlyError(b.error));
        return;
      }
      onChange();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Viral confirmation panel — both sides see this once sharing is live. */}
      {acceptedPartner ? (
        <div
          role="status"
          className="rounded-2xl border border-violet-200 bg-violet-50 p-5"
        >
          <div className="flex items-start gap-3">
            <span aria-hidden className="text-2xl">
              🏡
            </span>
            <div>
              <h2 className="text-lg font-bold text-violet-900">
                You&apos;re sharing a household
              </h2>
              <p className="mt-1 text-sm text-violet-800">
                You and <strong>{acceptedPartner.label}</strong> can now view
                each other&apos;s shared goals, balances and watchlist items.
                Open any item and switch on <em>Share with household</em> to
                start.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href="/account/net-worth"
                  className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100"
                >
                  Combined net worth →
                </a>
                <a
                  href="/account/goals"
                  className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-800 hover:bg-violet-100"
                >
                  Combined goals →
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-slate-900">{view.householdName}</h2>
          {pendingPartner ? (
            <p className="mt-1 text-sm text-slate-500">
              Waiting for <strong>{pendingPartner.email}</strong> to accept their
              invitation. Once they join with that email, you can start sharing.
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-500">
              Your household is set up.
            </p>
          )}
        </div>
      )}

      {/* Roster */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900">Members</h3>
        <ul className="mt-3 space-y-2">
          {view.members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {m.label}
                  {m.isMe && <span className="ml-1 text-xs text-slate-400">(you)</span>}
                </p>
                <p className="truncate text-xs text-slate-500">{m.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase ${
                    m.status === "accepted"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {m.status === "accepted" ? m.role : "pending"}
                </span>
                {isOwner && m.role === "partner" && (
                  <button
                    type="button"
                    onClick={() =>
                      void post(
                        "/api/account/household/leave",
                        { action: "revoke", member_id: m.id },
                        `revoke-${m.id}`,
                      )
                    }
                    disabled={busy !== null}
                    className="text-xs font-medium text-red-700 hover:text-red-900 disabled:opacity-50"
                  >
                    {busy === `revoke-${m.id}` ? "…" : m.status === "pending" ? "Cancel" : "Remove"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {/* Danger zone */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        {isOwner ? (
          <>
            <h3 className="text-sm font-semibold text-slate-900">Delete household</h3>
            <p className="mt-1 text-xs text-slate-500">
              This removes the household for everyone and un-shares all shared
              items. Each person keeps their own data.
            </p>
            <button
              type="button"
              onClick={() => void post("/api/account/household", {}, "delete")}
              disabled={busy !== null}
              className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {busy === "delete" ? "Deleting…" : "Delete household"}
            </button>
          </>
        ) : (
          <>
            <h3 className="text-sm font-semibold text-slate-900">Leave household</h3>
            <p className="mt-1 text-xs text-slate-500">
              You&apos;ll stop sharing and lose access to your partner&apos;s
              shared items. Your own data stays with you.
            </p>
            <button
              type="button"
              onClick={() => void post("/api/account/household/leave", { action: "leave" }, "leave")}
              disabled={busy !== null}
              className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {busy === "leave" ? "Leaving…" : "Leave household"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
