/* Premium columns (quarterly_reports.sections / fee_changes_summary /
 * new_entrants, newsletter_editions.html_content) are revoked from
 * anon + authenticated at the column-GRANT layer (migration
 * 20260517_w2_17_premium_content_column_grants.sql). Reading them
 * requires service-role; this module is the single audited choke-point
 * that does so and gates by isPro before returning. Matches the
 * CLAUDE.md exception category "lib/* helpers that intentionally
 * bypass deny-all RLS for security isolation". */
// eslint-disable-next-line no-restricted-imports -- see block comment above
import { createAdminClient } from "@/lib/supabase/admin";
import type { QuarterlyReport } from "@/lib/types";
import { requirePro, truncateText, truncateHtml } from "./require-pro";

const NEWSLETTER_TEASER_CHARS = 800;
const REPORT_TEASER_SECTIONS = 2;
const REPORT_TEASER_CHARS = 240;

function truncateForNonPro(html: string, maxChars: number): string {
  if (!html) return "";
  const visibleLen = html.replace(/<[^>]*>/g, "").length;
  // Cap at the smaller of the configured ceiling or half the original
  // length, with a floor of ~80 chars so very tiny digests still emit
  // a coherent fragment rather than an empty string. The `- 1` keeps
  // `cap` strictly less than the visible length even when the floor
  // dominates, so `truncateHtml` always actually truncates (its
  // shortcut path returns the input verbatim when visible-chars are
  // already at or below the requested max).
  const cap = Math.max(
    1,
    Math.min(maxChars, Math.max(80, Math.floor(visibleLen / 2)), visibleLen - 1),
  );
  return truncateHtml(html, cap);
}

export interface NewsletterEditionRow {
  id: number;
  edition_date: string;
  subject: string;
  html_content: string;
  fee_changes_count: number;
  articles_count: number;
  deals_count: number;
  created_at: string;
  status?: string;
}

export interface GatedReport {
  report: QuarterlyReport | null;
  isPro: boolean;
  totals: { sections: number; feeChanges: number; newEntrants: number };
}

export interface GatedNewsletter {
  edition: NewsletterEditionRow | null;
  isPro: boolean;
  truncatedHtml: string;
}

// Premium-column reads (sections, fee_changes_summary, new_entrants on
// quarterly_reports; html_content on newsletter_editions) are denied to
// anon/authenticated at the column-GRANT layer (migration
// 20260517_w2_17_premium_content_column_grants.sql). This helper is the
// single audited choke-point that uses the admin client to read those
// columns server-side and strips them from the response payload for
// non-Pro callers. Premium content never reaches the browser unless
// `isPro` is true.

export async function getGatedReport(slug: string): Promise<GatedReport> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("quarterly_reports")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (!data) {
    return {
      report: null,
      isPro: false,
      totals: { sections: 0, feeChanges: 0, newEntrants: 0 },
    };
  }

  const full = data as QuarterlyReport;
  const { isPro } = await requirePro();

  const totals = {
    sections: (full.sections ?? []).length,
    feeChanges: (full.fee_changes_summary ?? []).length,
    newEntrants: (full.new_entrants ?? []).length,
  };

  const report: QuarterlyReport = isPro
    ? full
    : {
        ...full,
        sections: (full.sections ?? [])
          .slice(0, REPORT_TEASER_SECTIONS)
          .map((s) => ({
            heading: s.heading,
            body: truncateText(s.body, REPORT_TEASER_CHARS),
          })),
        fee_changes_summary: [],
        new_entrants: [],
      };

  return { report, isPro, totals };
}

export async function getGatedNewsletter(
  editionDate: string,
): Promise<GatedNewsletter> {
  const supabase = createAdminClient();
  // status='sent' filter must be carried explicitly here — the
  // anon-client RLS policy used to enforce it for free, but this
  // helper now uses the service-role client which bypasses RLS.
  // Without this filter, draft / scheduled editions with guessable
  // dates would render via /newsletter/[edition].
  const { data } = await supabase
    .from("newsletter_editions")
    .select("*")
    .eq("edition_date", editionDate)
    .eq("status", "sent")
    .single();

  if (!data) {
    return { edition: null, isPro: false, truncatedHtml: "" };
  }

  const full = data as NewsletterEditionRow;
  const { isPro } = await requirePro();

  // For non-Pro readers, force a teaser boundary even on short or
  // sparse editions. `truncateHtml` returns its input unchanged when
  // the visible-char count is at or below the max, which would let a
  // short digest bypass the paywall entirely. Capping at half the
  // original length (or the teaser ceiling, whichever is smaller)
  // guarantees the non-Pro response always omits some content.
  const visibleSource = isPro
    ? full.html_content
    : truncateForNonPro(full.html_content, NEWSLETTER_TEASER_CHARS);

  const safeEdition: NewsletterEditionRow = isPro
    ? full
    : { ...full, html_content: visibleSource };

  return { edition: safeEdition, isPro, truncatedHtml: visibleSource };
}
