import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

describe("AdvisorsClient — directory primitives wiring", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    paramsRef.current = new URLSearchParams();
  });

  it("renders the Advisor Type options through the FacetGroup primitive", () => {
    render(<AdvisorsClient professionals={professionals} />);
    expect(screen.getByText("Advisor Type")).toBeInTheDocument();
    // FacetGroup labels are pluralised ("Financial Planners"); anchor to avoid
    // matching compound types like "Energy Financial Planners".
    expect(screen.getByRole("checkbox", { name: /^Financial Planners/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /^SMSF Accountants/ })).toBeInTheDocument();
  });

  it("renders the Minimum rating RangeSlider (single-handle)", () => {
    render(<AdvisorsClient professionals={professionals} />);
    expect(screen.getByText("Minimum rating")).toBeInTheDocument();
    expect(screen.getAllByRole("slider").length).toBeGreaterThanOrEqual(1);
  });

  it("toggling a type facet writes the matching URL param (URL-first)", () => {
    render(<AdvisorsClient professionals={professionals} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /^Financial Planners/ }));
    expect(mockReplace).toHaveBeenCalled();
    expect(mockReplace.mock.calls.at(-1)?.[0]).toContain("type=financial_planner");
  });

  it("renders an active-filter chip strip derived from the URL", () => {
    paramsRef.current = new URLSearchParams("type=financial_planner");
    render(<AdvisorsClient professionals={professionals} />);
    // The shared FilterChips strip renders its "Filtering:" prefix once a chip exists.
    expect(screen.getByText(/Filtering:/i)).toBeInTheDocument();
  });

  it("renders no FilterChips strip when the URL has no filters", () => {
    render(<AdvisorsClient professionals={professionals} />);
    expect(screen.queryByText(/Filtering:/i)).not.toBeInTheDocument();
  });
});
