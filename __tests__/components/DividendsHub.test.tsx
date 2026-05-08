/**
 * @vitest-environment jsdom
 *
 * Smoke tests for the /dividends page migration onto <HubPage> (W-15).
 * Validates that:
 *   - DIVIDENDS_HUB_CONFIG has the expected shape
 *   - Rendering <HubPage config={DIVIDENDS_HUB_CONFIG}> produces the canonical
 *     hub-page structure (hero, compliance, slots)
 *   - Dividends-specific content is present in each slot
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "./setup";
import HubPage from "@/components/HubPage";
import { DIVIDENDS_HUB_CONFIG } from "@/lib/verticals";

vi.mock("@/components/Icon", () => ({
  default: ({ name, ...rest }: { name: string; [key: string]: unknown }) => (
    <span data-testid={`icon-${name}`} {...rest} />
  ),
}));

// ── Config shape tests ───────────────────────────────────────────────────────

describe("DIVIDENDS_HUB_CONFIG", () => {
  it("has slug dividends", () => {
    expect(DIVIDENDS_HUB_CONFIG.slug).toBe("dividends");
  });

  it("hero headline mentions dividends", () => {
    expect(DIVIDENDS_HUB_CONFIG.hero.headline.toLowerCase()).toContain("dividend");
  });

  it("has 4 hero stats each with dataAsOf and stalesAt", () => {
    const stats = DIVIDENDS_HUB_CONFIG.hero.stats ?? [];
    expect(stats).toHaveLength(4);
    for (const stat of stats) {
      expect(stat.dataAsOf).toBeTruthy();
      expect(stat.stalesAt).toBeTruthy();
    }
  });

  it("hero stats include subtitle on at least one stat", () => {
    const stats = DIVIDENDS_HUB_CONFIG.hero.stats ?? [];
    const withSubtitle = stats.filter((s) => s.subtitle);
    expect(withSubtitle.length).toBeGreaterThan(0);
  });

  it("hero primaryCta uses affiliate_cpa lever and points to /compare", () => {
    expect(DIVIDENDS_HUB_CONFIG.hero.primaryCta.lever).toBe("affiliate_cpa");
    expect(DIVIDENDS_HUB_CONFIG.hero.primaryCta.href).toBe("/compare");
  });

  it("has 4 service grid cards", () => {
    expect(DIVIDENDS_HUB_CONFIG.serviceGrid).toHaveLength(4);
  });

  it("complianceKey is general_advice", () => {
    expect(DIVIDENDS_HUB_CONFIG.complianceKey).toBe("general_advice");
  });

  it("has 4 FAQ entries", () => {
    expect(DIVIDENDS_HUB_CONFIG.faqs).toHaveLength(4);
  });

  it("leadQueue uses general kind with dividends topic", () => {
    expect(DIVIDENDS_HUB_CONFIG.leadQueue.kind).toBe("general");
  });

  it("relatedHubs is non-empty and includes smsf", () => {
    expect(DIVIDENDS_HUB_CONFIG.relatedHubs.length).toBeGreaterThan(0);
    expect(DIVIDENDS_HUB_CONFIG.relatedHubs).toContain("smsf");
  });
});

// ── Render tests — validate migration contract ───────────────────────────────

describe("DividendsHub migration — <HubPage> with DIVIDENDS_HUB_CONFIG", () => {
  it("renders the hub-page container", () => {
    render(<HubPage config={DIVIDENDS_HUB_CONFIG} />);
    expect(screen.getByTestId("hub-page")).toBeInTheDocument();
  });

  it("renders HubHero with dividends headline from config", () => {
    render(<HubPage config={DIVIDENDS_HUB_CONFIG} />);
    expect(screen.getByTestId("hub-hero")).toBeInTheDocument();
    expect(
      screen.getByText("Dividend Investing in Australia: Franking Credits, High-Yield Stocks & ETFs")
    ).toBeInTheDocument();
  });

  it("renders breadcrumb JSON-LD with Dividends crumb", () => {
    const { container } = render(<HubPage config={DIVIDENDS_HUB_CONFIG} />);
    const ldScript = container.querySelector(
      '[data-testid="hub-page-breadcrumb-ld"]'
    );
    expect(ldScript).not.toBeNull();
    const ld = JSON.parse(ldScript?.innerHTML ?? "{}");
    const names: string[] = ld.itemListElement.map(
      (item: { name: string }) => item.name
    );
    expect(names).toContain("Dividends");
  });

  it("renders compliance block with general advice warning text", () => {
    render(<HubPage config={DIVIDENDS_HUB_CONFIG} />);
    const block = screen.getByTestId("hub-page-compliance");
    expect(block).toHaveTextContent("general in nature");
  });

  it("renders service grid slot with entry point card titles", () => {
    const serviceGridNode = (
      <div data-testid="dividends-service-grid">
        {(DIVIDENDS_HUB_CONFIG.serviceGrid ?? []).map((c) => (
          <div key={c.title}>{c.title}</div>
        ))}
      </div>
    );
    render(
      <HubPage config={DIVIDENDS_HUB_CONFIG} serviceGrid={serviceGridNode} />
    );
    const slot = screen.getByTestId("hub-page-service-grid");
    expect(slot).toBeInTheDocument();
    expect(within(slot).getByText("ASX High-Yield Stocks")).toBeInTheDocument();
    expect(within(slot).getByText("Dividend ETFs")).toBeInTheDocument();
    expect(within(slot).getByText("Franking Credits Explained")).toBeInTheDocument();
    expect(within(slot).getByText("Franking Calculator")).toBeInTheDocument();
  });

  it("renders children slot with SMSF crossover and platform CTA sections", () => {
    render(
      <HubPage config={DIVIDENDS_HUB_CONFIG}>
        <section data-testid="dividends-smsf-crossover">The SMSF franking crossover</section>
        <section data-testid="dividends-platform-cta">Start collecting dividends</section>
      </HubPage>
    );
    expect(screen.getByTestId("dividends-smsf-crossover")).toBeInTheDocument();
    expect(screen.getByText("The SMSF franking crossover")).toBeInTheDocument();
    expect(screen.getByText("Start collecting dividends")).toBeInTheDocument();
  });

  it("renders FAQPage JSON-LD from config.faqs", () => {
    const { container } = render(<HubPage config={DIVIDENDS_HUB_CONFIG} />);
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    const faqScript = Array.from(scripts).find((s) =>
      s.innerHTML.includes("FAQPage")
    );
    expect(faqScript).not.toBeUndefined();
  });

  it("does not render service grid slot when serviceGrid prop is omitted", () => {
    render(<HubPage config={DIVIDENDS_HUB_CONFIG} />);
    expect(screen.queryByTestId("hub-page-service-grid")).toBeNull();
  });
});
