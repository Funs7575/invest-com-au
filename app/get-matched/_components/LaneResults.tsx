"use client";

/**
 * LaneResults — Decision Engine P5 result surface.
 *
 * Renders the composite lane resolution: the hero lane as a full block, each
 * composite secondary as a smaller block, every block carrying its factual
 * "why this is here" reasons, plus the "My Options" rail (share-token-saved
 * shortlist — saving is never contacting; single-lead holds at confirm).
 *
 * Additive: sits above the existing action-plan checklist; removes nothing.
 * Data-driven: only renders when resolve returns `lanes` (same build), so
 * there are no half-states on older bundles.
 */
import { useState } from "react";
import Link from "next/link";
import type { LaneResolution, RankedLane, LaneKind } from "@/lib/getmatched/resolve-lanes";
import type { SavedItem, TopMatch } from "@/lib/getmatched/types";
import ConnectAdvisorModal from "./ConnectAdvisorModal";

interface Props {
  resolution: LaneResolution;
  topMatches: TopMatch[];
  planId: number | null;
  shareToken: string | null;
  ephemeral: boolean;
  initialSaved?: SavedItem[];
  /** Quiz-style need slug for lead attribution (e.g. "financial-planner"). */
  advisorType?: string | null;
}

const LANE_TITLES: Record<LaneKind, string> = {
  advisor: "Talk to the right professional",
  listings: "Browse matching opportunities",
  platforms: "Compare platforms yourself",
  brief: "Describe it once — let professionals respond",
  education: "Learn first, decide later",
};

const LANE_HREFS: Record<LaneKind, string> = {
  advisor: "/advisors",
  listings: "/invest",
  platforms: "/compare",
  brief: "/briefs/new",
  education: "/guides",
};

const LANE_CTAS: Record<LaneKind, string> = {
  advisor: "Browse all advisors",
  listings: "See matching opportunities",
  platforms: "Open the comparison",
  brief: "Start a brief",
  education: "Open the guides",
};

function itemKey(i: { kind: string; ref: string }) {
  return `${i.kind}:${i.ref}`;
}

