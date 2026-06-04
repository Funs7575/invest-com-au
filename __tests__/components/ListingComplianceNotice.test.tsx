import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import ListingComplianceNotice from "@/components/invest/ListingComplianceNotice";
import { RISK_WARNING_CTA } from "@/lib/compliance";

const productLabel = "Australian Carbon Credit Units (ACCUs)";
const classification = "Carbon-credit listings such as";

describe("ListingComplianceNotice", () => {
  it("renders the s708 wholesale-investor heading", () => {
    render(
      <ListingComplianceNotice productLabel={productLabel} classification={classification} />,
    );
    expect(
      screen.getByText(/Wholesale Investor Access \(s708 Corporations Act\)/i),
    ).toBeInTheDocument();
  });

  it("interpolates the productLabel and classification props into the body", () => {
    const { container } = render(
      <ListingComplianceNotice productLabel={productLabel} classification={classification} />,
    );
    expect(container.textContent).toContain(productLabel);
    expect(container.textContent).toContain(classification);
  });

  it("renders all three wholesale-qualification bullets", () => {
    render(
      <ListingComplianceNotice productLabel={productLabel} classification={classification} />,
    );
    expect(screen.getByText(/\$2\.5 million/)).toBeInTheDocument();
    expect(screen.getByText(/\$250,000/)).toBeInTheDocument();
    expect(screen.getByText(/qualified accountant/i)).toBeInTheDocument();
  });

  it("renders the RISK_WARNING_CTA from lib/compliance", () => {
    const { container } = render(
      <ListingComplianceNotice productLabel={productLabel} classification={classification} />,
    );
    expect(RISK_WARNING_CTA.length).toBeGreaterThan(0);
    expect(container.textContent).toContain(RISK_WARNING_CTA);
  });
});
