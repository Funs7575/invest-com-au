/**
 * @vitest-environment jsdom
 *
 * Smoke tests for /visa-investment/page.tsx — W-15 (hub 1 of 6) HubPage migration.
 * Verifies the HubPage HOC correctly orchestrates the visa-investment hub:
 * hero, pathways service grid, SIV closure banner, country cross-links,
 * advisorCta slot, and compliance block.
 *
 * No Supabase calls — page is fully static.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../components/setup";
import VisaInvestmentHubPage from "@/app/visa-investment/page";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/components/Icon", () => ({
  default: ({ name, ...rest }: { name: string; [k: string]: unknown }) => (
    <span data-testid={`icon-${name}`} {...rest} />
  ),
}));

vi.mock("@/components/HubAdvisorCTA", () => ({
  default: ({ heading }: { heading: string }) => (
    <div data-testid="hub-advisor-cta-mock">{heading}</div>
  ),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("VisaInvestmentHubPage", () => {
  // ── HubPage HOC structure ─────────────────────────────────────────────────

  it("renders the hub-page container from HubPage HOC", () => {
    render(<VisaInvestmentHubPage />);
    expect(screen.getByTestId("hub-page")).toBeInTheDocument();
  });

  it("renders the HubHero with visa-investment headline", () => {
    render(<VisaInvestmentHubPage />);
    expect(screen.getByTestId("hub-hero")).toBeInTheDocument();
    expect(
      screen.getByText(/Investing in Australia: Visa.*Migration Pathways/)
    ).toBeInTheDocument();
  });

  it("renders the HubHero subhead text", () => {
    render(<VisaInvestmentHubPage />);
    expect(screen.getByText(/visa landscape changed structurally/)).toBeInTheDocument();
  });

  it("renders breadcrumb JSON-LD from HubPage", () => {
    render(<VisaInvestmentHubPage />);
    const ldScript = screen.getByTestId("hub-page-breadcrumb-ld");
    expect(ldScript).toBeInTheDocument();
    const ld = JSON.parse(ldScript.innerHTML);
    expect(ld["@type"]).toBe("BreadcrumbList");
    const names = ld.itemListElement.map((item: { name: string }) => item.name);
    expect(names).toContain("Home");
    expect(names).toContain("Visa Investment");
  });

  it("does NOT render FAQPage JSON-LD because visaInvestmentHubConfig has no faqs", () => {
    render(<VisaInvestmentHubPage />);
    expect(screen.queryByTestId("hub-page-faq-ld")).not.toBeInTheDocument();
  });

  it("renders the compliance block", () => {
    render(<VisaInvestmentHubPage />);
    expect(screen.getByTestId("hub-page-compliance")).toBeInTheDocument();
  });

  // ── Service grid slot (pathways) ─────────────────────────────────────────

  it("renders the service grid slot wrapper", () => {
    render(<VisaInvestmentHubPage />);
    expect(screen.getByTestId("hub-page-service-grid")).toBeInTheDocument();
  });

  it("renders all four visa pathway titles", () => {
    render(<VisaInvestmentHubPage />);
    expect(
      screen.getByText("National Innovation Visa (Subclass 858)")
    ).toBeInTheDocument();
    expect(screen.getByText("Employer Sponsored (482 / 186)")).toBeInTheDocument();
    expect(
      screen.getByText("State / Territory Nomination (190 / 491)")
    ).toBeInTheDocument();
    expect(screen.getByText("Existing SIV Holders (188C)")).toBeInTheDocument();
  });

  // ── SIV closure banner ───────────────────────────────────────────────────

  it("renders the SIV closure warning banner", () => {
    render(<VisaInvestmentHubPage />);
    expect(screen.getByText(/SIV \/ BIIP closed\./)).toBeInTheDocument();
  });

  it("SIV closure banner mentions 31 July 2024", () => {
    render(<VisaInvestmentHubPage />);
    expect(screen.getByText(/31 July 2024/)).toBeInTheDocument();
  });

  // ── Country cross-links ──────────────────────────────────────────────────

  it("renders the country cross-links section heading", () => {
    render(<VisaInvestmentHubPage />);
    expect(
      screen.getByText("Already in Australia and investing?")
    ).toBeInTheDocument();
  });

  it("renders all six country cross-links", () => {
    render(<VisaInvestmentHubPage />);
    expect(screen.getByText("Singapore")).toBeInTheDocument();
    expect(screen.getByText("Hong Kong")).toBeInTheDocument();
    expect(screen.getByText("China")).toBeInTheDocument();
    expect(screen.getByText("Japan")).toBeInTheDocument();
    expect(screen.getByText("United Kingdom")).toBeInTheDocument();
    expect(screen.getByText("United States")).toBeInTheDocument();
  });

  it("country links point to the correct /foreign-investment/* paths", () => {
    render(<VisaInvestmentHubPage />);
    expect(screen.getByRole("link", { name: "Singapore" })).toHaveAttribute(
      "href",
      "/foreign-investment/singapore"
    );
    expect(screen.getByRole("link", { name: "Japan" })).toHaveAttribute(
      "href",
      "/foreign-investment/japan"
    );
  });

  // ── Advisor CTA slot ─────────────────────────────────────────────────────

  it("renders the advisor CTA slot", () => {
    render(<VisaInvestmentHubPage />);
    expect(screen.getByTestId("hub-page-advisor-cta")).toBeInTheDocument();
  });

  it("advisor CTA has the migration specialist heading", () => {
    render(<VisaInvestmentHubPage />);
    expect(
      screen.getByText(
        "Speak to a migration agent or immigration investment lawyer"
      )
    ).toBeInTheDocument();
  });

  // ── Quick links section ──────────────────────────────────────────────────

  it("renders the National Innovation Visa deep-dive link", () => {
    render(<VisaInvestmentHubPage />);
    expect(
      screen.getByRole("link", { name: /National Innovation Visa deep-dive/i })
    ).toHaveAttribute(
      "href",
      "/article/australia-national-innovation-visa-guide"
    );
  });

  it("renders the SIV transition guide link", () => {
    render(<VisaInvestmentHubPage />);
    expect(
      screen.getByRole("link", { name: /SIV transition guide/i })
    ).toHaveAttribute("href", "/foreign-investment/siv");
  });
});
