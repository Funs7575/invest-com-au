/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CrossHubLinks, { HUB_REGISTRY } from "@/components/CrossHubLinks";

describe("CrossHubLinks", () => {
  it("renders the section container", () => {
    render(<CrossHubLinks hubs={["smsf", "grants"]} />);
    expect(screen.getByTestId("cross-hub-links")).toBeInTheDocument();
  });

  it("shows the default heading", () => {
    render(<CrossHubLinks hubs={["smsf"]} />);
    expect(screen.getByTestId("cross-hub-links-heading")).toHaveTextContent(
      "Explore more guides"
    );
  });

  it("uses a custom heading when provided", () => {
    render(<CrossHubLinks hubs={["smsf"]} heading="Related hubs" />);
    expect(screen.getByTestId("cross-hub-links-heading")).toHaveTextContent(
      "Related hubs"
    );
  });

  it("renders a card for each known slug", () => {
    render(<CrossHubLinks hubs={["smsf", "grants", "dividends"]} />);
    expect(screen.getByTestId("cross-hub-link-smsf")).toBeInTheDocument();
    expect(screen.getByTestId("cross-hub-link-grants")).toBeInTheDocument();
    expect(screen.getByTestId("cross-hub-link-dividends")).toBeInTheDocument();
  });

  it("renders the correct href for each slug", () => {
    render(<CrossHubLinks hubs={["smsf", "lump-sum-investing"]} />);
    expect(screen.getByTestId("cross-hub-link-smsf")).toHaveAttribute(
      "href",
      "/smsf"
    );
    expect(
      screen.getByTestId("cross-hub-link-lump-sum-investing")
    ).toHaveAttribute("href", "/lump-sum-investing");
  });

  it("renders the hub label and tagline inside each card", () => {
    render(<CrossHubLinks hubs={["smsf"]} />);
    const card = screen.getByTestId("cross-hub-link-smsf");
    expect(card).toHaveTextContent("SMSF");
    expect(card).toHaveTextContent(
      "Setup, audit, and investment strategy for self-managed super funds."
    );
  });

  it("skips unknown slugs silently", () => {
    render(<CrossHubLinks hubs={["smsf", "unknown-hub-xyz"]} />);
    expect(screen.getByTestId("cross-hub-link-smsf")).toBeInTheDocument();
    expect(
      screen.queryByTestId("cross-hub-link-unknown-hub-xyz")
    ).not.toBeInTheDocument();
  });

  it("returns null when all slugs are unknown", () => {
    const { container } = render(
      <CrossHubLinks hubs={["not-a-hub", "also-not-a-hub"]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null for an empty hubs array", () => {
    const { container } = render(<CrossHubLinks hubs={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders multiple hubs in the grid", () => {
    render(
      <CrossHubLinks
        hubs={["smsf", "grants", "super", "retirement", "insurance"]}
      />
    );
    const grid = screen.getByTestId("cross-hub-links-grid");
    expect(grid.children).toHaveLength(5);
  });

  it("HUB_REGISTRY covers at least 10 hubs", () => {
    expect(Object.keys(HUB_REGISTRY).length).toBeGreaterThanOrEqual(10);
  });

  it("every HUB_REGISTRY entry has a non-empty label and tagline", () => {
    for (const [slug, meta] of Object.entries(HUB_REGISTRY)) {
      expect(meta.label.length, `${slug} label empty`).toBeGreaterThan(0);
      expect(meta.tagline.length, `${slug} tagline empty`).toBeGreaterThan(0);
    }
  });

  it("renders find-advisor hub with correct href", () => {
    render(<CrossHubLinks hubs={["find-advisor"]} />);
    expect(
      screen.getByTestId("cross-hub-link-find-advisor")
    ).toHaveAttribute("href", "/find-advisor");
  });
});
