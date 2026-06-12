import { describe, it, expect } from "vitest";
import { readdirSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import {
  ALL_CURRICULA,
  CHALLENGE_CURRICULA,
} from "@/lib/challenges/curricula";
import { LEARNING_PATHS } from "@/lib/learning-paths";

const APP_DIR = path.join(process.cwd(), "app");

/**
 * Resolve a root-relative href to a real App Router route.
 *
 * Handles three cases:
 *   1. A static page file (app/<segments>/page.tsx).
 *   2. A dynamic segment ([param] or [...param]) matching one path segment.
 *   3. The known dynamic registries we link to:
 *      - /learn/<path>  → validated against LEARNING_PATHS slugs.
 */
function routeExists(href: string): boolean {
  const clean = href.split("?")[0]!.split("#")[0]!;
  const segments = clean.split("/").filter(Boolean);

  // Special-case the learn registry: /learn/<slug> resolves via [path].
  if (segments[0] === "learn" && segments.length === 2) {
    const slug = segments[1]!;
    const known = LEARNING_PATHS.some((p) => p.slug === slug);
    const dynamicLearn = existsSync(
      path.join(APP_DIR, "learn", "[path]", "page.tsx"),
    );
    return known && dynamicLearn;
  }

  // Walk the app dir matching each segment against a literal dir or a single
  // dynamic [param] / [...catchall] directory.
  let dir = APP_DIR;
  for (const seg of segments) {
    const literal = path.join(dir, seg);
    if (existsSync(literal) && statSync(literal).isDirectory()) {
      dir = literal;
      continue;
    }
    // Look for a dynamic segment dir at this level.
    const entries = existsSync(dir)
      ? readdirSync(dir).filter((e) => {
          const full = path.join(dir, e);
          return statSync(full).isDirectory() && e.startsWith("[");
        })
      : [];
    if (entries.length > 0) {
      dir = path.join(dir, entries[0]!);
      continue;
    }
    return false;
  }
  // A real page lives here.
  return (
    existsSync(path.join(dir, "page.tsx")) ||
    existsSync(path.join(dir, "page.ts")) ||
    existsSync(path.join(dir, "page.jsx"))
  );
}

describe("challenge curricula integrity", () => {
  it("ships the two launch programs keyed by curriculum_key", () => {
    expect(CHALLENGE_CURRICULA["investment-ready-21"]).toBeTruthy();
    expect(CHALLENGE_CURRICULA["eofy-sprint-14"]).toBeTruthy();
    expect(ALL_CURRICULA).toHaveLength(2);
  });

  for (const curriculum of ALL_CURRICULA) {
    describe(curriculum.key, () => {
      it("has globally-unique task keys", () => {
        const keys = curriculum.tasks.map((t) => t.key);
        expect(new Set(keys).size).toBe(keys.length);
      });

      it("declares durationDays equal to the max task day", () => {
        const maxDay = Math.max(...curriculum.tasks.map((t) => t.day));
        expect(curriculum.durationDays).toBe(maxDay);
      });

      it("has at least one task and ascending, gapless day coverage", () => {
        expect(curriculum.tasks.length).toBeGreaterThan(0);
        const days = curriculum.tasks.map((t) => t.day);
        // Days are non-decreasing in definition order.
        for (let i = 1; i < days.length; i++) {
          expect(days[i]!).toBeGreaterThanOrEqual(days[i - 1]!);
        }
        // Every day from 1..durationDays has a task.
        const daySet = new Set(days);
        for (let d = 1; d <= curriculum.durationDays; d++) {
          expect(daySet.has(d)).toBe(true);
        }
      });

      it("every task has non-empty copy fields", () => {
        for (const t of curriculum.tasks) {
          expect(t.key.length).toBeGreaterThan(0);
          expect(t.title.length).toBeGreaterThan(0);
          expect(t.description.length).toBeGreaterThan(0);
          expect(t.actionLabel.length).toBeGreaterThan(0);
          expect(t.completionTrigger.length).toBeGreaterThan(0);
        }
      });

      it("every task href resolves to a real route", () => {
        for (const t of curriculum.tasks) {
          expect(t.href.startsWith("/"), `${t.key} href must be root-relative`).toBe(
            true,
          );
          expect(routeExists(t.href), `${t.key} → ${t.href} should resolve`).toBe(
            true,
          );
        }
      });
    });
  }

  it("task keys are unique across all curricula combined", () => {
    const all = ALL_CURRICULA.flatMap((c) => c.tasks.map((t) => t.key));
    expect(new Set(all).size).toBe(all.length);
  });

  it("the route resolver correctly rejects a non-existent route", () => {
    expect(routeExists("/this/definitely/does-not-exist")).toBe(false);
  });
});
