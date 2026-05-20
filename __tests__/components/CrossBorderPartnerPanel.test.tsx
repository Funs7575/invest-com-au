import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import CrossBorderPartnerPanel from "@/components/foreign-investment/CrossBorderPartnerPanel";
import { ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";
import { AFFILIATE_REL } from "@/lib/tracking";
import type { CrossBorderPartner } from "@/lib/foreign-investment-country-data";

const PARTNERS: CrossBorderPartner[] = [
  {
    slug: "acme-fx",
    name: "Acme FX",
    category: "fx",
    tagline: "Multi-currency accounts",
    benefit: "Hold GBP and AUD, convert at the mid-market rate.",
    ctaLabel: "Open an account",
    href: "https://example.com/acme-fx",
    note: "Capital at risk.",
  },
  {
    slug: "border-law",
    name: "Border Law",
    category: "legal",
    tagline: "FIRB applications for non-residents",
    benefit: "Fixed-fee FIRB residential applications.",
    ctaLabel: "Book a consult",
    href: "https://example.com/border-law",
  },
];

describe("CrossBorderPartnerPanel", () => {
  it("renders nothing when there are no partners", () => {
    const { container } = render(<CrossBorderPartnerPanel partners={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a card per partner with name, benefit and CTA", () => {
    render(<CrossBorderPartnerPanel partners={PARTNERS} />);
    expect(screen.getByText("Acme FX")).toBeTruthy();
    expect(screen.getByText("Border Law")).toBeTruthy();
    expect(screen.getByText(/mid-market rate/)).toBeTruthy();
    expect(screen.getByText(/Open an account/)).toBeTruthy();
  });

  it("marks every CTA with the affiliate rel and opens in a new tab", () => {
    render(<CrossBorderPartnerPanel partners={PARTNERS} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link.getAttribute("rel")).toBe(AFFILIATE_REL);
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("href")).toMatch(/^https:\/\/example\.com\//);
    }
  });

  it("renders the advertiser disclosure once", () => {
    render(<CrossBorderPartnerPanel partners={PARTNERS} />);
    expect(screen.getByText(ADVERTISER_DISCLOSURE_SHORT)).toBeTruthy();
  });

  it("shows the category badge label and optional note", () => {
    render(<CrossBorderPartnerPanel partners={PARTNERS} />);
    expect(screen.getByText("FX & multi-currency")).toBeTruthy();
    expect(screen.getByText("FIRB & legal")).toBeTruthy();
    expect(screen.getByText("Capital at risk.")).toBeTruthy();
  });
});
