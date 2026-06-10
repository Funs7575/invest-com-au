import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdvisorsClient from "@/app/advisors/AdvisorsClient";
import type { Professional } from "@/lib/types";

// Self-contained next/navigation mock (the URL-first assertions need a
// seedable searchParams + an observable router.replace, so we can't lean on
// the shared component-test setup whose mock returns fixed values). Hoisted so
// the factory can reference the spies — see CLAUDE.md vi.mock note.
const { mockReplace, paramsRef } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  paramsRef: { current: new URLSearchParams() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/advisors",
  useSearchParams: () => paramsRef.current,
}));

// GetMatchedEmbed pulls in heavy data-fetching children irrelevant to the filters.
vi.mock("@/components/get-matched/GetMatchedEmbed", () => ({ default: () => null }));
vi.mock("@/lib/tracking", async (importOriginal) => ({
  ...(await importOriginal() as Record<string, unknown>),
  trackEvent: vi.fn(),
}));
vi.mock("@/lib/hooks/useAdvisorShortlist", () => ({
  useAdvisorShortlist: () => ({ toggle: vi.fn(), has: () => false, count: 0, max: 3 }),
}));
vi.mock("@/lib/hooks/useUser", () => ({
  useUser: () => ({ user: null, loading: false }),
}));

// Server action — can't run in jsdom; the deep-link persist effect calls it.
const { mockSetIntentCountry } = vi.hoisted(() => ({ mockSetIntentCountry: vi.fn() }));
vi.mock("@/lib/intent-context-actions", () => ({
  setIntentCountryAction: (...args: unknown[]) => mockSetIntentCountry(...args),
}));

function pro(overrides: Partial<Professional> = {}): Professional {
  return {
    id: 1,
    slug: "jane-smith",
    name: "Jane Smith",
    type: "financial_planner",
    specialties: ["Retirement Planning"],
    rating: 4.8,
    review_count: 20,
    verified: true,
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Professional;
}

const professionals: Professional[] = [
  pro(),
  pro({
    id: 2,
    slug: "tom-lee",
    name: "Tom Lee",
    type: "smsf_accountant",
    specialties: ["SMSF Setup"],
    rating: 3.2,
    review_count: 4,
    verified: false,
  }),
];

describe("AdvisorsClient — filter panel wiring", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    paramsRef.current = new URLSearchParams();
  });

  it("exposes the Advisor Type facet (checkboxes) via the All-filters drawer", () => {
    render(<AdvisorsClient professionals={professionals} />);
    // Long-tail facets open from the canonical "All filters" drawer.
    fireEvent.click(screen.getByRole("button", { name: /All filters/i }));
    // FacetGroup renders a labelled checkbox group ("Advisor type").
    expect(screen.getByText("Advisor type")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /^Financial Planners/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /^SMSF Accountants/ })).toBeInTheDocument();
  });

  it("renders the primary facet pills (Type · Location · Fee · Rating)", () => {
    render(<AdvisorsClient professionals={professionals} />);
    // Primary filters are on display as pill-popovers (mirrors /invest + /compare).
    expect(screen.getByRole("button", { name: /^Type/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Location/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Fee/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Rating/ })).toBeInTheDocument();
  });

  it("toggling a type facet writes the matching URL param (URL-first)", async () => {
    render(<AdvisorsClient professionals={professionals} />);
    fireEvent.click(screen.getByRole("button", { name: /All filters/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /^Financial Planners/ }));
    // URL update is debounced 300ms; waitFor retries until the assertion passes
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalled();
      expect(mockReplace.mock.calls.at(-1)?.[0]).toContain("type=financial_planner");
    });
  });

  it("renders an active-filter chip strip derived from the URL", () => {
    paramsRef.current = new URLSearchParams("type=financial_planner");
    render(<AdvisorsClient professionals={professionals} />);
    // Active filters render a chip strip with a "Clear all" dismissal button
    expect(screen.getByRole("button", { name: "Clear all" })).toBeInTheDocument();
  });

  it("renders no active-filter chips when the URL has no filters", () => {
    render(<AdvisorsClient professionals={professionals} />);
    expect(screen.queryByText(/Filtering:/i)).not.toBeInTheDocument();
  });

  // ADV-016: the All-filters button must show a labelled count, not a bare icon.
  it("labels the filter button 'All filters' when nothing is active", () => {
    render(<AdvisorsClient professionals={professionals} />);
    expect(screen.getByRole("button", { name: "All filters" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Filters \(/ })).not.toBeInTheDocument();
  });

  it("labels the filter button 'Filters (N)' when N filters are active", () => {
    paramsRef.current = new URLSearchParams("type=financial_planner");
    render(<AdvisorsClient professionals={professionals} />);
    expect(screen.getByRole("button", { name: "Filters (1)" })).toBeInTheDocument();
  });
});

