import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent } from "@testing-library/react";
import { render, screen } from "./setup";
import AdvisorsClient from "@/app/advisors/AdvisorsClient";
import type { Professional } from "@/lib/types";

// next/navigation is referenced at module scope inside the mock factory, so the
// shared mocks must be created via vi.hoisted (the factory is hoisted above
// const declarations).
const { mockReplace, mockSearchParams } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockSearchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => mockSearchParams,
}));

// GetMatchedEmbed pulls in heavy data-fetching children irrelevant to the filters.
vi.mock("@/components/get-matched/GetMatchedEmbed", () => ({ default: () => null }));

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
  };
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
  });

  it("renders the Advisor Type options through the FacetGroup primitive", () => {
    render(<AdvisorsClient professionals={professionals} />);
    expect(screen.getByText("Advisor Type")).toBeInTheDocument();
    // FacetGroup labels are pluralised ("Financial Planners"); anchor to avoid
    // matching compound types like "Energy Financial Planners".
    expect(
      screen.getByRole("checkbox", { name: /^Financial Planners/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /^SMSF Accountants/ }),
    ).toBeInTheDocument();
  });

  it("renders the Minimum rating RangeSlider (single-handle)", () => {
    render(<AdvisorsClient professionals={professionals} />);
    expect(screen.getByText("Minimum rating")).toBeInTheDocument();
    const sliders = screen.getAllByRole("slider");
    expect(sliders.length).toBeGreaterThanOrEqual(1);
  });

  it("surfaces an active-filter chip when a type facet is toggled on", () => {
    render(<AdvisorsClient professionals={professionals} />);
    expect(screen.queryByText(/Filtering:/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: /^Financial Planners/ }));
    // The shared FilterChips strip renders its "Filtering:" prefix once a chip exists.
    expect(screen.getByText(/Filtering:/i)).toBeInTheDocument();
  });

  it("renders no FilterChips strip when nothing is filtered", () => {
    render(<AdvisorsClient professionals={professionals} />);
    expect(screen.queryByText(/Filtering:/i)).not.toBeInTheDocument();
  });
});
