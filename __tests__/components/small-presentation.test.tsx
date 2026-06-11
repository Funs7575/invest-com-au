/**
 * Coverage smoke for the half-dozen small "always-rendered" presentation
 * components scattered across pillar and compare surfaces — none had a
 * dedicated test file, regressions to compliance text or visual variants
 * went unguarded. Each block is short (one or two assertions) but
 * pins the contract: text comes from lib/compliance, variants change
 * the right classes, links point where they should.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";

import RiskWarningInline from "@/components/RiskWarningInline";
import SectionHeading from "@/components/SectionHeading";
import PropertyDisclaimer from "@/components/PropertyDisclaimer";
import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";
import ForeignInvestorCallout from "@/components/ForeignInvestorCallout";
import {
  RISK_WARNING_CTA,
  PROPERTY_DISCLAIMER_SHORT,
} from "@/lib/compliance";

describe("RiskWarningInline", () => {
  it("renders the RISK_WARNING_CTA text from lib/compliance", () => {
    render(<RiskWarningInline />);
    expect(screen.getByText(RISK_WARNING_CTA)).toBeInTheDocument();
  });

  it("uses light text class by default", () => {
    const { container } = render(<RiskWarningInline />);
    expect(container.firstElementChild).toHaveClass("text-slate-500");
  });

  it("uses dark variant text class when variant='dark'", () => {
    const { container } = render(<RiskWarningInline variant="dark" />);
    expect(container.firstElementChild).toHaveClass("text-white/60");
  });
});

describe("SectionHeading", () => {
  it("renders eyebrow and title", () => {
    render(<SectionHeading eyebrow="Why" title="Compare 50 platforms" />);
    expect(screen.getByText("Why")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Compare 50 platforms" }),
    ).toBeInTheDocument();
  });

  it("renders optional sub line when supplied", () => {
    render(
      <SectionHeading eyebrow="x" title="y" sub="More detail here" />,
    );
    expect(screen.getByText("More detail here")).toBeInTheDocument();
  });

  it("does not render a sub paragraph when sub is omitted", () => {
    const { container } = render(<SectionHeading eyebrow="x" title="y" />);
    // Title is rendered in an h2; only the eyebrow + heading paragraphs
    // should be present (no sub element).
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });
});

describe("PropertyDisclaimer", () => {
  it("renders the PROPERTY_DISCLAIMER_SHORT text", () => {
    render(<PropertyDisclaimer />);
    expect(
      screen.getByText(new RegExp(PROPERTY_DISCLAIMER_SHORT.slice(0, 20))),
    ).toBeInTheDocument();
  });

  it("links to /terms via the disclosure icon", () => {
    render(<PropertyDisclaimer />);
    const link = screen.getByRole("link", { name: "Important disclaimers" });
    expect(link).toHaveAttribute("href", "/terms");
  });
});

describe("CompactDisclaimerLine", () => {
  it("renders the RISK_WARNING_CTA text", () => {
    render(<CompactDisclaimerLine />);
    expect(screen.getByText(RISK_WARNING_CTA)).toBeInTheDocument();
  });

  it("links to /how-we-earn via the disclosure icon", () => {
    render(<CompactDisclaimerLine />);
    const link = screen.getByRole("link", { name: "Important disclaimers" });
    expect(link).toHaveAttribute("href", "/how-we-earn");
  });

  it("switches text colour class for variant='dark'", () => {
    const { container } = render(<CompactDisclaimerLine variant="dark" />);
    expect(container.firstElementChild).toHaveClass("text-white/50");
  });
});

describe("ForeignInvestorCallout", () => {
  it("renders the vertical name in the headline", () => {
    render(
      <ForeignInvestorCallout
        href="/foreign-investment/shares"
        verticalName="Australian shares"
        keyRule="No FIRB approval needed for listed securities."
      />,
    );
    expect(
      screen.getByText("Investing in Australian shares from overseas?"),
    ).toBeInTheDocument();
  });

  it("renders the keyRule sub-text", () => {
    render(
      <ForeignInvestorCallout
        href="/foreign-investment/shares"
        verticalName="x"
        keyRule="No FIRB approval needed for listed securities."
      />,
    );
    expect(
      screen.getByText(/No FIRB approval needed/),
    ).toBeInTheDocument();
  });

  it("links the Foreign Investor Guide button to the supplied href", () => {
    render(
      <ForeignInvestorCallout
        href="/foreign-investment/crypto"
        verticalName="crypto"
        keyRule="x"
      />,
    );
    expect(
      screen.getByRole("link", { name: /Foreign Investor Guide/ }),
    ).toHaveAttribute("href", "/foreign-investment/crypto");
  });
});
