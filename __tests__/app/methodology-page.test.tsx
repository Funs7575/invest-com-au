/**
 * @vitest-environment jsdom
 *
 * Smoke tests for /methodology/page.tsx — verifies key transparency sections
 * render with accurate content after the CMP-TR-01 expansion.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../components/setup";
import MethodologyPage from "@/app/methodology/page";

vi.mock("@/lib/seo", () => ({
  absoluteUrl: (path: string) => `https://invest.com.au${path}`,
  breadcrumbJsonLd: () => ({}),
  SITE_NAME: "Invest.com.au",
}));

vi.mock("@/lib/sponsorship", () => ({
  TIER_PRICING: {
    featured_partner: { monthly: 1500, label: "Featured Partner" },
    editors_pick: { monthly: 800, label: "Editor’s Pick" },
    deal_of_month: { monthly: 2000, label: "Deal of the Month" },
  },
}));

describe("MethodologyPage", () => {
  it("renders the main heading", async () => {
    render(await MethodologyPage());
    expect(screen.getByRole("heading", { name: /ranking methodology/i, level: 1 })).toBeDefined();
  });

  it("renders the 'How Rankings Work' section with all four factors", async () => {
    render(await MethodologyPage());
    expect(screen.getByText("Editorial Rating")).toBeDefined();
    expect(screen.getByText("Sponsorship Tier")).toBeDefined();
    expect(screen.getByText("Goal Relevance Filter")).toBeDefined();
    expect(screen.getByText("Country Eligibility")).toBeDefined();
  });

  it("renders sponsorship pricing table with correct AUD amounts", async () => {
    render(await MethodologyPage());
    expect(screen.getByText("Featured Partner")).toBeDefined();
    expect(screen.getByText("$1,500")).toBeDefined();
    expect(screen.getByText("$800")).toBeDefined();
    expect(screen.getByText("$2,000")).toBeDefined();
  });

  it("renders the editorial policy changelog section", async () => {
    render(await MethodologyPage());
    expect(screen.getByText(/editorial policy changelog/i)).toBeDefined();
    expect(screen.getAllByText(/\?raw=1/).length).toBeGreaterThan(0);
  });

  it("renders the affiliate / referral section", async () => {
    render(await MethodologyPage());
    expect(screen.getByText(/referral & affiliate fees/i)).toBeDefined();
    expect(screen.getByText(/rel="nofollow sponsored"/)).toBeDefined();
  });

  it("renders data verification section", async () => {
    render(await MethodologyPage());
    expect(screen.getByText(/data verification/i)).toBeDefined();
    expect(screen.getByText(/monthly basis/i)).toBeDefined();
  });
});
