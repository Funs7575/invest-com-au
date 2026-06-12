/**
 * OptionsBoard — Decision Engine §4 "cross-lane options board" (P7b).
 *
 * One compact screen putting the user's available paths side by side:
 * their matched advisor, their matched listings, and a DIY platform pick.
 * These are NOT substitutes — the header carries the honest, general-info
 * framing that explains how the paths differ.
 *
 * Pure presentational + props-driven (no fetch, no state). It renders only
 * when at least two *kinds* of content are available, so a single-lane
 * result never shows a one-row "board". No new lead paths: every CTA here
 * is a plain link to an existing surface (profile / listing / review) —
 * saving and contacting still happen via the existing flows elsewhere.
 *
 * General information only — not financial advice or a recommendation to
 * invest. Listing rows are factual criteria matches, never endorsements.
 */
import Link from "next/link";
import type { ListingMatch, SavedItem, TopMatch } from "@/lib/getmatched/types";
import { formatAnnualFee } from "@/lib/getmatched/fee-projection";

export interface OptionsBoardProps {
  /** Ranked advisor matches (TopMatch kind "advisor"). */
  advisors?: TopMatch[];
  /** Specific scored listings (factual criteria matches). */
  listings?: ListingMatch[];
  /** DIY platform/broker matches (TopMatch kind "broker"). */
  platforms?: TopMatch[];
  /**
   * Saved-options shortlist. On the live result screen this supplements the
   * live matches; on the durable plan hub (which only has the persisted
   * shortlist) saved items spanning ≥2 kinds are themselves the board.
   */
  saved?: SavedItem[];
}

type LaneRowKind = "advisor" | "listing" | "platform";

const SAVED_KIND_LABEL: Record<SavedItem["kind"], string> = {
  advisor: "Advisor",
  listing: "Listing",
  platform: "Platform",
};

/** "commercial_property" / "venture-capital" → "commercial property". */
function prettyVertical(v: string): string {
  return v.replace(/[-_]/g, " ");
}

function listingCriteriaLine(l: ListingMatch): string {
  const parts = [prettyVertical(l.vertical)];
  if (l.location_state) parts.push(l.location_state);
  if (l.price_display) parts.push(l.price_display);
  return parts.join(" · ");
}

/**
 * Which live-match content kinds are present (advisor / listing / platform).
 * A kind counts when it has at least one item.
 */
export function presentKinds(props: OptionsBoardProps): LaneRowKind[] {
  const kinds: LaneRowKind[] = [];
  if ((props.advisors?.length ?? 0) > 0) kinds.push("advisor");
  if ((props.listings?.length ?? 0) > 0) kinds.push("listing");
  if ((props.platforms?.length ?? 0) > 0) kinds.push("platform");
  return kinds;
}

/** Distinct kinds within the persisted saved shortlist. */
export function savedKinds(saved: SavedItem[] = []): SavedItem["kind"][] {
  const seen = new Set<SavedItem["kind"]>();
  for (const s of saved) seen.add(s.kind);
  return Array.from(seen);
}

/**
 * The board renders when the user has ≥2 kinds of content. On the result
 * screen that means ≥2 live-match lanes; on the hub it means a saved
 * shortlist spanning ≥2 kinds. Returns false otherwise (the caller renders
 * nothing).
 */
export function shouldRenderBoard(props: OptionsBoardProps): boolean {
  return presentKinds(props).length >= 2 || savedKinds(props.saved).length >= 2;
}

