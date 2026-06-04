"use client";

/**
 * SquadSubNav — cross-navigation for the members-only Pro Squad working
 * surfaces (P2-3). Previously each of inbox / dashboard / availability /
 * settings·ops / settings·intake / referrals was reachable only by direct
 * URL or a single per-page breadcrumb back to the public profile — there was
 * no way to hop between them.
 *
 * Rendered by app/teams/[slug]/layout.tsx, so it wraps every /teams/[slug]/*
 * route INCLUDING the public, indexed team profile (/teams/[slug]) and the
 * quote-builder / topic pages. We must NOT show members-only links on those,
 * so the bar only renders when the current path is one of the member
 * sub-routes below. It is nav-only and does not gate access — each child page
 * keeps its own auth/membership check.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SubNavItem {
  segment: string; // path suffix after /teams/<slug>
  label: string;
}

// Only these member surfaces get the sub-nav. Keep in sync with the routes
// that actually exist under app/teams/[slug]/.
const ITEMS: SubNavItem[] = [
  { segment: "inbox", label: "Inbox" },
  { segment: "dashboard", label: "Dashboard" },
  { segment: "availability", label: "Availability" },
  { segment: "settings/ops", label: "Ops" },
  { segment: "settings/intake", label: "Intake" },
  { segment: "referrals", label: "Referrals" },
];

export default function SquadSubNav() {
  const pathname = usePathname() ?? "";

  // Expect /teams/<slug>/<rest...>. Bail (render nothing) for the public
  // profile (no <rest>) or any route that isn't a tracked member surface.
  const match = /^\/teams\/([^/]+)\/(.+)$/.exec(pathname);
  if (!match) return null;
  const slug = match[1];
  const rest = match[2];

  const active = ITEMS.find(
    (it) => rest === it.segment || rest.startsWith(`${it.segment}/`),
  );
  if (!active) return null;

  return (
    <nav
      aria-label="Pro Squad sections"
      className="bg-white border-b border-slate-200"
    >
      <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
        {ITEMS.map((it) => {
          const isActive = it.segment === active.segment;
          return (
            <Link
              key={it.segment}
              href={`/teams/${slug}/${it.segment}`}
              aria-current={isActive ? "page" : undefined}
              className={`px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-inset ${
                isActive
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
