import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "./setup";

// Mock Icon so jsdom doesn't choke on the icon registry.
vi.mock("@/components/Icon", () => ({
  default: ({ name, ...rest }: { name: string; [key: string]: unknown }) => (
    <span data-testid={`icon-${name}`} {...rest} />
  ),
}));

// Control tone independently of the real thresholds.
const { mockBadgeToneFor } = vi.hoisted(() => ({
  mockBadgeToneFor: vi.fn<(pct: number | null) => "emerald" | "amber" | "slate">(),
}));

vi.mock("@/lib/outcomes/profile-display", () => ({
  badgeToneFor: mockBadgeToneFor,
  // ProviderOutcomeBadge is a type-only export; re-export a noop so the
  // type import resolves at runtime without pulling the real module.
  ProviderOutcomeBadge: undefined,
}));

import OutcomeBadge from "@/components/outcomes/OutcomeBadge";

type Badge = {
  completion_rate_pct: number | null;
  outcomes_submitted: number;
  avg_rating: number | null;
};

function badge(partial: Partial<Badge>): Badge {
  return {
    completion_rate_pct: 90,
    outcomes_submitted: 5,
    avg_rating: 4.5,
    ...partial,
  };
}

describe("OutcomeBadge", () => {
  beforeEach(() => {
    mockBadgeToneFor.mockReset();
    mockBadgeToneFor.mockReturnValue("slate");
  });

  it("renders nothing when completion_rate_pct is null", () => {
    const { container } = render(
      <OutcomeBadge badge={badge({ completion_rate_pct: null })} />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(mockBadgeToneFor).not.toHaveBeenCalled();
  });

  it("renders nothing when completion_rate_pct is undefined", () => {
    const { container } = render(
      // exercise the `=== undefined` guard explicitly
      <OutcomeBadge badge={badge({ completion_rate_pct: undefined as unknown as null })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the percent text and accessible label when a pct is provided", () => {
    const { getByText, getByLabelText } = render(
      <OutcomeBadge badge={badge({ completion_rate_pct: 87, outcomes_submitted: 12 })} />,
    );
    expect(getByText("87% completed")).toBeInTheDocument();
    expect(
      getByLabelText("Completion rate 87% based on 12 consumer reviews"),
    ).toBeInTheDocument();
  });

  it("uses singular 'review' for exactly 1 outcome", () => {
    const { getByText } = render(
      <OutcomeBadge badge={badge({ outcomes_submitted: 1 })} />,
    );
    expect(getByText(/·\s*1 review$/)).toBeInTheDocument();
  });

  it("uses plural 'reviews' for more than 1 outcome", () => {
    const { getByText } = render(
      <OutcomeBadge badge={badge({ outcomes_submitted: 3 })} />,
    );
    expect(getByText(/·\s*3 reviews$/)).toBeInTheDocument();
  });

  it.each([
    ["emerald", "emerald-50"],
    ["amber", "amber-50"],
    ["slate", "slate-50"],
  ] as const)("applies the %s tone classes from badgeToneFor", (tone, expectedClass) => {
    mockBadgeToneFor.mockReturnValue(tone);
    const { getByLabelText } = render(
      <OutcomeBadge badge={badge({ completion_rate_pct: 75, outcomes_submitted: 4 })} />,
    );
    const wrapper = getByLabelText("Completion rate 75% based on 4 consumer reviews");
    expect(wrapper.className).toContain(expectedClass);
  });

  it("passes the raw pct to badgeToneFor", () => {
    render(<OutcomeBadge badge={badge({ completion_rate_pct: 42 })} />);
    expect(mockBadgeToneFor).toHaveBeenCalledWith(42);
  });
});
