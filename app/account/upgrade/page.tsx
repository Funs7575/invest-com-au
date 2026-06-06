/**
 * /account/upgrade — context-aware "add another workspace" hub.
 *
 * Lists every workspace kind the signed-in user does NOT already hold,
 * with a short pitch + direct CTA into that kind's onboarding flow. Held
 * kinds collapse to a dimmed "Already active" tile that links to the
 * portal instead.
 *
 * This is the consolidation point for the previously-scattered upgrade
 * paths (the only first-party path before was the business-upgrade form
 * at /account/upgrade/business). Adding a hub means the WorkspaceSwitcher
 * footer link, the AccountKindCards CTA, and the multi-kind onboarding
 * funnel all converge here.
 *
 * Compliance note: no AFSL-licensed copy on this page — it's first-party
 * onboarding, not financial advice.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getKindsForUser, type WorkspaceKind } from "@/lib/account-kinds";
import InvestorProCheckout from "./InvestorProCheckout";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Add a workspace — Invest.com.au",
  robots: { index: false, follow: false },
};

interface KindPitch {
  kind: WorkspaceKind;
  label: string;
  icon: string;
  tagline: string;
  description: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
  portalHref: string;
  tone: string;
}

const PITCHES: KindPitch[] = [
  {
    kind: "investor",
    label: "Investor",
    icon: "📈",
    tagline: "The default workspace — everyone holds one.",
    description:
      "Holdings, watchlist, saved searches and scoring. Every signed-in user has an investor workspace; if you don't see it active, just visit /account.",
    bullets: [
      "Holdings tracker + portfolio insights",
      "Watchlist + price-move alerts",
      "Saved searches across share/crypto/super",
    ],
    ctaLabel: "Open investor workspace",
    ctaHref: "/account",
    portalHref: "/account",
    tone: "bg-emerald-50 border-emerald-200 hover:border-emerald-400",
  },
  {
    kind: "advisor",
    label: "Pro (advisor)",
    icon: "🧑‍💼",
    tagline: "List as a financial pro; receive marketplace briefs.",
    description:
      "Set up an advisor profile, get a public listing, and start receiving briefs from member-side users via the Pro Squad marketplace.",
    bullets: [
      "Public advisor profile + verified badge",
      "Lead inbox + brief routing",
      "KPIs, billing, marketplace payouts",
    ],
    ctaLabel: "Join as a pro",
    ctaHref: "/pros/join",
    portalHref: "/advisor-portal",
    tone: "bg-sky-50 border-sky-200 hover:border-sky-400",
  },
  {
    kind: "broker_partner",
    label: "Broker partner",
    icon: "🏦",
    tagline: "Run paid placements + attribution.",
    description:
      "Already have a broker brand? Spin up a partner workspace for campaigns, attribution dashboards and marketplace billing.",
    bullets: [
      "Campaign + placement management",
      "Attribution + conversion analytics",
      "Marketplace billing console",
    ],
    ctaLabel: "Talk to partnerships",
    ctaHref: "/contact?topic=broker_partner",
    portalHref: "/account",
    tone: "bg-amber-50 border-amber-200 hover:border-amber-400",
  },
  {
    kind: "business_owner",
    label: "Business owner",
    icon: "🏢",
    tagline: "Track grants, R&D and sell-business prep.",
    description:
      "Manage a business entity profile alongside your investor workspace. Useful for grants tracking, R&D claim prep and sell-side prep.",
    bullets: [
      "Grants + R&D tracker",
      "Sell-business prep checklists",
      "Business-side comparisons (banking, payroll, super)",
    ],
    ctaLabel: "Add business profile",
    ctaHref: "/account/upgrade/business",
    portalHref: "/business-portal",
    tone: "bg-violet-50 border-violet-200 hover:border-violet-400",
  },
  {
    kind: "listing_owner",
    label: "Listing owner",
    icon: "🏷️",
    tagline: "Sell a business, asset or franchise.",
    description:
      "Create and manage marketplace listings — businesses for sale, commercial property, franchise opportunities — with built-in leads and renewal alerts.",
    bullets: [
      "Multi-vertical listings (business, property, franchise)",
      "Lead inbox + enquiry routing",
      "Renewal alerts + listing analytics",
    ],
    ctaLabel: "Create a listing",
    ctaHref: "/invest/list",
    portalHref: "/invest/my-listings",
    tone: "bg-rose-50 border-rose-200 hover:border-rose-400",
  },
];

export default async function AccountUpgradeHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?next=/account/upgrade");
  }

  const memberships = await getKindsForUser(user.id);
  const heldKinds = new Set<WorkspaceKind>(memberships.map((m) => m.kind));
  // Every signed-in user implicitly holds investor (it's lazy-provisioned).
  heldKinds.add("investor");

  const available = PITCHES.filter((p) => !heldKinds.has(p.kind));
  const alreadyHeld = PITCHES.filter((p) => heldKinds.has(p.kind));

  return (
    <div className="min-h-screen bg-slate-50 py-8 md:py-12">
      <div className="container-custom max-w-5xl">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-3">
          <Link href="/account" className="hover:text-slate-900">
            ← Back to account
          </Link>
        </nav>

        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
            Add another workspace
          </h1>
          <p className="text-sm text-slate-600 mt-2 max-w-2xl">
            You can wear more than one hat on Invest.com.au. Each workspace
            keeps its own data, dashboard and inbox — switch between them
            from the workspace pill in the header.
          </p>
          {memberships.length > 0 && (
            <p className="text-xs text-emerald-700 font-semibold mt-3">
              You currently hold {memberships.length}{" "}
              {memberships.length === 1 ? "workspace" : "workspaces"}.
            </p>
          )}
        </header>

        {/* Investor Pro subscription — surfaced here because it's the most
            common upgrade path from the dashboard. Renders a client component
            that handles plan-toggle + Stripe checkout redirect. */}
        <section className="mb-10">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
            Investor Pro membership
          </h2>
          <InvestorProCheckout />
        </section>

        {available.length > 0 && (
          <section className="mb-10">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
              Available to add
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {available.map((p) => (
                <article
                  key={p.kind}
                  className={`border ${p.tone} rounded-2xl p-5 transition-colors`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-3xl" aria-hidden>
                      {p.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-slate-900">
                        {p.label}
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {p.tagline}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 mb-3">{p.description}</p>
                  <ul className="text-xs text-slate-600 space-y-1 mb-4">
                    {p.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-1.5">
                        <span aria-hidden className="text-slate-400 mt-0.5">
                          •
                        </span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={p.ctaHref}
                    className="inline-flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2"
                  >
                    {p.ctaLabel} →
                  </Link>
                </article>
              ))}
            </div>
          </section>
        )}

        {alreadyHeld.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
              Already active
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {alreadyHeld.map((p) => (
                <Link
                  href={p.portalHref}
                  key={p.kind}
                  className="border border-slate-200 bg-white hover:border-slate-300 rounded-xl p-4 transition-colors flex items-center gap-3"
                >
                  <span className="text-2xl opacity-70" aria-hidden>
                    {p.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {p.label}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      Open this workspace →
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {available.length === 0 && (
          <section className="border border-emerald-200 bg-emerald-50 rounded-2xl p-6 text-center">
            <p className="text-base font-bold text-emerald-900">
              You hold every workspace kind we offer.
            </p>
            <p className="text-sm text-emerald-800 mt-1">
              Nothing left to add — switch between them from the header pill.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
