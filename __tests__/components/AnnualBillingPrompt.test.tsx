import { describe, it, expect } from "vitest";
import { render, screen } from "../components/setup";
import AnnualBillingPrompt from "@/app/advisor-portal/billing/AnnualBillingPrompt";

describe("AnnualBillingPrompt", () => {
  it("renders nothing for free tier", () => {
    const { container } = render(<AnnualBillingPrompt advisorTier="free" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for launch tier", () => {
    const { container } = render(<AnnualBillingPrompt advisorTier="launch" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for null tier", () => {
    const { container } = render(<AnnualBillingPrompt advisorTier={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for an unknown tier id", () => {
    const { container } = render(<AnnualBillingPrompt advisorTier="legacy_pro_v0" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the prompt for Growth tier with correct savings", () => {
    render(<AnnualBillingPrompt advisorTier="growth" />);
    // Growth: $49/mo × 12 = $588/yr; annual $470 → save $118/yr (≈2 months free)
    expect(screen.getByText(/Switch to annual on Growth/i)).toBeInTheDocument();
    expect(screen.getByText(/save \$118\/yr/i)).toBeInTheDocument();
    expect(screen.getByText(/2 months free/i)).toBeInTheDocument();
  });

  it("renders the prompt for Pro tier with correct savings", () => {
    render(<AnnualBillingPrompt advisorTier="pro" />);
    // Pro: $149/mo × 12 = $1788/yr; annual $1430 → save $358/yr (≈2 months free)
    expect(screen.getByText(/Switch to annual on Pro/i)).toBeInTheDocument();
    expect(screen.getByText(/save \$358\/yr/i)).toBeInTheDocument();
  });

  it("renders the prompt for Elite tier with correct savings", () => {
    render(<AnnualBillingPrompt advisorTier="elite" />);
    // Elite: $499/mo × 12 = $5988/yr; annual $4790 → save $1198/yr
    expect(screen.getByText(/Switch to annual on Elite/i)).toBeInTheDocument();
    expect(screen.getByText(/save \$1198\/yr/i)).toBeInTheDocument();
  });

  it("CTA links to /advisor-portal/upgrade (where annual is pre-selected)", () => {
    render(<AnnualBillingPrompt advisorTier="growth" />);
    const cta = screen.getByTestId("annual-billing-prompt-cta");
    expect(cta).toHaveAttribute("href", "/advisor-portal/upgrade");
    expect(cta).toHaveTextContent(/Switch to annual/i);
  });
});
