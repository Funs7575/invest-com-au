/**
 * Per-Adviser Embed Kit — shared metadata + snippet builders.
 *
 * Single source of truth for the three self-serve embeds advisers paste
 * onto their own websites (rating badge, reviews carousel, booking
 * button). Consumed by:
 *
 *   - /api/widget/advisor-embed         (the embed server — lib/widget JS)
 *   - /api/advisor-portal/embed-kit     (authed snippet/token mint)
 *   - app/advisor-portal/WidgetBuilderTab ("Your profile embeds" panel)
 *
 * Keep URL/UTM construction here so the portal snippet, the served JS and
 * the tests can never drift apart.
 */

import { SITE_URL } from "@/lib/seo";

export const ADVISOR_EMBED_TYPES = ["badge", "reviews", "book"] as const;
export type AdvisorEmbedType = (typeof ADVISOR_EMBED_TYPES)[number];

export function isAdvisorEmbedType(v: string | null | undefined): v is AdvisorEmbedType {
  return v === "badge" || v === "reviews" || v === "book";
}

export const ADVISOR_EMBED_THEMES = ["light", "dark", "auto"] as const;
export type AdvisorEmbedTheme = (typeof ADVISOR_EMBED_THEMES)[number];

export function normaliseAdvisorEmbedTheme(v: string | null | undefined): AdvisorEmbedTheme {
  return v === "dark" || v === "auto" ? v : "light";
}

export interface AdvisorEmbedMeta {
  type: AdvisorEmbedType;
  label: string;
  description: string;
  /** Default height for the iframe variant (px). */
  iframeHeight: number;
  /** Max-width hint for the iframe variant (px). */
  iframeMaxWidth: number;
}

export const ADVISOR_EMBED_KIT: ReadonlyArray<AdvisorEmbedMeta> = [
  {
    type: "badge",
    label: "Rating badge",
    description:
      "Your live star rating and verified review count — updates automatically as new reviews are approved.",
    iframeHeight: 76,
    iframeMaxWidth: 360,
  },
  {
    type: "reviews",
    label: "Reviews carousel",
    description:
      "Your most recent published client reviews in a compact carousel, exactly as they appear on your profile.",
    iframeHeight: 312,
    iframeMaxWidth: 420,
  },
  {
    type: "book",
    label: "Booking button",
    description:
      "A “Book a consultation” button that deep-links to the booking section of your invest.com.au profile.",
    iframeHeight: 88,
    iframeMaxWidth: 320,
  },
] as const;

export function advisorEmbedMeta(type: AdvisorEmbedType): AdvisorEmbedMeta {
  // ADVISOR_EMBED_KIT covers every member of the union — the find can
  // only miss if the two constants drift, which the unit test pins.
  const meta = ADVISOR_EMBED_KIT.find((m) => m.type === type);
  if (!meta) throw new Error(`Unknown advisor embed type: ${type}`);
  return meta;
}

/**
 * UTM query for outbound profile links inside an embed. Matches the
 * agreed attribution contract: utm_source=embed & utm_medium=<type> &
 * advisor=<slug> (+ a campaign so GA-style tools group the kit).
 */
export function advisorEmbedUtmQuery(type: AdvisorEmbedType, slug: string): string {
  const q = new URLSearchParams({
    utm_source: "embed",
    utm_medium: type,
    utm_campaign: "advisor-embed-kit",
    advisor: slug,
  });
  return q.toString();
}

/** Absolute URL the embed snippet loads (JS by default, HTML wrapper for iframes). */
export function advisorEmbedUrl(opts: {
  type: AdvisorEmbedType;
  slug: string;
  token: string;
  theme?: AdvisorEmbedTheme;
  format?: "js" | "html";
}): string {
  const q = new URLSearchParams({
    type: opts.type,
    slug: opts.slug,
    token: opts.token,
  });
  if (opts.theme && opts.theme !== "light") q.set("theme", opts.theme);
  if (opts.format === "html") q.set("format", "html");
  return `${SITE_URL}/api/widget/advisor-embed?${q.toString()}`;
}

export interface AdvisorEmbedSnippet {
  type: AdvisorEmbedType;
  label: string;
  description: string;
  /** `<script …>` variant — recommended; sizes itself to content. */
  scriptHtml: string;
  /** `<iframe …>` variant — for site builders that strip script tags. */
  iframeHtml: string;
  /** HTML-wrapper URL, used for the portal live preview iframe. */
  previewUrl: string;
}

/**
 * Build the copy-paste snippets for every embed type. Pure — safe to call
 * from API routes and client components alike.
 */
export function buildAdvisorEmbedSnippets(opts: {
  slug: string;
  token: string;
  theme?: AdvisorEmbedTheme;
}): AdvisorEmbedSnippet[] {
  const theme = opts.theme ?? "light";
  return ADVISOR_EMBED_KIT.map((meta) => {
    const jsUrl = advisorEmbedUrl({
      type: meta.type,
      slug: opts.slug,
      token: opts.token,
      theme,
    });
    const htmlUrl = advisorEmbedUrl({
      type: meta.type,
      slug: opts.slug,
      token: opts.token,
      theme,
      format: "html",
    });
    const title = `${meta.label} — invest.com.au`;
    return {
      type: meta.type,
      label: meta.label,
      description: meta.description,
      scriptHtml:
        `<!-- invest.com.au ${meta.label.toLowerCase()} -->\n` +
        `<script src="${jsUrl}" async></script>`,
      iframeHtml:
        `<!-- invest.com.au ${meta.label.toLowerCase()} -->\n` +
        `<iframe src="${htmlUrl}"\n` +
        `  title="${title}"\n` +
        `  loading="lazy"\n` +
        `  width="100%" height="${meta.iframeHeight}"\n` +
        `  style="border:0;max-width:${meta.iframeMaxWidth}px;display:block;"\n` +
        `></iframe>`,
      previewUrl: htmlUrl,
    };
  });
}