export default function OptionsBoard(props: OptionsBoardProps) {
  const { advisors = [], listings = [], platforms = [], saved = [] } = props;
  const liveKinds = presentKinds(props);

  // Render rule: hide entirely with fewer than two kinds of content. On the
  // hub there are no live matches — fall back to the saved shortlist when it
  // spans ≥2 kinds.
  if (!shouldRenderBoard(props)) return null;

  const liveMode = liveKinds.length >= 2;

  const advisor = advisors[0];
  const listing = listings[0];
  const platform = platforms.find((p) => p.kind === "broker") ?? platforms[0];

  // Saved-only board (hub): group the persisted shortlist by kind.
  if (!liveMode) {
    return <SavedBoard saved={saved} />;
  }

  return (
    <section
      aria-label="Your options board"
      data-testid="options-board"
      className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 mb-6"
    >
      <h3 className="text-lg font-bold text-slate-900">Your options board</h3>
      <p className="mt-1 text-sm text-slate-600">
        Your situation opens more than one path. These aren’t substitutes —
        here’s how they fit together so you can weigh them side by side.
      </p>
      {/* Honest framing — the §4 explainer (general info, not advice). */}
      <p className="mt-2 text-xs text-slate-500">
        An advisor advises under their own licence; a platform is DIY; a listing
        is a specific opportunity. General information only — not financial
        advice or a recommendation to invest.
      </p>

      <ul className="mt-4 space-y-2.5">
        {advisor && (
          <li
            data-testid="board-row-advisor"
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
          >
            <RowLabel label="Advisor" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{advisor.name}</p>
              <p className="text-xs text-slate-600 truncate">{advisor.one_line_why}</p>
            </div>
            <Link
              href={advisor.cta_href}
              className="shrink-0 px-3 py-2 min-h-11 inline-flex items-center border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50"
            >
              View profile
            </Link>
          </li>
        )}

        {listing && (
          <li
            data-testid="board-row-listing"
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
          >
            <RowLabel label="Listing" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{listing.title}</p>
              <p className="text-xs text-slate-600 truncate capitalize">
                {listingCriteriaLine(listing)}
              </p>
            </div>
            <Link
              href={listing.href}
              className="shrink-0 px-3 py-2 min-h-11 inline-flex items-center border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50"
            >
              View
            </Link>
          </li>
        )}

        {platform && (
          <li
            data-testid="board-row-platform"
            className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"
          >
            <RowLabel label="Platform" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{platform.name}</p>
              <p className="text-xs text-slate-600 truncate">
                {platform.fee_projection
                  ? `≈ ${formatAnnualFee(platform.fee_projection)} · ${platform.fee_projection.assumptionLabel}`
                  : platform.one_line_why}
              </p>
            </div>
            <Link
              href={platform.cta_href}
              className="shrink-0 px-3 py-2 min-h-11 inline-flex items-center border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50"
            >
              See review
            </Link>
          </li>
        )}
      </ul>
    </section>
  );
}

/**
 * Hub variant: the durable plan page has only the persisted shortlist, so
 * the board groups saved items by kind. Same honest framing; one row per
 * kind, listing the saved labels (no per-item deep links — the items were
 * saved from surfaces that own their own CTAs).
 */
function SavedBoard({ saved }: { saved: SavedItem[] }) {
  const order: SavedItem["kind"][] = ["advisor", "listing", "platform"];
  const groups = order
    .map((kind) => ({ kind, items: saved.filter((s) => s.kind === kind) }))
    .filter((g) => g.items.length > 0);

  return (
    <section
      aria-label="Your options board"
      data-testid="options-board"
      className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 mb-6"
    >
      <h3 className="text-lg font-bold text-slate-900">Your options board</h3>
      <p className="mt-1 text-sm text-slate-600">
        You’ve saved more than one kind of path. These aren’t substitutes —
        here’s how they fit together so you can weigh them side by side.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        An advisor advises under their own licence; a platform is DIY; a listing
        is a specific opportunity. General information only — not financial
        advice or a recommendation to invest.
      </p>

      <ul className="mt-4 space-y-2.5">
        {groups.map((g) => (
          <li
            key={g.kind}
            data-testid={`board-row-${g.kind}`}
            className="flex items-start gap-3 rounded-xl border border-slate-200 p-3"
          >
            <RowLabel label={SAVED_KIND_LABEL[g.kind]} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">
                {g.items.length} saved
              </p>
              <p className="text-xs text-slate-600">
                {g.items.map((s) => s.label ?? s.ref).join(" · ")}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RowLabel({ label }: { label: string }) {
  return (
    <span className="shrink-0 w-20 text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">
      {label}
    </span>
  );
}