describe("AdvisorsClient — deep-link params on route-scoped pages", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockSetIntentCountry.mockClear();
    paramsRef.current = new URLSearchParams();
    document.cookie = "iv_intent_country=; max-age=0; path=/";
  });

  it("honours ?specialty= even when the route fixes the type (country-hub CTAs)", async () => {
    paramsRef.current = new URLSearchParams("specialty=SMSF Setup");
    render(<AdvisorsClient professionals={professionals} initialType="smsf_accountant" />);
    // Specialty filter applies: Tom Lee (SMSF Setup) stays, Jane Smith filtered out.
    await waitFor(() => {
      expect(screen.getByText("Tom Lee")).toBeInTheDocument();
      expect(screen.queryByText("Jane Smith")).not.toBeInTheDocument();
    });
  });

  it("filters out advisors whose country_eligibility blocks the ?country= visitor", async () => {
    paramsRef.current = new URLSearchParams("country=uk");
    const list = [
      pro({ id: 3, slug: "uk-ok", name: "UK Friendly", country_eligibility: { allowed_countries: ["GB"] } } as Partial<Professional>),
      pro({ id: 4, slug: "us-only", name: "US Only Firm", country_eligibility: { allowed_countries: ["US"] } } as Partial<Professional>),
    ];
    render(<AdvisorsClient professionals={list} initialType="financial_planner" />);
    await waitFor(() => {
      expect(screen.getByText("UK Friendly")).toBeInTheDocument();
      expect(screen.queryByText("US Only Firm")).not.toBeInTheDocument();
    });
  });

  it("persists a valid ?country= deep-link for the rest of the journey", async () => {
    paramsRef.current = new URLSearchParams("country=uk");
    render(<AdvisorsClient professionals={professionals} />);
    await waitFor(() => expect(mockSetIntentCountry).toHaveBeenCalledWith("uk"));
  });

  it("ignores an unknown ?country= value", async () => {
    paramsRef.current = new URLSearchParams("country=zz");
    render(<AdvisorsClient professionals={professionals} />);
    // Both advisors visible, nothing persisted.
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Tom Lee")).toBeInTheDocument();
    expect(mockSetIntentCountry).not.toHaveBeenCalled();
  });

  it("falls back to the remembered cookie country on route-scoped pages", async () => {
    document.cookie = "iv_intent_country=us; path=/";
    const list = [
      pro({ id: 5, slug: "us-ok", name: "US Friendly", country_eligibility: { allowed_countries: ["US"] } } as Partial<Professional>),
      pro({ id: 6, slug: "uk-only", name: "UK Only Firm", country_eligibility: { allowed_countries: ["GB"] } } as Partial<Professional>),
    ];
    render(<AdvisorsClient professionals={list} initialType="financial_planner" />);
    await waitFor(() => {
      expect(screen.getByText("US Friendly")).toBeInTheDocument();
      expect(screen.queryByText("UK Only Firm")).not.toBeInTheDocument();
    });
  });
});

describe("AdvisorsClient — compact header redesign", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    paramsRef.current = new URLSearchParams();
  });

  it("renders the light compact header (filter-reactive title, no dark eyebrow pill)", () => {
    render(<AdvisorsClient professionals={professionals} />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(
      /Find a Financial Advisor/i,
    );
    // The light tone intentionally omits the dark "Verified advisors" eyebrow pill.
    expect(screen.queryByText("Verified advisors")).not.toBeInTheDocument();
  });

  it("drops the standalone 'Get matched in 60 seconds' card (folded into the toolbar)", () => {
    render(<AdvisorsClient professionals={professionals} />);
    expect(screen.queryByText(/Get matched in 60 seconds/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Not sure which advisor you need/i)).not.toBeInTheDocument();
  });

  it("restores the standalone AI filter bar + concierge link, with no density toggle (matches /invest)", () => {
    render(<AdvisorsClient professionals={professionals} />);
    // Standalone AI filter bar (its own input), like /invest — not merged into the search.
    expect(screen.getByPlaceholderText(/SMSF advisor Sydney/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Ask the AI concierge/i }),
    ).toBeInTheDocument();
    // Phase-2 density toggle was reverted — no Comfy/Compact control.
    expect(screen.queryByRole("button", { name: /^comfy$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^compact$/i })).not.toBeInTheDocument();
  });

  it("exposes a compact 'Get quotes' option in the toolbar linking to the brief flow", () => {
    render(<AdvisorsClient professionals={professionals} />);
    // Compact top-bar option (not the big bottom band) → /briefs/new.
    const cta = screen.getByRole("link", { name: /^Get quotes$/i });
    expect(cta).toHaveAttribute("href", "/briefs/new");
    // The big bottom-band heading is gone.
    expect(
      screen.queryByRole("heading", { name: /Get quotes from verified pros/i }),
    ).not.toBeInTheDocument();
  });
});
