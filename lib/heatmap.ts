/**
 * Heatmap colour helper for comparison tables.
 *
 * Quintile bucketing into Tailwind colour scale. Always pair the returned class
 * with a corner glyph (◆ best / ◇ worst) and an ARIA label for WCAG 1.4.11
 * (info-by-colour-only fails). Cells with `value=null` get the neutral slate
 * class — never compete on absolute number when source data is missing.
 *
 * Polarity:
 *   "higher-better" → larger raw value gets the greener class (e.g. rating).
 *   "lower-better"  → smaller raw value gets the greener class (e.g. fee).
 */

export type HeatmapPolarity = "higher-better" | "lower-better";

/**
 * Returned class names use the standard Tailwind palette so they stay JIT-safe
 * and discoverable. The strings are listed verbatim below in HEATMAP_CLASSES so
 * the Tailwind content scanner picks them up even when the class is computed.
 */
export const HEATMAP_CLASSES = {
  null: "bg-slate-50 text-slate-700",
  // 5-bucket scale, 0 = best end → 4 = worst end
  best: [
    "bg-emerald-200 text-emerald-900",
    "bg-emerald-100 text-emerald-900",
    "bg-emerald-50 text-emerald-900",
    "bg-amber-50 text-amber-900",
    "bg-rose-100 text-rose-900",
  ],
} as const;

/**
 * Glyph paired with the colour for accessibility — call alongside `tableCellColor`
 * and render in a `<sup aria-hidden>`. The aria-label belongs on the cell itself.
 */
export const HEATMAP_GLYPHS = {
  best: "◆",
  worst: "◇",
  middle: "",
  unknown: "—",
} as const;

export interface HeatmapDecoration {
  className: string;
  glyph: string;
  /** 0-based bucket index (0=best, 4=worst), -1 when unknown */
  bucket: number;
  /** Human-readable rank string for ARIA labels — e.g. "rank 1 of 5" */
  ariaRank: string;
}

/**
 * Map a value into one of 5 colour buckets relative to the (min, max) range
 * for its row. Returns the Tailwind class only — never inline style — so the
 * design-token swap stays Tailwind-config-driven.
 */
export function tableCellColor(
  value: number | null | undefined,
  min: number,
  max: number,
  polarity: HeatmapPolarity = "higher-better",
): string {
  return decorate(value, min, max, polarity).className;
}

/**
 * Full decoration (class + glyph + bucket + aria) for cell-level rendering.
 * Use this when the renderer needs the glyph or the bucket index.
 */
export function decorate(
  value: number | null | undefined,
  min: number,
  max: number,
  polarity: HeatmapPolarity = "higher-better",
): HeatmapDecoration {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return {
      className: HEATMAP_CLASSES.null,
      glyph: HEATMAP_GLYPHS.unknown,
      bucket: -1,
      ariaRank: "data unavailable",
    };
  }
  if (max === min) {
    // All values identical — no winner; render neutral.
    return {
      className: HEATMAP_CLASSES.null,
      glyph: HEATMAP_GLYPHS.middle,
      bucket: 2,
      ariaRank: "tied across all rows",
    };
  }
  // Normalise to 0..1 with polarity flip
  const norm = polarity === "lower-better"
    ? 1 - (value - min) / (max - min)
    : (value - min) / (max - min);
  // Clamp + bucket into 5 quintiles. bucket 0 = best, 4 = worst.
  const clamped = Math.min(1, Math.max(0, norm));
  // Higher norm = better → reverse so bucket 0 = top of palette (greenest)
  const bucket = Math.min(4, Math.max(0, Math.floor((1 - clamped) * 5)));
  const className =
    HEATMAP_CLASSES.best[bucket] ?? HEATMAP_CLASSES.best[2] ?? HEATMAP_CLASSES.null;
  let glyph: string = HEATMAP_GLYPHS.middle;
  if (bucket === 0) glyph = HEATMAP_GLYPHS.best;
  else if (bucket === 4) glyph = HEATMAP_GLYPHS.worst;
  return {
    className,
    glyph,
    bucket,
    ariaRank: `bucket ${bucket + 1} of 5`,
  };
}

/**
 * Convenience for whole-row decoration when you have the array of values
 * already and want each cell's decoration in one pass.
 */
export function decorateRow(
  values: ReadonlyArray<number | null | undefined>,
  polarity: HeatmapPolarity = "higher-better",
): HeatmapDecoration[] {
  const numeric = values.filter(
    (v): v is number => typeof v === "number" && !Number.isNaN(v),
  );
  if (numeric.length === 0) {
    return values.map(() => decorate(null, 0, 0, polarity));
  }
  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  return values.map((v) => decorate(v, min, max, polarity));
}
