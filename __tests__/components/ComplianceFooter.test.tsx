import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import ComplianceFooter from "@/components/ComplianceFooter";

describe("ComplianceFooter — default variant", () => {
  it("renders the General Advice Warning + Advertiser Disclosure block", () => {
    render(<ComplianceFooter />);
    expect(screen.getByText(/General Advice Warning:/)).toBeInTheDocument();
  });

  it("exposes the disclosures region via aria-label", () => {
    render(<ComplianceFooter />);
    expect(
      screen.getByRole("contentinfo", { name: "Compliance disclosures" }),
    ).toBeInTheDocument();
  });

  it("does NOT render an extra-warning block for the default variant", () => {
    render(<ComplianceFooter />);
    expect(screen.queryByText(/CFD Risk Warning:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cryptocurrency Risk Warning:/)).not.toBeInTheDocument();
  });
});

describe("ComplianceFooter — cfd variant", () => {
  it("renders the CFD Risk Warning above the general advice block", () => {
    render(<ComplianceFooter variant="cfd" />);
    expect(screen.getByText(/CFD Risk Warning:/)).toBeInTheDocument();
    expect(screen.getByText(/General Advice Warning:/)).toBeInTheDocument();
  });
});

describe("ComplianceFooter — crypto variant", () => {
  it("renders the Cryptocurrency Risk Warning", () => {
    render(<ComplianceFooter variant="crypto" />);
    expect(screen.getByText(/Cryptocurrency Risk Warning:/)).toBeInTheDocument();
  });
});

describe("ComplianceFooter — calculator variant", () => {
  it("renders the Calculator Disclaimer headline", () => {
    render(<ComplianceFooter variant="calculator" />);
    expect(screen.getByText(/Calculator Disclaimer:/)).toBeInTheDocument();
  });

  it("includes the indicative-estimate disclaimer body text", () => {
    render(<ComplianceFooter variant="calculator" />);
    expect(
      screen.getByText(/indicative estimates only/),
    ).toBeInTheDocument();
  });
});

describe("ComplianceFooter — property variant", () => {
  it("renders the Property Disclaimer headline", () => {
    render(<ComplianceFooter variant="property" />);
    expect(screen.getByText(/Property Disclaimer:/)).toBeInTheDocument();
  });
});

describe("ComplianceFooter — firb variant", () => {
  it("renders the Foreign Investment (FIRB) Notice", () => {
    render(<ComplianceFooter variant="firb" />);
    expect(screen.getByText(/Foreign Investment \(FIRB\) Notice:/)).toBeInTheDocument();
  });
});

describe("ComplianceFooter — compact mode", () => {
  it("renders only the General Advice Warning in compact mode", () => {
    render(<ComplianceFooter compact />);
    expect(screen.getByText(/General Advice Warning:/)).toBeInTheDocument();
    // The advertiser disclosure (longer paragraph) should NOT appear in compact
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });

  it("exposes the compact note via aria-label", () => {
    render(<ComplianceFooter compact />);
    expect(
      screen.getByRole("note", { name: "General advice warning" }),
    ).toBeInTheDocument();
  });

  it("ignores variant when compact (compact is always the same shape)", () => {
    render(<ComplianceFooter variant="cfd" compact />);
    // No "CFD Risk Warning:" headline in compact mode — compact is generic.
    expect(screen.queryByText(/CFD Risk Warning:/)).not.toBeInTheDocument();
  });
});

describe("ComplianceFooter — className passthrough", () => {
  it("applies the className to the outer container in default mode", () => {
    const { container } = render(
      <ComplianceFooter className="test-marker" />,
    );
    expect(container.firstElementChild).toHaveClass("test-marker");
  });

  it("applies the className to the outer container in compact mode", () => {
    const { container } = render(
      <ComplianceFooter compact className="compact-marker" />,
    );
    expect(container.firstElementChild).toHaveClass("compact-marker");
  });
});
