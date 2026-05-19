/**
 * Workspace switcher pill + dropdown (W2 Phase 2.5 → Wave-3 upgrade).
 *
 * Client component. Fetches `/api/account/active-kind` GET on mount to
 * learn the user's memberships + active kind. Renders nothing for
 * unauthenticated users or single-kind users (no UI clutter).
 *
 * Multi-kind users see a pill that opens a dropdown listing every kind
 * they hold. Picking one POSTs to /api/account/active-kind, which sets
 * the `iv_active_kind` cookie and returns the destination portal URL —
 * we then `router.push(portal)` so no full page reload is needed.
 *
 * Designed to live inside the existing client-component Header.tsx tree
 * without forcing a server-component refactor of the header.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const KIND_LABEL: Record<string, string> = {
  investor: "Investor",
  advisor: "Advisor",
  broker_partner: "Broker partner",
  business_owner: "Business owner",
  listing_owner: "Listing owner",
  squad: "Squad",
};

const KIND_ICON: Record<string, string> = {
  investor: "📈",
  advisor: "🧑‍💼",
  broker_partner: "🏦",
  business_owner: "🏢",
  listing_owner: "🏷️",
  squad: "🤝",
};

interface Membership {
  kind: string;
  kind_id: string;
  status: string;
  display_label: string;
  scope_slug: string | null;
}

interface ActiveKindResponse {
  memberships: Membership[];
  active: string | null;
}

/**
 * Render order: base kinds first (preserving their existing relative
 * order), then squads grouped after. Keeps the dropdown readable for
 * users in many squads without changing the existing base-kind UX.
 */
function orderMemberships(memberships: Membership[]): Membership[] {
  const base = memberships.filter((m) => m.kind !== "squad");
  const squads = memberships.filter((m) => m.kind === "squad");
  return [...base, ...squads];
}

export default function WorkspaceSwitcher() {
  const router = useRouter();
  const [data, setData] = useState<ActiveKindResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

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

  // Click-outside to close.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  if (!data || data.memberships.length < 2) return null;

  const label = data.active ? KIND_LABEL[data.active] : "Choose workspace";
  const icon = data.active ? KIND_ICON[data.active] : "⇄";

  async function switchTo(m: Membership) {
    const tag = m.kind === "squad" ? `${m.kind}:${m.kind_id}` : m.kind;
    if (switching || tag === switching) {
      setOpen(false);
      return;
    }
    setSwitching(tag);
    try {
      const res = await fetch("/api/account/active-kind", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          m.kind === "squad" ? { kind: m.kind, team_id: m.kind_id } : { kind: m.kind },
        ),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { redirect?: string };
      const dest = body.redirect ?? "/account";
      setOpen(false);
      // Optimistically update active so the pill label flips immediately.
      setData((prev) => (prev ? { ...prev, active: m.kind } : prev));
      router.push(dest);
      router.refresh();
    } catch {
      setSwitching(null);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
        title="Switch workspace"
        data-testid="workspace-switcher"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span aria-hidden>{icon}</span>
        <span>{label ?? "Workspace"}</span>
        <span aria-hidden className="text-slate-400">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Switch workspace"
          className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-lg z-50 overflow-hidden"
        >
          <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Switch to
          </p>
          <ul className="py-1">
            {orderMemberships(data.memberships).map((m) => {
              const isActive = m.kind === data.active;
              const tag = m.kind === "squad" ? `${m.kind}:${m.kind_id}` : m.kind;
              // Squads lead with team name (display_label); base kinds lead
              // with their kind label.
              const primary =
                m.kind === "squad"
                  ? m.display_label
                  : (KIND_LABEL[m.kind] ?? m.kind);
              const secondary =
                m.kind === "squad"
                  ? KIND_LABEL.squad
                  : m.display_label && m.display_label !== KIND_LABEL[m.kind]
                  ? m.display_label
                  : null;
              return (
                <li key={`${m.kind}-${m.kind_id}`}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => switchTo(m)}
                    disabled={switching !== null}
                    className={`w-full text-left flex items-start gap-2 px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-emerald-50 text-emerald-900"
                        : "hover:bg-slate-50 text-slate-800"
                    } ${
                      switching && switching !== tag ? "opacity-50" : ""
                    }`}
                  >
                    <span aria-hidden className="text-base">
                      {KIND_ICON[m.kind] ?? "•"}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold truncate">
                        {primary}
                      </span>
                      {secondary && (
                        <span className="block text-xs text-slate-500 truncate">
                          {secondary}
                        </span>
                      )}
                    </span>
                    {isActive && (
                      <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mt-0.5">
                        Active
                      </span>
                    )}
                    {switching === tag && (
                      <span className="text-[10px] text-slate-400 mt-0.5">…</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-slate-100 px-3 py-2">
            <Link
              href="/account/upgrade"
              onClick={() => setOpen(false)}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              + Add another workspace →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
