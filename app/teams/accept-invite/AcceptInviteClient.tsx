"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface InviteInfo {
  email: string;
  name: string | null;
  role: string;
  team: { id: number; name: string; slug: string } | null;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  associate: "Associate",
};

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">{children}</div>
  );
}

export default function AcceptInviteClient({ token }: { token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError("This invitation link is missing its token.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/expert-teams/invite?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "This invitation is no longer valid.");
        if (!cancelled) setInvite(json as InviteInfo);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "This invitation is no longer valid.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onAccept = useCallback(async () => {
    setAccepting(true);
    setAcceptError(null);
    setNeedsSignIn(false);
    try {
      const res = await fetch("/api/expert-teams/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.status === 401) {
        setNeedsSignIn(true);
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Could not accept the invitation.");
      setDone(true);
      const slug = invite?.team?.slug;
      setTimeout(() => router.push(slug ? `/teams/${slug}/inbox` : "/advisor-portal"), 1200);
    } catch (e) {
      setAcceptError(e instanceof Error ? e.message : "Could not accept the invitation.");
    } finally {
      setAccepting(false);
    }
  }, [token, invite, router]);

  if (loading) {
    return (
      <Card>
        <div aria-hidden="true" className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading your invitation…</p>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card>
        <h1 className="text-xl font-extrabold text-slate-900 mb-2">Invitation unavailable</h1>
        <p className="text-sm text-slate-600 mb-4">{loadError}</p>
        <Link href="/teams" className="text-sm font-semibold text-slate-900 hover:underline">
          Browse expert teams
        </Link>
      </Card>
    );
  }

  if (done) {
    return (
      <Card>
        <h1 className="text-xl font-extrabold text-slate-900 mb-2">You&apos;re in! 🎉</h1>
        <p className="text-sm text-slate-600">
          You&apos;ve joined {invite?.team?.name ?? "the team"}. Taking you to the team inbox…
        </p>
      </Card>
    );
  }

  const teamName = invite?.team?.name ?? "an Invest.com.au team";
  const roleLabel = ROLE_LABELS[invite?.role ?? "member"] ?? invite?.role ?? "Member";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8">
      <p className="text-xs uppercase tracking-widest text-slate-500 mb-2 text-center">
        Team invitation
      </p>
      <h1 className="text-2xl font-extrabold text-slate-900 mb-2 text-center">
        Join {teamName}
      </h1>
      <p className="text-sm text-slate-600 mb-6 text-center">
        You&apos;ve been invited to join <strong>{teamName}</strong> as{" "}
        <strong>{roleLabel}</strong>. Team members receive matched client Match Requests in
        the team&apos;s shared inbox.
      </p>

      <button
        type="button"
        onClick={onAccept}
        disabled={accepting}
        className="w-full px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 text-sm font-bold rounded-xl transition-colors"
      >
        {accepting ? "Accepting…" : "Accept invitation"}
      </button>

      {acceptError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3" role="alert">
          {acceptError}
        </p>
      )}

      {needsSignIn && (
        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 space-y-2">
          <p className="font-semibold text-slate-800">Sign in to accept</p>
          <p>
            This invitation was sent to <strong>{invite?.email}</strong>. Sign in as that
            provider, then reopen this link to accept.
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <Link
              href="/advisor-portal"
              className="text-center px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800"
            >
              Sign in to the advisor portal
            </Link>
            <Link
              href={`/pros/join?invitation=${encodeURIComponent(token)}`}
              className="text-center text-sm font-semibold text-slate-700 hover:underline"
            >
              New here? Create your provider profile
            </Link>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-6 text-center">
        Invitations expire 7 days after they&apos;re sent.
      </p>
    </div>
  );
}