export default function LaneResults({
  resolution,
  topMatches,
  planId,
  shareToken,
  ephemeral,
  initialSaved = [],
  advisorType = null,
}: Props) {
  const [saved, setSaved] = useState<SavedItem[]>(initialSaved);
  const [saveError, setSaveError] = useState<string | null>(null);
  // P6 in-funnel connect: ONE lead → ONE advisor. Once connected, every other
  // Connect button is removed (browse/save stay available).
  const [connecting, setConnecting] = useState<TopMatch | null>(null);
  const [connectedSlug, setConnectedSlug] = useState<string | null>(null);
  // P7: side-by-side comparison of the ranked matches. Compare ≠ contact —
  // single-lead still only happens at the explicit Connect confirm.
  const [comparing, setComparing] = useState(false);
  const canSave = !ephemeral && planId != null && !!shareToken;

  const advisors = topMatches.filter((m) => m.kind === "advisor");
  const heroLane = resolution.lanes.find((l) => l.kind === resolution.hero) ?? null;
  const secondaryLanes = resolution.secondary
    .map((k) => resolution.lanes.find((l) => l.kind === k))
    .filter((l): l is RankedLane => !!l);

  async function toggleSave(item: { kind: SavedItem["kind"]; ref: string; label?: string }) {
    if (!canSave) return;
    const exists = saved.some((s) => itemKey(s) === itemKey(item));
    const action = exists ? "remove" : "add";
    // Optimistic update; revert on failure.
    const prev = saved;
    setSaved(
      exists
        ? saved.filter((s) => itemKey(s) !== itemKey(item))
        : [...saved, { ...item, saved_at: new Date().toISOString() }],
    );
    setSaveError(null);
    try {
      const res = await fetch(`/api/get-matched/plans/${planId}/save-item`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ share_token: shareToken, action, item }),
      });
      if (!res.ok) throw new Error(`save ${res.status}`);
      const data = (await res.json()) as { saved_items?: SavedItem[] };
      if (Array.isArray(data.saved_items)) setSaved(data.saved_items);
    } catch {
      setSaved(prev);
      setSaveError("Couldn't update your options — please try again.");
    }
  }

  function LaneBlock({ lane, hero }: { lane: RankedLane; hero: boolean }) {
    return (
      <section
        aria-label={LANE_TITLES[lane.kind]}
        className={`rounded-2xl border p-4 md:p-5 ${
          hero ? "border-amber-300 bg-gradient-to-br from-amber-50/70 to-white shadow-sm" : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className={`font-bold text-slate-900 ${hero ? "text-lg" : "text-sm"}`}>
            {LANE_TITLES[lane.kind]}
          </h3>
          {hero && resolution.secondary.length > 0 && (
            <span className="shrink-0 text-[0.62rem] font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800">
              Best next step
            </span>
          )}
        </div>

        {lane.reasons.length > 0 && (
          <ul className="mt-2 space-y-1" aria-label="Why this is here">
            {lane.reasons.slice(0, 3).map((reason) => (
              <li key={reason} className="flex items-start gap-1.5 text-xs text-slate-600">
                <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                {reason}
              </li>
            ))}
          </ul>
        )}

        {/* Advisor lane renders the real ranked matches. */}
        {lane.kind === "advisor" && advisors.length > 0 && (
          <ul className="mt-3 space-y-2">
            {advisors.slice(0, hero ? 3 : 1).map((a) => {
              const isSaved = saved.some((s) => s.kind === "advisor" && s.ref === a.slug);
              return (
                <li key={a.slug} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                  {a.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- small avatar, remote domains vary
                    <img src={a.logo_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" aria-hidden="true" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{a.name}</p>
                    <p className="text-xs text-slate-600 truncate">{a.one_line_why}</p>
                  </div>
                  {canSave && (
                    <button
                      onClick={() => toggleSave({ kind: "advisor", ref: a.slug, label: a.name })}
                      aria-pressed={isSaved}
                      className={`shrink-0 px-2.5 py-2 min-h-11 text-xs font-semibold rounded-lg border transition-colors ${
                        isSaved
                          ? "border-amber-400 bg-amber-50 text-amber-800"
                          : "border-slate-200 text-slate-600 hover:border-amber-300"
                      }`}
                    >
                      {isSaved ? "Saved ✓" : "Save"}
                    </button>
                  )}
                  {connectedSlug === a.slug ? (
                    <span className="shrink-0 px-3 py-2 min-h-11 inline-flex items-center bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg">
                      Request sent ✓
                    </span>
                  ) : connectedSlug === null && a.ref_id != null ? (
                    <button
                      onClick={() => setConnecting(a)}
                      className="shrink-0 px-3 py-2 min-h-11 bg-amber-500 text-slate-900 text-xs font-bold rounded-lg hover:bg-amber-600"
                    >
                      Connect
                    </button>
                  ) : null}
                  <Link
                    href={a.cta_href}
                    className="shrink-0 px-3 py-2 min-h-11 inline-flex items-center border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50"
                  >
                    View profile
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {lane.kind === "advisor" && hero && advisors.length >= 2 && (
          <div className="mt-3">
            <button
              onClick={() => setComparing((c) => !c)}
              aria-expanded={comparing}
              className="px-3 py-2 min-h-11 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              {comparing ? "Hide comparison" : `Compare your ${advisors.length} matches side by side`}
            </button>
            {comparing && (
              <div className="mt-3 overflow-x-auto" data-testid="advisor-compare-table">
                <table className="w-full text-left border-separate border-spacing-0 min-w-[560px]">
                  <thead>
                    <tr>
                      <th scope="col" className="sr-only">Attribute</th>
                      {advisors.map((a) => (
                        <th key={a.slug} scope="col" className="px-3 pb-2 align-bottom min-w-[170px]">
                          <span className="block text-sm font-bold text-slate-900">{a.name}</span>
                          {a.rating != null && (
                            <span className="block text-xs text-slate-600">★ {a.rating.toFixed(1)}{a.rating_count ? ` (${a.rating_count})` : ""}</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="align-top">
                    {([
                      ["Why matched", (a: TopMatch) => a.one_line_why],
                      ["Location", (a: TopMatch) => a.location_display ?? "Remote / Australia-wide"],
                      ["Fees", (a: TopMatch) => a.fee_description ?? "Ask in the intro call"],
                      ["Specialties", (a: TopMatch) => (a.specialties_preview?.length ? a.specialties_preview.join(" · ") : "—")],
                    ] as const).map(([label, get]) => (
                      <tr key={label}>
                        <th scope="row" className="pr-2 py-2 text-[0.65rem] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">{label}</th>
                        {advisors.map((a) => (
                          <td key={a.slug} className="px-3 py-2 text-xs text-slate-700 border-t border-slate-100">{get(a)}</td>
                        ))}
                      </tr>
                    ))}
                    <tr>
                      <th scope="row" className="sr-only">Actions</th>
                      {advisors.map((a) => (
                        <td key={a.slug} className="px-3 py-2 border-t border-slate-100">
                          <Link href={a.cta_href} className="inline-flex px-3 py-2 min-h-11 items-center border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50">
                            View profile
                          </Link>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
                <p className="text-[0.62rem] text-slate-500 mt-1">
                  Comparing never contacts anyone — you choose one advisor when you’re ready.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-3">
          <Link
            href={LANE_HREFS[lane.kind]}
            className={`inline-flex items-center px-4 py-2.5 min-h-11 text-sm font-bold rounded-lg ${
              hero
                ? "bg-amber-500 text-slate-900 hover:bg-amber-600"
                : "border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {LANE_CTAS[lane.kind]} →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-3 mb-6" data-testid="lane-results">
      {heroLane && <LaneBlock lane={heroLane} hero />}
      {secondaryLanes.length > 0 && (
        <p className="text-xs font-semibold text-slate-500 pt-1">
          Your situation points more than one way — both paths below are real options:
        </p>
      )}
      {secondaryLanes.map((lane) => (
        <LaneBlock key={lane.kind} lane={lane} hero={false} />
      ))}

      {/* My Options rail */}
      {canSave && saved.length > 0 && (
        <aside aria-label="My options" className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-bold text-slate-700 mb-2">My options ({saved.length})</p>
          <ul className="flex flex-wrap gap-1.5">
            {saved.map((s) => (
              <li key={itemKey(s)} className="flex items-center gap-1 bg-white border border-slate-200 rounded-full pl-2.5 pr-1 py-1 text-xs text-slate-700">
                {s.label ?? s.ref}
                <button
                  onClick={() => toggleSave({ kind: s.kind, ref: s.ref })}
                  aria-label={`Remove ${s.label ?? s.ref} from my options`}
                  className="w-6 h-6 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <p className="text-[0.62rem] text-slate-500 mt-2">
            Saved to your plan — revisit any time via your plan link. Saving never contacts anyone.
          </p>
        </aside>
      )}
      {saveError && <p role="alert" className="text-xs text-red-600">{saveError}</p>}

      {connectedSlug && (
        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          Introduction sent — your advisor will reach out shortly. One advisor only; your other options stay saved here.
        </p>
      )}

      {connecting && (
        <ConnectAdvisorModal
          advisor={connecting}
          planId={planId}
          shareToken={shareToken}
          advisorType={advisorType}
          onClose={() => setConnecting(null)}
          onConnected={() => setConnectedSlug(connecting.slug)}
        />
      )}
    </div>
  );
}
