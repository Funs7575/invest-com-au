import { describe, it, expect } from "vitest";
import {
  tableCellColor,
  decorate,
  decorateRow,
  HEATMAP_CLASSES,
  HEATMAP_GLYPHS,
} from "@/lib/heatmap";

describe("decorate", () => {
  it("returns null class + 'unknown' glyph when value is null/undefined/NaN", () => {
    for (const v of [null, undefined, NaN]) {
      const d = decorate(v, 0, 100, "higher-better");
      expect(d.className).toBe(HEATMAP_CLASSES.null);
      expect(d.glyph).toBe(HEATMAP_GLYPHS.unknown);
      expect(d.bucket).toBe(-1);
    }
  });

  it("returns neutral class when min === max (all tied)", () => {
    const d = decorate(5, 5, 5, "higher-better");
    expect(d.className).toBe(HEATMAP_CLASSES.null);
    expect(d.bucket).toBe(2);
  });

  it("higher-better: max value gets best (greenest) class + best glyph", () => {
    const d = decorate(100, 0, 100, "higher-better");
    expect(d.className).toBe(HEATMAP_CLASSES.best[0]);
    expect(d.glyph).toBe(HEATMAP_GLYPHS.best);
    expect(d.bucket).toBe(0);
  });

  it("higher-better: min value gets worst (rose) class + worst glyph", () => {
    const d = decorate(0, 0, 100, "higher-better");
    expect(d.className).toBe(HEATMAP_CLASSES.best[4]);
    expect(d.glyph).toBe(HEATMAP_GLYPHS.worst);
    expect(d.bucket).toBe(4);
  });

  it("lower-better: min value gets best class (e.g. fee comparison)", () => {
    const d = decorate(0, 0, 100, "lower-better");
    expect(d.bucket).toBe(0);
    expect(d.glyph).toBe(HEATMAP_GLYPHS.best);
  });

  it("lower-better: max value gets worst class", () => {
    const d = decorate(100, 0, 100, "lower-better");
    expect(d.bucket).toBe(4);
    expect(d.glyph).toBe(HEATMAP_GLYPHS.worst);
  });

  it("middle values land in middle buckets without best/worst glyph", () => {
    const d = decorate(50, 0, 100, "higher-better");
    expect(d.bucket).toBeGreaterThan(0);
    expect(d.bucket).toBeLessThan(4);
    expect(d.glyph).toBe(HEATMAP_GLYPHS.middle);
  });

  it("clamps values outside [min,max] without throwing", () => {
    expect(decorate(150, 0, 100, "higher-better").bucket).toBe(0);
    expect(decorate(-50, 0, 100, "higher-better").bucket).toBe(4);
  });

  it("ariaRank is a non-empty string", () => {
    expect(decorate(50, 0, 100, "higher-better").ariaRank).toMatch(/bucket/);
    expect(decorate(null, 0, 100, "higher-better").ariaRank).toMatch(/unavailable/);
  });
});

describe("tableCellColor (className-only API)", () => {
  it("matches decorate().className", () => {
    expect(tableCellColor(50, 0, 100, "higher-better")).toBe(
      decorate(50, 0, 100, "higher-better").className,
    );
  });
});

describe("decorateRow", () => {
  it("min/max are derived from the row's numeric values", () => {
    const decs = decorateRow([10, 20, 30, 40, 50], "higher-better");
    expect(decs[0]?.bucket).toBe(4); // 10 is worst
    expect(decs[4]?.bucket).toBe(0); // 50 is best
  });

  it("ignores null/undefined when computing min/max but still decorates them", () => {
    const decs = decorateRow([null, 10, 20, undefined], "higher-better");
    expect(decs[0]?.bucket).toBe(-1); // null
    expect(decs[3]?.bucket).toBe(-1); // undefined
    expect(decs[1]?.bucket).toBe(4); // 10 is worst of the numerics
    expect(decs[2]?.bucket).toBe(0); // 20 is best of the numerics
  });

  it("all-null row decorates every cell as unknown without crashing", () => {
    const decs = decorateRow([null, null, null], "higher-better");
    expect(decs.every((d) => d.bucket === -1)).toBe(true);
  });

  it("all values identical row decorates every cell as neutral", () => {
    const decs = decorateRow([7, 7, 7], "higher-better");
    expect(decs.every((d) => d.className === HEATMAP_CLASSES.null)).toBe(true);
  });
});
