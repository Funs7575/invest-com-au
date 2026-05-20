"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// useSearchParams must sit under a Suspense boundary or Next 15's
// `next build` errors when it tries to prerender the route.
export default function AcceptBrokerInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto py-12 text-center">
          <p className="text-sm text-slate-600">Loading…</p>
        </div>
      }
    >
      <AcceptInner />
    </Suspense>
  );
}

function AcceptInner() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  // Derive the missing-token state from the initial render so the effect
  // doesn't synchronously setState (react-hooks/set-state-in-effect).
  const [state, setState] = useState<"working" | "ok" | "error">(token ? "working" : "error");
  const [message, setMessage] = useState(
    token ? "Accepting invitation…" : "Missing invitation token.",
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/broker-team/accept", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
        if (cancelled) return;
        if (!res.ok || !body.ok) {
          setState("error");
          setMessage(
            body.error === "expired"
              ? "This invitation has expired. Ask for a new one."
              : body.error === "already_used"
              ? "This invitation has already been used."
              : body.error === "unauthorized"
              ? "Please sign in to your broker account first, then re-open the invite link."
              : "Could not accept the invitation.",
          );
          return;
        }
        setState("ok");
        setMessage("You've joined the team. Redirecting…");
        setTimeout(() => router.push("/broker-portal/team"), 1500);
      } catch {
        if (!cancelled) {
          setState("error");
          setMessage("Something went wrong accepting the invitation.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <div className="max-w-md mx-auto py-12 text-center">
      <h1 className="text-lg font-bold text-slate-900 mb-2">Team invitation</h1>
      <p
        className={`text-sm ${state === "error" ? "text-red-700" : "text-slate-600"}`}
        role={state === "error" ? "alert" : "status"}
      >
        {message}
      </p>
    </div>
  );
}
