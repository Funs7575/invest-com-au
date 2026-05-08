/**
 * @vitest-environment jsdom
 *
 * Smoke tests for the /smsf page migration onto <HubPage> (W-13).
 * Validates that:
 *   - SMSF_HUB_CONFIG has the expected shape for the SMSF hub
 *   - Rendering <HubPage config={SMSF_HUB_CONFIG}> produces the canonical
 *     hub-page structure (hero, compliance, slots)
 *   - SMSF-specific content is present in each slot
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "./setup";
import HubPage from "@/components/HubPage";
import { SMSF_HUB_CONFIG } from "@/lib/verticals";

vi.mock("@/components/Icon", () => ({
  default: ({ name, ...rest }: { name: string; [key: string]: unknown }) => (
    <span data-testid={`icon-${name}`} {...rest} />
  ),
}));

// ── Config shape tests ───────────────────────────────────────────────────────

describe("SMSF_HUB_CONFIG", () => {
  it("has slug smsf", () => {
    expect(SMSF_HUB_CONFIG.slug).toBe("smsf");
  });

  it("hero headline mentions SMSF", () => {
    expect(SMSF_HUB_CONFIG.hero.headline).toContain("SMSF");
  });

  it("has 3 hero stats each with dataAsOf and stalesAt", () => {
    const stats = SMSF_HUB_CONFIG.hero.stats ?? [];
    expect(stats).toHaveLength(3);
    for (const stat of stats) {
      expect(stat.dataAsOf).toBeTruthy();
      expect(stat.stalesAt).toBeTruthy();
    }
  });

  it("hero primaryCta uses lead_routing lever", () => {
    expect(SMSF_HUB_CONFIG.hero.primaryCta.lever).toBe("lead_routing");
  });

  it("has 4 service grid cards each with cta text", () => {
    const cards = SMSF_HUB_CONFIG.serviceGrid ?? [];
    expect(cards).toHaveLength(4);
    for (const card of cards) {
      expect(card.cta).toBeTruthy();
    }
  });

  it("has 6 deep-dive cards", () => {
    expect(SMSF_HUB_CONFIG.deepDives).toHaveLength(6);
  });

  it("complianceKey is smsf", () => {
    expect(SMSF_HUB_CONFIG.complianceKey).toBe("smsf");
  });

  it("leadQueue is smsf kind", () => {
    expect(SMSF_HUB_CONFIG.leadQueue.kind).toBe("smsf");
  });

  it("relatedHubs is non-empty", () => {
    expect(SMSF_HUB_CONFIG.relatedHubs.length).toBeGreaterThan(0);
  });
});

// ── Render tests — validate migration contract ───────────────────────────────

describe("SmsfHub migration — <HubPage> with SMSF_HUB_CONFIG", () => {
  it("renders the hub-page container", () => {
    render(<HubPage config={SMSF_HUB_CONFIG} />);
    expect(screen.getByTestId("hub-page")).toBeInTheDocument();
  });

  it("renders HubHero with SMSF headline from config", () => {
    render(<HubPage config={SMSF_HUB_CONFIG} />);
    expect(screen.getByTestId("hub-hero")).toBeInTheDocument();
    expect(
      screen.getByText("SMSF Investment & Services Hub")
    ).toBeInTheDocument();
  });

  it("renders breadcrumb JSON-LD with smsf slug", () => {
    const { container } = render(<HubPage config={SMSF_HUB_CONFIG} />);
    const ldScript = container.querySelector(
      '[data-testid="hub-page-breadcrumb-ld"]'
    );
    expect(ldScript).not.toBeNull();
    const ld = JSON.parse(ldScript?.innerHTML ?? "{}");
    const names: string[] = ld.itemListElement.map(
      (item: { name: string }) => item.name
    );
    expect(names).toContain("Smsf");
  });

  it("renders smsf compliance block with super warning text", () => {
    render(<HubPage config={SMSF_HUB_CONFIG} />);
    const block = screen.getByTestId("hub-page-compliance");
    expect(block).toHaveTextContent("general in nature");
    expect(block).toHaveTextContent("insurance cover");
  });

  it("renders service grid slot with SMSF service card titles", () => {
    const serviceCards = (
      <div data-testid="smsf-service-grid">
        {(SMSF_HUB_CONFIG.serviceGrid ?? []).map((c) => (
          <div key={c.title} data-testid={`svc-${c.title}`}>
            {c.title}
          </div>
        ))}
      </div>
    );
    render(<HubPage config={SMSF_HUB_CONFIG} serviceGrid={serviceCards} />);
    expect(screen.getByTestId("hub-page-service-grid")).toBeInTheDocument();
    expect(screen.getByText("Setup & Administration")).toBeInTheDocument();
    expect(screen.getByText("Annual Auditing")).toBeInTheDocument();
    expect(screen.getByText("Property in SMSF")).toBeInTheDocument();
    expect(screen.getByText("Investment Strategy")).toBeInTheDocument();
  });

  it("renders deep-dives slot with SMSF deep-dive titles", () => {
    const deepDiveCards = (
      <div data-testid="smsf-deep-dives">
        {(SMSF_HUB_CONFIG.deepDives ?? []).map((c) => (
          <div key={c.href} data-testid={`dd-${c.href}`}>
            {c.title}
          </div>
        ))}
      </div>
    );
    render(<HubPage config={SMSF_HUB_CONFIG} deepDives={deepDiveCards} />);
    expect(screen.getByTestId("hub-page-deep-dives")).toBeInTheDocument();
    expect(screen.getByText("How to Set Up an SMSF")).toBeInTheDocument();
    expect(screen.getByText("SMSF Cost Calculator")).toBeInTheDocument();
  });

  it("renders cross-hub links slot", () => {
    render(
      <HubPage
        config={SMSF_HUB_CONFIG}
        crossHubLinks={
          <div data-testid="smsf-guide-link">SMSF Investment Guide</div>
        }
      />
    );
    expect(screen.getByTestId("hub-page-cross-hub-links")).toBeInTheDocument();
    expect(screen.getByText("SMSF Investment Guide")).toBeInTheDocument();
  });

  it("renders featured articles in children slot", () => {
    render(
      <HubPage config={SMSF_HUB_CONFIG}>
        <section data-testid="smsf-articles">Featured SMSF articles</section>
      </HubPage>
    );
    expect(screen.getByTestId("smsf-articles")).toBeInTheDocument();
    expect(screen.getByText("Featured SMSF articles")).toBeInTheDocument();
  });
});
