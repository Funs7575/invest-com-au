/**
 * @vitest-environment jsdom
 *
 * Smoke tests for /startup/grants/page.tsx — W-14 proof-of-template validation.
 * Verifies the HubPage HOC correctly orchestrates the grants hub:
 * hero, service grid (bespoke grant cards), eligibility quiz CTA,
 * R&D calculator, articles section, advisorCta slot.
 *
 * URL canonical: /startup/grants  (/grants 301-redirects here via next.config.ts).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "../components/setup";
import StartupGrantsHubPage from "@/app/startup/grants/page";

// ── Mocks ────────────────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockFrom }),
}));

vi.mock("@/components/Icon", () => ({
  default: ({ name, ...rest }: { name: string; [k: string]: unknown }) => (
    <span data-testid={`icon-${name}`} {...rest} />
  ),
}));

vi.mock("@/components/RdTaxCalculator", () => ({
  default: () => <div data-testid="rd-tax-calculator">RdTaxCalculator</div>,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

type Article = {
  slug: string;
  title: string;
  excerpt: string | null;
};

function setupArticlesMock(articles: Article[] = []) {
  const limit = vi.fn().mockResolvedValue({ data: articles });
  const inFilter = vi.fn().mockReturnValue({ limit });
  const eq = vi.fn().mockReturnValue({ in: inFilter });
  const select = vi.fn().mockReturnValue({ eq });
  mockFrom.mockReturnValue({ select });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("StartupGrantsHubPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupArticlesMock();
  });

  // ── HubPage HOC structure ─────────────────────────────────────────────────

  it("renders the hub-page container from HubPage HOC", async () => {
    render(await StartupGrantsHubPage());
    expect(screen.getByTestId("hub-page")).toBeInTheDocument();
  });

  it("renders the HubHero with grants headline", async () => {
    render(await StartupGrantsHubPage());
    expect(screen.getByTestId("hub-hero")).toBeInTheDocument();
    expect(
      screen.getByText(/Australian Business Grants.*Non-Dilutive Funding/)
    ).toBeInTheDocument();
  });

  it("renders the HubHero subhead text", async () => {
    render(await StartupGrantsHubPage());
    expect(screen.getByText(/\$400M\+/)).toBeInTheDocument();
  });

  it("renders breadcrumb JSON-LD from HubPage", async () => {
    render(await StartupGrantsHubPage());
    const ldScript = screen.getByTestId("hub-page-breadcrumb-ld");
    expect(ldScript).toBeInTheDocument();
    const ld = JSON.parse(ldScript.innerHTML);
    expect(ld["@type"]).toBe("BreadcrumbList");
    const names = ld.itemListElement.map((item: { name: string }) => item.name);
    expect(names).toContain("Home");
    expect(names).toContain("Startup");
    expect(names).toContain("Grants");
  });

  it("does NOT render FAQPage JSON-LD because grantsHubConfig has no faqs", async () => {
    render(await StartupGrantsHubPage());
    expect(screen.queryByTestId("hub-page-faq-ld")).not.toBeInTheDocument();
  });

  it("renders compliance block", async () => {
    render(await StartupGrantsHubPage());
    expect(screen.getByTestId("hub-page-compliance")).toBeInTheDocument();
  });

  // ── Service grid slot (bespoke grant cards) ───────────────────────────────

  it("renders the service grid slot wrapper", async () => {
    render(await StartupGrantsHubPage());
    expect(screen.getByTestId("hub-page-service-grid")).toBeInTheDocument();
  });

  it("renders the six grant program cards", async () => {
    render(await StartupGrantsHubPage());
    // Scope to service grid to avoid matching duplicate text in hero stats/CTAs
    const serviceGrid = screen.getByTestId("hub-page-service-grid");
    expect(within(serviceGrid).getByText("R&D Tax Incentive")).toBeInTheDocument();
    expect(within(serviceGrid).getByText("EMDG")).toBeInTheDocument();
    expect(within(serviceGrid).getByText("Industry Growth Program")).toBeInTheDocument();
    expect(within(serviceGrid).getByText("NSW MVP Ventures")).toBeInTheDocument();
    expect(within(serviceGrid).getByText("Advance Queensland")).toBeInTheDocument();
    expect(within(serviceGrid).getByText("LaunchVic")).toBeInTheDocument();
  });

  // ── Eligibility quiz CTA section ─────────────────────────────────────────

  it("renders the eligibility quiz CTA section", async () => {
    render(await StartupGrantsHubPage());
    expect(
      screen.getByText("Which grants is your business eligible for?")
    ).toBeInTheDocument();
  });

  it("eligibility quiz CTA links to /grants/eligibility-quiz", async () => {
    render(await StartupGrantsHubPage());
    // Both hero primaryCta and children CTA link here — verify all point to the right URL
    screen.getAllByRole("link", { name: /check my eligibility/i }).forEach((link) => {
      expect(link).toHaveAttribute("href", "/grants/eligibility-quiz");
    });
  });

  // ── R&D Tax calculator ───────────────────────────────────────────────────

  it("renders the R&D Tax Incentive calculator section heading", async () => {
    render(await StartupGrantsHubPage());
    expect(
      screen.getByText("R&D Tax Incentive calculator")
    ).toBeInTheDocument();
  });

  it("renders the RdTaxCalculator component", async () => {
    render(await StartupGrantsHubPage());
    expect(screen.getByTestId("rd-tax-calculator")).toBeInTheDocument();
  });

  // ── Advisor CTA slot ─────────────────────────────────────────────────────

  it("renders the advisor CTA slot", async () => {
    render(await StartupGrantsHubPage());
    expect(screen.getByTestId("hub-page-advisor-cta")).toBeInTheDocument();
  });

  it("advisor CTA links to /find-advisor", async () => {
    render(await StartupGrantsHubPage());
    expect(
      screen.getByRole("link", { name: /find a grant specialist/i })
    ).toHaveAttribute("href", "/find-advisor");
  });

  // ── Articles section ─────────────────────────────────────────────────────

  it("does not render articles heading when Supabase returns empty array", async () => {
    setupArticlesMock([]);
    render(await StartupGrantsHubPage());
    expect(screen.queryByText("Read deeper")).not.toBeInTheDocument();
  });

  it("renders articles section when articles are returned", async () => {
    setupArticlesMock([
      {
        slug: "rd-tax-incentive-australia-guide",
        title: "R&D Tax Incentive: Australia Guide",
        excerpt: "How to claim the 43.5% offset.",
      },
      {
        slug: "emdg-grant-australia-guide",
        title: "EMDG Grant Australia Guide",
        excerpt: null,
      },
    ]);
    render(await StartupGrantsHubPage());
    expect(screen.getByText("Read deeper")).toBeInTheDocument();
    expect(
      screen.getByText("R&D Tax Incentive: Australia Guide")
    ).toBeInTheDocument();
    expect(screen.getByText("EMDG Grant Australia Guide")).toBeInTheDocument();
  });

  it("article cards link to /article/<slug>", async () => {
    setupArticlesMock([
      {
        slug: "rd-tax-incentive-australia-guide",
        title: "R&D Tax Incentive: Australia Guide",
        excerpt: null,
      },
    ]);
    render(await StartupGrantsHubPage());
    expect(
      screen.getByRole("link", { name: /R&D Tax Incentive: Australia Guide/i })
    ).toHaveAttribute("href", "/article/rd-tax-incentive-australia-guide");
  });

  it("renders article excerpt when present", async () => {
    setupArticlesMock([
      {
        slug: "emdg-grant-australia-guide",
        title: "EMDG Grant Australia Guide",
        excerpt: "Reimburse up to 50% of overseas marketing spend.",
      },
    ]);
    render(await StartupGrantsHubPage());
    expect(
      screen.getByText("Reimburse up to 50% of overseas marketing spend.")
    ).toBeInTheDocument();
  });

  // ── Error resilience ─────────────────────────────────────────────────────

  it("renders page gracefully when Supabase throws an error", async () => {
    const limit = vi.fn().mockRejectedValue(new Error("DB unavailable"));
    const inFilter = vi.fn().mockReturnValue({ limit });
    const eq = vi.fn().mockReturnValue({ in: inFilter });
    const select = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });

    render(await StartupGrantsHubPage());
    expect(screen.getByTestId("hub-page")).toBeInTheDocument();
    expect(screen.queryByText("Read deeper")).not.toBeInTheDocument();
  });
});
