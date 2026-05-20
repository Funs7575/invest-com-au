import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import PropertyDisclaimer from "@/components/PropertyDisclaimer";

describe("PropertyDisclaimer", () => {
  it("renders the info-icon link pointing at /terms", () => {
    render(<PropertyDisclaimer />);
    const link = screen.getByRole("link", {
      name: "Important disclaimers",
    });
    expect(link).toHaveAttribute("href", "/terms");
  });

  it("renders the compliance copy alongside the icon link", () => {
    const { container } = render(<PropertyDisclaimer />);
    // The disclaimer text is whatever PROPERTY_DISCLAIMER_SHORT resolves to.
    // We don't assert the exact wording (that would couple the test to
    // compliance copy), but we do assert the surrounding paragraph
    // contains some non-trivial body text after the icon link.
    const p = container.querySelector("p");
    expect(p).not.toBeNull();
    expect(p?.textContent?.length ?? 0).toBeGreaterThan(20);
  });

  it("marks the inline svg icon aria-hidden", () => {
    const { container } = render(<PropertyDisclaimer />);
    expect(container.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
