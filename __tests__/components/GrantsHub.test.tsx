/**
 * @vitest-environment jsdom
 *
 * Smoke tests for the /startup/grants page migration onto <HubPage> (W-14).
 * Validates:
 *   - grantsHubConfig has the expected shape
 *   - Rendering <HubPage config={grantsHubConfig}> produces canonical structure
 *   - Grants-specific content is present (grant cards, compliance text)
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "./setup";
import HubPage from "@/components/HubPage";
import { grantsHubConfig } from "@/lib/hub-configs/grants";

vi.mock("@/components/Icon", () => ({
  default: ({ name, ...rest }: { name: string; [key: string]: unknown }) => (
    <span data-testid={`icon-${name}`} {...rest} />
  ),
}));

// ── Config shape tests ───────────────────────────────────────────────────────

describe("grantsHubConfig", () => {
  it("has slug grants", () => {
    expect(grantsHubConfig.slug).toBe("grants");
  });

  it("has parentSlug startup (URL lives at /startup/grants)", () => {
    expect(grantsHubConfig.parentSlug).toBe("startup");
  });

  it("hero headline mentions grants or non-dilutive", () => {
    const h = grantsHubConfig.hero.headline.toLowerCase();
    expect(h.includes("grants") || h.includes("non-dilutive")).toBe(true);
  });

  it("has 4 hero stats each with dataAsOf and stalesAt", () => {
    const stats = grantsHubConfig.hero.stats ?? [];
    expect(stats).toHaveLength(4);
    for (const stat of stats) {
      expect(stat.dataAsOf).toBeTruthy();
      expect(stat.stalesAt).toBeTruthy();
    }
  });

  it("hero stats include subtitle fields", () => {
    const stats = grantsHubConfig.hero.stats ?? [];
    const withSubtitle = stats.filter((s) => s.subtitle);
    expect(withSubtitle.length).toBeGreaterThan(0);
  });

  it("hero primaryCta uses lead_routing lever", () => {
    expect(grantsHubConfig.hero.primaryCta.lever).toBe("lead_routing");
  });

  it("hero secondaryCta points to rd-tax-incentive", () => {
    expect(grantsHubConfig.hero.secondaryCta?.href).toBe(
      "/grants/rd-tax-incentive"
    );
  });

  it("complianceKey is grants", () => {
    expect(grantsHubConfig.complianceKey).toBe("grants");
  });

  it("leadQueue is grants kind with programSlugs", () => {
    expect(grantsHubConfig.leadQueue.kind).toBe("grants");
    if (grantsHubConfig.leadQueue.kind === "grants") {
      expect(grantsHubConfig.leadQueue.programSlugs.length).toBeGreaterThan(0);
    }
  });

  it("relatedHubs is non-empty", () => {
    expect(grantsHubConfig.relatedHubs.length).toBeGreaterThan(0);
  });
});

// ── Render tests — validate migration contract ───────────────────────────────

describe("GrantsHub migration — <HubPage> with grantsHubConfig", () => {
  it("renders the hub-page container", () => {
    render(<HubPage config={grantsHubConfig} />);
    expect(screen.getByTestId("hub-page")).toBeInTheDocument();
  });

  it("renders HubHero with grants headline from config", () => {
    render(<HubPage config={grantsHubConfig} />);
    expect(screen.getByTestId("hub-hero")).toBeInTheDocument();
    expect(
      screen.getByText(grantsHubConfig.hero.headline)
    ).toBeInTheDocument();
  });

  it("renders breadcrumb JSON-LD with startup and grants crumbs", () => {
    const { container } = render(<HubPage config={grantsHubConfig} />);
    const ldScript = container.querySelector(
      '[data-testid="hub-page-breadcrumb-ld"]'
    );
    expect(ldScript).not.toBeNull();
    const ld = JSON.parse(ldScript?.innerHTML ?? "{}");
    const names: string[] = ld.itemListElement.map(
      (item: { name: string }) => item.name
    );
    expect(names).toContain("Startup");
    expect(names).toContain("Grants");
  });

  it("renders grants compliance block with GRANTS_WARNING text", () => {
    render(<HubPage config={grantsHubConfig} />);
    const block = screen.getByTestId("hub-page-compliance");
    expect(block).toHaveTextContent("General advice warning.");
    expect(block).toHaveTextContent("Grant rules");
    expect(block).toHaveTextContent("AusIndustry");
  });

  it("renders service grid slot with grant cards", () => {
    const grantCards = (
      <div data-testid="grants-service-grid">
        <div>R&amp;D Tax Incentive</div>
        <div>EMDG</div>
      </div>
    );
    render(<HubPage config={grantsHubConfig} serviceGrid={grantCards} />);
    const slot = screen.getByTestId("hub-page-service-grid");
    expect(slot).toBeInTheDocument();
    expect(within(slot).getByText("R&D Tax Incentive")).toBeInTheDocument();
  });

  it("renders advisor CTA slot", () => {
    render(
      <HubPage
        config={grantsHubConfig}
        advisorCta={
          <div data-testid="grants-advisor-cta">Find a Grant Specialist</div>
        }
      />
    );
    expect(screen.getByTestId("hub-page-advisor-cta")).toBeInTheDocument();
    expect(screen.getByText("Find a Grant Specialist")).toBeInTheDocument();
  });

  it("renders children with eligibility quiz and calculator sections", () => {
    render(
      <HubPage config={grantsHubConfig}>
        <section data-testid="eligibility-quiz-cta">
          Check My Eligibility
        </section>
        <section data-testid="rd-calculator">
          R&amp;D Tax Incentive calculator
        </section>
      </HubPage>
    );
    expect(screen.getByTestId("eligibility-quiz-cta")).toBeInTheDocument();
    expect(screen.getByTestId("rd-calculator")).toBeInTheDocument();
  });

  it("does not render FAQPage JSON-LD (grants config has empty faqs)", () => {
    render(<HubPage config={grantsHubConfig} />);
    expect(
      screen.queryByTestId("hub-page-faq-ld")
    ).not.toBeInTheDocument();
  });
});
