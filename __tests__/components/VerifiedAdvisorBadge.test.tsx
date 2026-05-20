import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import VerifiedAdvisorBadge from "@/components/VerifiedAdvisorBadge";

describe("VerifiedAdvisorBadge", () => {
  it("renders nothing when advisorType is missing", () => {
    const { container } = render(<VerifiedAdvisorBadge advisorType={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when advisorType is undefined", () => {
    const { container } = render(<VerifiedAdvisorBadge />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a labelled pill for a known ProfessionalType slug", () => {
    render(<VerifiedAdvisorBadge advisorType="mortgage_broker" />);
    expect(screen.getByText(/Verified Mortgage Broker/)).toBeInTheDocument();
  });

  it("falls back to humanised slug when type isn't in PROFESSIONAL_TYPE_LABELS", () => {
    render(<VerifiedAdvisorBadge advisorType="custom_made_up_role" />);
    expect(screen.getByText(/Verified custom made up role/)).toBeInTheDocument();
  });

  it("wraps in a Link to /advisor/[slug] when advisorSlug is supplied", () => {
    render(
      <VerifiedAdvisorBadge
        advisorType="mortgage_broker"
        advisorSlug="bob-the-broker"
      />,
    );
    expect(
      screen.getByRole("link", { name: /Verified Mortgage Broker/ }),
    ).toHaveAttribute("href", "/advisor/bob-the-broker");
  });

  it("does NOT wrap in a Link when advisorSlug is missing", () => {
    render(<VerifiedAdvisorBadge advisorType="mortgage_broker" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("hides the label text in iconOnly mode but keeps the title tooltip", () => {
    render(
      <VerifiedAdvisorBadge
        advisorType="mortgage_broker"
        iconOnly
      />,
    );
    expect(screen.queryByText(/Verified Mortgage Broker/)).not.toBeInTheDocument();
    // The title tooltip is on the inner pill span; query by it.
    const pill = document.querySelector("[title]");
    expect(pill?.getAttribute("title")).toBe(
      "Verified Mortgage Broker on Invest.com.au",
    );
  });
});
