import { describe, it, expect } from "vitest";

import {
  creatorName,
  creatorSlug,
  creatorLogoUrl,
  type AcademyCourse,
} from "@/lib/academy";

// Plain-object factory — the creator helpers are pure and never touch
// Supabase, so no client mock is needed.
function makeCourse(overrides: Partial<AcademyCourse>): AcademyCourse {
  return {
    id: 1,
    slug: "course",
    title: "Course",
    description: null,
    cover_image_url: null,
    price_cents: 0,
    status: "published",
    creator_kind: "organisation",
    organisation_id: null,
    professional_id: null,
    avg_rating: null,
    review_count: 0,
    cpd_hours: null,
    created_at: "2026-01-01T00:00:00Z",
    organisation: null,
    professional: null,
    ...overrides,
  };
}

describe("academy creator helpers — organisation creator", () => {
  const course = makeCourse({
    creator_kind: "organisation",
    organisation: { slug: "acme", name: "Acme Advisers", logo_url: "https://cdn/logo.png" },
  });

  it("creatorName returns the organisation name", () => {
    expect(creatorName(course)).toBe("Acme Advisers");
  });

  it("creatorSlug returns the /providers/<slug> path", () => {
    expect(creatorSlug(course)).toBe("/providers/acme");
  });

  it("creatorLogoUrl returns the organisation logo_url", () => {
    expect(creatorLogoUrl(course)).toBe("https://cdn/logo.png");
  });
});

describe("academy creator helpers — advisor creator", () => {
  const course = makeCourse({
    creator_kind: "advisor",
    professional: { slug: "jane-doe", name: "Jane Doe", photo_url: "https://cdn/jane.png" },
  });

  it("creatorName returns the professional name", () => {
    expect(creatorName(course)).toBe("Jane Doe");
  });

  it("creatorSlug returns the /advisor/<slug> path", () => {
    expect(creatorSlug(course)).toBe("/advisor/jane-doe");
  });

  it("creatorLogoUrl returns the professional photo_url", () => {
    expect(creatorLogoUrl(course)).toBe("https://cdn/jane.png");
  });
});

describe("academy creator helpers — missing relation rows", () => {
  it("organisation kind with null organisation falls back to Unknown/null/null", () => {
    const course = makeCourse({ creator_kind: "organisation", organisation: null });
    expect(creatorName(course)).toBe("Unknown");
    expect(creatorSlug(course)).toBeNull();
    expect(creatorLogoUrl(course)).toBeNull();
  });

  it("advisor kind with null professional falls back to Unknown/null/null", () => {
    const course = makeCourse({ creator_kind: "advisor", professional: null });
    expect(creatorName(course)).toBe("Unknown");
    expect(creatorSlug(course)).toBeNull();
    expect(creatorLogoUrl(course)).toBeNull();
  });

  it("creatorLogoUrl is null when the organisation has no logo_url", () => {
    const course = makeCourse({
      creator_kind: "organisation",
      organisation: { slug: "acme", name: "Acme Advisers", logo_url: null },
    });
    expect(creatorLogoUrl(course)).toBeNull();
  });
});
