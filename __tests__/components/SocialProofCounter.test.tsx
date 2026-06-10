import { describe, it, expect } from "vitest";
import { render } from "./setup";
import SocialProofCounter from "@/components/SocialProofCounter";

/**
 * The counter is intentionally disabled: the old implementation
 * fabricated the "X investors compared platforms today" figure from a
 * time-of-day curve (fake social proof). Until a real analytics source
 * is wired up the component must render nothing — these tests pin that
 * so a fabricated counter can't quietly come back.
 */
describe("SocialProofCounter", () => {
  it("renders nothing in inline variant", () => {
    const { container } = render(<SocialProofCounter />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing in badge variant", () => {
    const { container } = render(<SocialProofCounter variant="badge" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("never shows an invented activity figure", () => {
    const { container } = render(<SocialProofCounter />);
    expect(container.textContent).not.toMatch(/investors compar/i);
  });
});
