export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function getMostRecentFeeCheck(brokers: { fee_last_checked?: string | null }[]): string | null {
  let latest: string | null = null;
  for (const b of brokers) {
    if (b.fee_last_checked && (!latest || b.fee_last_checked > latest)) {
      latest = b.fee_last_checked;
    }
  }
  return latest;
}

/**
 * Supported {@link formatDate} output styles.
 *
 * - `short`        — `4 Jan 2026`             (day: numeric, month: short, year: numeric)
 * - `short-year`   — `4 Jan 26`               (day: numeric, month: short, year: 2-digit)
 * - `short-time`   — `4 Jan 2026, 3:05 pm`    (short + hour + minute)
 * - `long`         — `4 January 2026`         (day: numeric, month: long, year: numeric)
 * - `numeric`      — `04/01/2026`             (zero-padded DD/MM/YYYY — load-bearing for invoice/PDF rendering)
 */
export type FormatDateStyle = "short" | "short-year" | "short-time" | "long" | "numeric";

/**
 * Format an ISO date string for display in en-AU locale.
 *
 * Single source of truth for date formatting across the app — replaces ~12 local
 * re-implementations that drifted in subtle ways (locale, output shape, null handling).
 *
 * @param iso - ISO 8601 date string. If null/undefined and `fallback` is provided, returns `fallback`.
 * @param options - Optional formatting options.
 * @param options.style - Output style (default `short`). See {@link FormatDateStyle}.
 * @param options.fallback - String returned when `iso` is null/undefined (default `""`).
 * @returns The formatted date, or `fallback` when input is nullish.
 *
 * @example
 *   formatDate("2026-01-04")                                  // "4 Jan 2026"
 *   formatDate("2026-01-04", { style: "long" })               // "4 January 2026"
 *   formatDate("2026-01-04", { style: "numeric" })            // "04/01/2026"
 *   formatDate(null, { fallback: "—" })                       // "—"
 */
export function formatDate(
  iso: string | null | undefined,
  options: { style?: FormatDateStyle; fallback?: string } = {},
): string {
  const { style = "short", fallback = "" } = options;
  if (!iso) return fallback;
  const d = new Date(iso);
  if (style === "numeric") {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }
  const intlOptions: Intl.DateTimeFormatOptions = (() => {
    switch (style) {
      case "short-year":
        return { day: "numeric", month: "short", year: "2-digit" };
      case "short-time":
        return {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        };
      case "long":
        return { day: "numeric", month: "long", year: "numeric" };
      case "short":
      default:
        return { day: "numeric", month: "short", year: "numeric" };
    }
  })();
  return d.toLocaleDateString("en-AU", intlOptions);
}
