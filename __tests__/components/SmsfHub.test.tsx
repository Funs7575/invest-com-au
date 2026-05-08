/**
 * @vitest-environment jsdom
 *
 * Smoke tests for the /smsf page migration onto <HubPage> (W-13).
 * Validates that:
 *   - smsfHubConfig has the expected shape for the SMSF hub
 *   - Rendering <HubPage config={smsfHubConfig}> produces the canonical
 *     hub-page structure (hero, compliance, slots)
 *   - SMSF-specific content is present in each slot
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "./setup";
import HubPage from "@/components/HubPage";
import { smsfHubConfig } from "@/lib/hub-configs/smsf";

vi.mock("@/components/Icon", () => ({
  default: ({ name, ...rest }: { name: string; [key: string]: unknown }) => (
    <span data-testid={`icon-${name}`} {...rest} />
  ),
}));

// ── Config shape tests ───────────────────────────────────────────────────────

describe("smsfHubConfig", () => {
  it("has slug smsf", () => {
    expect(smsfHubConfig.slug).toBe("smsf");
  });

  it("hero headline mentions SMSF", () => {
    expect(smsfHubConfig.hero.headline).toContain("SMSF");
  });

  it("has 3 hero stats each with dataAsOf and stalesAt", () => {
    const stats = smsfHubConfig.hero.stats ?? [];
    expect(stats).toHaveLength(3);
    for (const stat of stats) {
      expect(stat.dataAsOf).toBeTruthy();
      expect(stat.stalesAt).toBeTruthy();
    }
  });

  it("hero primaryCta uses lead_routing lever", () => {
    expect(smsfHubConfig.hero.primaryCta.lever).toBe("lead_routing");
  });

  it("has 4 service grid cards each with cta text", () => {
    const cards = smsfHubConfig.serviceGrid ?? [];
    expect(cards).toHaveLength(4);
    for (const card of cards) {
      expect(card.cta).toBeTruthy();
    }
  });

  it("has 6 deep-dive cards", () => {
    expect(smsfHubConfig.deepDives).toHaveLength(6);
  });

  it("complianceKey is smsf", () => {
    expect(smsfHubConfig.complianceKey).toBe("smsf");
  });

  it("leadQueue is smsf kind", () => {
    expect(smsfHubConfig.leadQueue.kind).toBe("smsf");
  });

  it("relatedHubs is non-empty", () => {
    expect(smsfHubConfig.relatedHubs.length).toBeGreaterThan(0);
  });
});

// ── Render tests — validate migration contract ───────────────────────────────

describe("SmsfHub migration — <HubPage> with smsfHubConfig", () => {
  it("renders the hub-page container", () => {
    render(<HubPage config={smsfHubConfig} />);
    expect(screen.getByTestId("hub-page")).toBeInTheDocument();
  });

  it("renders HubHero with SMSF headline from config", () => {
    render(<HubPage config={smsfHubConfig} />);
    expect(screen.getByTestId("hub-hero")).toBeInTheDocument();
    expect(
      screen.getByText("SMSF Investment & Services Hub")
    ).toBeInTheDocument();
  });

  it("renders breadcrumb JSON-LD with smsf slug", () => {
    const { container } = render(<HubPage config={smsfHubConfig} />);
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
    render(<HubPage config={smsfHubConfig} />);
    const block = screen.getByTestId("hub-page-compliance");
    expect(block).toHaveTextContent("General advice warning.");
    expect(block).toHaveTextContent("insurance cover");
  });

  it("renders service grid slot with SMSF service card titles", () => {
    const serviceCards = (
      <div data-testid="smsf-service-grid">
        {(smsfHubConfig.serviceGrid ?? []).map((c) => (
          <div key={c.title} data-testid={`svc-${c.title}`}>
            {c.title}
          </div>
        ))}
      </div>
    );
    render(<HubPage config={smsfHubConfig} serviceGrid={serviceCards} />);
    expect(screen.getByTestId("hub-page-service-grid")).toBeInTheDocument();
    expect(screen.getByText("Setup & Administration")).toBeInTheDocument();
    expect(screen.getByText("Annual Auditing")).toBeInTheDocument();
    expect(screen.getByText("Property in SMSF")).toBeInTheDocument();
    expect(screen.getByText("Investment Strategy")).toBeInTheDocument();
  });

  it("renders deep-dives slot with SMSF deep-dive titles", () => {
    const deepDiveCards = (
      <div data-testid="smsf-deep-dives">
        {(smsfHubConfig.deepDives ?? []).map((c) => (
          <div key={c.href} data-testid={`dd-${c.href}`}>
            {c.title}
          </div>
        ))}
      </div>
    );
    render(<HubPage config={smsfHubConfig} deepDives={deepDiveCards} />);
    expect(screen.getByTestId("hub-page-deep-dives")).toBeInTheDocument();
    expect(screen.getByText("How to Set Up an SMSF")).toBeInTheDocument();
    expect(screen.getByText("SMSF Cost Calculator")).toBeInTheDocument();
  });

  it("renders cross-hub links slot", () => {
    render(
      <HubPage
        config={smsfHubConfig}
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
      <HubPage config={smsfHubConfig}>
        <section data-testid="smsf-articles">Featured SMSF articles</section>
      </HubPage>
    );
    expect(screen.getByTestId("smsf-articles")).toBeInTheDocument();
    expect(screen.getByText("Featured SMSF articles")).toBeInTheDocument();
  });
});
