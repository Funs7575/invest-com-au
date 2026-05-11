/**
 * Workspace switcher pill (W2 Phase 2.5).
 *
 * Client component. Fetches `/api/account/active-kind` GET on mount to
 * learn the user's memberships + active kind. Renders nothing for
 * unauthenticated users or single-kind users (no UI clutter).
 *
 * Multi-kind users see a "Acting as: X" pill that links to
 * /account/select-workspace where they can switch context. The chooser
 * page itself sets the cookie + redirects to the chosen portal.
 *
 * Designed to live inside the existing client-component Header.tsx tree
 * without forcing a server-component refactor of the header.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const KIND_LABEL: Record<string, string> = {
  investor: "Investor",
  advisor: "Advisor",
  broker_partner: "Broker partner",
  business_owner: "Business owner",
  listing_owner: "Listing owner",
};

interface Membership {
  kind: string;
  kind_id: string;
  status: string;
  display_label: string;
}

interface ActiveKindResponse {
  memberships: Membership[];
  active: string | null;
}

export default function WorkspaceSwitcher() {
  const [data, setData] = useState<ActiveKindResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/account/active-kind", { method: "GET" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j) return;
        setData(j as ActiveKindResponse);
      })
      .catch(() => {
        /* non-blocking */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data || data.memberships.length < 2) return null;

  const label = data.active ? KIND_LABEL[data.active] : "Choose workspace";

  return (
    <Link
      href="/account/select-workspace"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
      title="Switch workspace"
      data-testid="workspace-switcher"
    >
      <span aria-hidden>⇄</span>
      <span>Acting as: {label ?? "Workspace"}</span>
    </Link>
  );
}
