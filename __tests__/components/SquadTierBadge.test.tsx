/**
 * Presentation test for <SquadTierBadge />.
 *
 * The component maps a SquadTierBadge tone to an icon name + a Tailwind
 * tone class, renders the label as both visible text and the aria-label,
 * and conditionally renders the "what's next" upgrade hint only when
 * `showUpgradeHint` is true AND `badge.nextStep` is truthy (the `&&`
 * short-circuit). We mock the Icon so we can assert on the resolved
 * icon name via a data attribute.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "./setup";
import SquadTierBadge from "@/components/expert-teams/SquadTierBadge";
import type { SquadTierBadge as SquadTierBadgeData } from "@/lib/expert-teams/badge-tier";

vi.mock("@/components/Icon", () => ({
  default: ({ name }: { name: string }) => <span data-icon={name} />,
}));

function makeBadge(overrides: Partial<SquadTierBadgeData> = {}): SquadTierBadgeData {
  return {
    tier: "bronze",
    label: "Bronze Pro Squad",
    tone: "amber",
    nextStep: "To reach Silver: 2 more verified members",
    ...overrides,
  };
}

describe("SquadTierBadge", () => {
  it("renders the badge label as text and aria-label", () => {
    const badge = makeBadge({ label: "Silver Pro Squad" });
    render(<SquadTierBadge badge={badge} />);

    // Visible label text.
    expect(screen.getByText("Silver Pro Squad")).toBeInTheDocument();
    // aria-label on the pill container equals the label.
    const labelled = screen.getByLabelText("Silver Pro Squad");
    expect(labelled).toBeInTheDocument();
  });

  it.each([
    ["amber", "award", "amber-50"],
    ["slate", "shield-check", "slate-100"],
    ["yellow", "trophy", "yellow-50"],
  ] as const)(
    "tone=%s maps to icon '%s' and class containing '%s'",
    (tone, expectedIcon, expectedClassFragment) => {
      const badge = makeBadge({ tone });
      const { container } = render(<SquadTierBadge badge={badge} />);

      // Icon name resolved via the mocked Icon's data attribute.
      const icon = container.querySelector(`[data-icon="${expectedIcon}"]`);
      expect(icon).not.toBeNull();

      // Tone class applied to the pill (the aria-labelled container).
      const pill = screen.getByLabelText(badge.label);
      expect(pill.className).toContain(expectedClassFragment);
    },
  );

  it("does NOT render the upgrade hint by default (showUpgradeHint omitted)", () => {
    const badge = makeBadge({
      nextStep: "To reach Silver: 1 more discipline",
    });
    render(<SquadTierBadge badge={badge} />);

    expect(
      screen.queryByText("To reach Silver: 1 more discipline"),
    ).not.toBeInTheDocument();
  });

  it("renders the upgrade hint when showUpgradeHint=true and nextStep is present", () => {
    const badge = makeBadge({
      nextStep: "To reach Gold: 2 more verified members",
    });
    render(<SquadTierBadge badge={badge} showUpgradeHint />);

    expect(
      screen.getByText("To reach Gold: 2 more verified members"),
    ).toBeInTheDocument();
  });

  it("does NOT render the hint when showUpgradeHint=true but nextStep is null (Gold)", () => {
    const badge = makeBadge({
      tier: "gold",
      label: "Gold Pro Squad",
      tone: "yellow",
      nextStep: null,
    });
    const { container } = render(
      <SquadTierBadge badge={badge} showUpgradeHint />,
    );

    // No hint paragraph rendered — the && short-circuits on a null nextStep.
    expect(container.querySelector("p")).toBeNull();
    // The badge itself still renders.
    expect(screen.getByText("Gold Pro Squad")).toBeInTheDocument();
    expect(container.querySelector('[data-icon="trophy"]')).not.toBeNull();
  });

  it("does NOT render the hint when showUpgradeHint=true but nextStep is an empty string", () => {
    // Empty string is falsy, so the && guard must still short-circuit.
    const badge = makeBadge({ nextStep: "" });
    const { container } = render(
      <SquadTierBadge badge={badge} showUpgradeHint />,
    );

    expect(container.querySelector("p")).toBeNull();
  });
});
