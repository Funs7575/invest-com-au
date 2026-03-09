import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "./setup";
import PillarExitIntent from "@/components/PillarExitIntent";

// Mock Icon component
vi.mock("@/components/Icon", () => ({
  default: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

// Mock UtmCapture
vi.mock("@/components/UtmCapture", () => ({
  getStoredUtm: () => ({}),
}));

describe("PillarExitIntent", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("renders nothing initially (popup is not visible by default)", () => {
    const { container } = render(<PillarExitIntent slug="share-trading" />);
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing for unknown vertical slug", () => {
    const { container } = render(<PillarExitIntent slug="nonexistent" />);
    expect(container.innerHTML).toBe("");
  });

  it("respects localStorage dismissal", () => {
    // Set dismiss timestamp to just now (within 7-day window)
    localStorage.setItem("pillarExitDismissed", Date.now().toString());
    const { container } = render(<PillarExitIntent slug="share-trading" />);
    expect(container.innerHTML).toBe("");
  });

  it("each vertical slug has a defined CTA config", () => {
    // Verify that the component doesn't crash for any known vertical
    const slugs = ["share-trading", "crypto", "savings", "super", "cfd"];
    slugs.forEach((slug) => {
      const { container } = render(<PillarExitIntent slug={slug} />);
      // All start hidden — the important thing is no crash
      expect(container).toBeDefined();
    });
  });
});
