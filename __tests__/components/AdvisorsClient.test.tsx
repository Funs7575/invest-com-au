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

  it("renders the Advisor Type toggle buttons in the filter panel", () => {
    render(<AdvisorsClient professionals={professionals} />);
    // Filter panel is hidden until the Filters toggle is clicked
    fireEvent.click(screen.getByRole("button", { name: /Filters/i }));
    expect(screen.getByText("Advisor Type")).toBeInTheDocument();
    // Component uses toggle buttons (not checkboxes) for type filtering
    expect(screen.getByRole("button", { name: /^Financial Planners/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^SMSF Accountants/ })).toBeInTheDocument();
  });

  it("renders the Min Rating filter select in the filter panel", () => {
    render(<AdvisorsClient professionals={professionals} />);
    fireEvent.click(screen.getByRole("button", { name: /Filters/i }));
    expect(screen.getByText("Min Rating")).toBeInTheDocument();
    // Component uses <select> elements for rating/state/fee filters
    expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(1);
  });

  it("toggling a type button writes the matching URL param (URL-first)", async () => {
    render(<AdvisorsClient professionals={professionals} />);
    fireEvent.click(screen.getByRole("button", { name: /Filters/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Financial Planners/ }));
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
});
