import { describe, it, expect } from "vitest";
import {
  LEARNING_PATHS,
  getLearningPath,
  resolvePath,
  sumEstimatedMinutes,
  getStepUrls,
  validateStepSlug,
  validateAllPaths,
  type LearningPathStep,
  type StepKind,
} from "@/lib/learning-paths";

// ─── LEARNING_PATHS registry ──────────────────────────────────────────────────

describe("LEARNING_PATHS registry", () => {
  it("contains at least one path", () => {
    expect(LEARNING_PATHS.length).toBeGreaterThan(0);
  });

  it("every path has a unique slug", () => {
    const slugs = LEARNING_PATHS.map((p) => p.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });

  it("every path slug is kebab-case (lowercase alphanumeric + hyphens only)", () => {
    for (const path of LEARNING_PATHS) {
      expect(path.slug).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it("every path has at least one step", () => {
    for (const path of LEARNING_PATHS) {
      expect(path.steps.length).toBeGreaterThan(0);
    }
  });

  it("every path has a non-empty title, description, audience, and colorClass", () => {
    for (const path of LEARNING_PATHS) {
      expect(path.title.length).toBeGreaterThan(0);
      expect(path.description.length).toBeGreaterThan(0);
      expect(path.audience.length).toBeGreaterThan(0);
      expect(path.colorClass.length).toBeGreaterThan(0);
    }
  });

  it("estimatedMinutes on each path matches the sum of its steps", () => {
    for (const path of LEARNING_PATHS) {
      const sum = sumEstimatedMinutes(path);
      expect(path.estimatedMinutes).toBe(sum);
    }
  });
});

// ─── getLearningPath ──────────────────────────────────────────────────────────

describe("getLearningPath", () => {
  it("returns the path for a known slug", () => {
    const slug = LEARNING_PATHS[0]?.slug;
    expect(slug).toBeDefined();
    const result = getLearningPath(slug!);
    expect(result).toBeDefined();
    expect(result?.slug).toBe(slug);
  });

  it("returns undefined for an unknown slug", () => {
    expect(getLearningPath("does-not-exist-xyz")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(getLearningPath("")).toBeUndefined();
  });
});

// ─── resolvePath ─────────────────────────────────────────────────────────────

describe("resolvePath", () => {
  const cases: Array<{ step: LearningPathStep; expected: string }> = [
    {
      step: { title: "t", kind: "article", slug: "how-to-choose-a-broker", estimatedMinutes: 5 },
      expected: "/article/how-to-choose-a-broker",
    },
    {
      step: { title: "t", kind: "question", slug: "how-does-compound-interest-work", estimatedMinutes: 5 },
      expected: "/questions/how-does-compound-interest-work",
    },
    {
      step: { title: "t", kind: "glossary", slug: "etf", estimatedMinutes: 3 },
      expected: "/glossary/etf",
    },
    {
      step: { title: "t", kind: "calculator", slug: "/compound-interest-calculator", estimatedMinutes: 5 },
      expected: "/compound-interest-calculator",
    },
    {
      step: { title: "t", kind: "page", slug: "/brokers", estimatedMinutes: 5 },
      expected: "/brokers",
    },
  ];

  for (const { step, expected } of cases) {
    it(`resolves kind="${step.kind}" slug="${step.slug}" → "${expected}"`, () => {
      expect(resolvePath(step)).toBe(expected);
    });
  }

  it("all resolved paths start with a forward slash", () => {
    for (const path of LEARNING_PATHS) {
      for (const step of path.steps) {
        expect(resolvePath(step)).toMatch(/^\//);
      }
    }
  });
});

// ─── validateStepSlug ────────────────────────────────────────────────────────

describe("validateStepSlug", () => {
  const validCases: Array<{ kind: StepKind; slug: string }> = [
    { kind: "article", slug: "how-to-choose-a-broker" },
    { kind: "question", slug: "how-does-compound-interest-work" },
    { kind: "glossary", slug: "etf" },
    { kind: "calculator", slug: "/compound-interest-calculator" },
    { kind: "page", slug: "/brokers" },
  ];

  for (const { kind, slug } of validCases) {
    it(`returns true for valid kind="${kind}" slug="${slug}"`, () => {
      const step: LearningPathStep = { title: "t", kind, slug, estimatedMinutes: 5 };
      expect(validateStepSlug(step)).toBe(true);
    });
  }

  const invalidCases: Array<{ kind: StepKind; slug: string }> = [
    { kind: "article", slug: "/how-to-choose-a-broker" },   // leading slash in article
    { kind: "question", slug: "/how-does-compound-interest-work" }, // leading slash in question
    { kind: "glossary", slug: "/etf" },                     // leading slash in glossary
    { kind: "calculator", slug: "compound-interest-calculator" }, // missing leading slash
    { kind: "page", slug: "brokers" },                       // missing leading slash
  ];

  for (const { kind, slug } of invalidCases) {
    it(`returns false for invalid kind="${kind}" slug="${slug}"`, () => {
      const step: LearningPathStep = { title: "t", kind, slug, estimatedMinutes: 5 };
      expect(validateStepSlug(step)).toBe(false);
    });
  }
});

// ─── validateAllPaths ────────────────────────────────────────────────────────

describe("validateAllPaths", () => {
  it("returns no errors for the canonical LEARNING_PATHS definition", () => {
    const errors = validateAllPaths();
    expect(errors).toEqual([]);
  });
});

// ─── sumEstimatedMinutes ─────────────────────────────────────────────────────

describe("sumEstimatedMinutes", () => {
  it("returns 0 for a path with no steps", () => {
    const emptyPath = {
      slug: "empty",
      title: "Empty",
      description: "d",
      audience: "a",
      colorClass: "teal",
      estimatedMinutes: 0,
      steps: [],
    };
    expect(sumEstimatedMinutes(emptyPath)).toBe(0);
  });

  it("sums step estimatedMinutes correctly", () => {
    const path = {
      slug: "test-path",
      title: "Test",
      description: "d",
      audience: "a",
      colorClass: "teal",
      estimatedMinutes: 15,
      steps: [
        { title: "A", kind: "article" as StepKind, slug: "a", estimatedMinutes: 5 },
        { title: "B", kind: "question" as StepKind, slug: "b", estimatedMinutes: 7 },
        { title: "C", kind: "glossary" as StepKind, slug: "c", estimatedMinutes: 3 },
      ],
    };
    expect(sumEstimatedMinutes(path)).toBe(15);
  });
});

// ─── getStepUrls ─────────────────────────────────────────────────────────────

describe("getStepUrls", () => {
  it("returns one URL per step", () => {
    for (const path of LEARNING_PATHS) {
      const urls = getStepUrls(path);
      expect(urls.length).toBe(path.steps.length);
    }
  });

  it("all URLs start with /", () => {
    for (const path of LEARNING_PATHS) {
      for (const url of getStepUrls(path)) {
        expect(url).toMatch(/^\//);
      }
    }
  });

  it("article steps resolve under /article/", () => {
    for (const path of LEARNING_PATHS) {
      for (const step of path.steps.filter((s) => s.kind === "article")) {
        expect(resolvePath(step)).toBe(`/article/${step.slug}`);
      }
    }
  });

  it("question steps resolve under /questions/", () => {
    for (const path of LEARNING_PATHS) {
      for (const step of path.steps.filter((s) => s.kind === "question")) {
        expect(resolvePath(step)).toBe(`/questions/${step.slug}`);
      }
    }
  });

  it("glossary steps resolve under /glossary/", () => {
    for (const path of LEARNING_PATHS) {
      for (const step of path.steps.filter((s) => s.kind === "glossary")) {
        expect(resolvePath(step)).toBe(`/glossary/${step.slug}`);
      }
    }
  });
});

// ─── Specific path content integrity ─────────────────────────────────────────

describe("new-investor path", () => {
  const path = getLearningPath("new-investor");

  it("exists", () => {
    expect(path).toBeDefined();
  });

  it("has at least 8 steps", () => {
    expect(path!.steps.length).toBeGreaterThanOrEqual(8);
  });

  it("includes a calculator step", () => {
    const hasCalc = path!.steps.some((s) => s.kind === "calculator");
    expect(hasCalc).toBe(true);
  });

  it("includes an article step referencing how-to-choose-a-broker", () => {
    const step = path!.steps.find(
      (s) => s.kind === "article" && s.slug === "how-to-choose-a-broker"
    );
    expect(step).toBeDefined();
  });
});

describe("retirement-and-super path", () => {
  const path = getLearningPath("retirement-and-super");

  it("exists", () => {
    expect(path).toBeDefined();
  });

  it("includes a retirement or super calculator", () => {
    const hasCalc = path!.steps.some(
      (s) =>
        s.kind === "calculator" &&
        (s.slug.includes("retirement") || s.slug.includes("super") || s.slug.includes("smsf"))
    );
    expect(hasCalc).toBe(true);
  });

  it("includes a glossary step for superannuation", () => {
    const step = path!.steps.find(
      (s) => s.kind === "glossary" && s.slug === "superannuation"
    );
    expect(step).toBeDefined();
  });
});

describe("foreign-investor path", () => {
  const path = getLearningPath("foreign-investor");

  it("exists", () => {
    expect(path).toBeDefined();
  });

  it("includes a glossary step for firb", () => {
    const step = path!.steps.find(
      (s) => s.kind === "glossary" && s.slug === "firb"
    );
    expect(step).toBeDefined();
  });
});

describe("all paths — step integrity", () => {
  it("no step has an empty title", () => {
    for (const path of LEARNING_PATHS) {
      for (const step of path.steps) {
        expect(step.title.length).toBeGreaterThan(0);
      }
    }
  });

  it("no step has estimatedMinutes <= 0", () => {
    for (const path of LEARNING_PATHS) {
      for (const step of path.steps) {
        expect(step.estimatedMinutes).toBeGreaterThan(0);
      }
    }
  });

  it("calculator and page slugs start with /", () => {
    for (const path of LEARNING_PATHS) {
      for (const step of path.steps) {
        if (step.kind === "calculator" || step.kind === "page") {
          expect(step.slug).toMatch(/^\//);
        }
      }
    }
  });

  it("article, question, glossary slugs do NOT start with /", () => {
    for (const path of LEARNING_PATHS) {
      for (const step of path.steps) {
        if (step.kind === "article" || step.kind === "question" || step.kind === "glossary") {
          expect(step.slug).not.toMatch(/^\//);
        }
      }
    }
  });
});
