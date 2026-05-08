/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "./setup";
import HubPage from "@/components/HubPage";
import type { HubConfig } from "@/lib/verticals";

vi.mock("@/components/Icon", () => ({
  default: ({ name, ...rest }: { name: string; [key: string]: unknown }) => (
    <span data-testid={`icon-${name}`} {...rest} />
  ),
}));

const MINIMAL_CONFIG: HubConfig = {
  slug: "smsf",
  title: "SMSF Hub",
  metaDescription: "SMSF services hub",
  audiences: ["trustee"],
  complianceKey: "smsf",
  hero: {
    headline: "Run your own super fund",
    subhead: "Compare SMSF setup providers and auditors.",
    primaryCta: {
      label: "Get matched with an SMSF accountant",
      href: "/smsf/quiz",
      lever: "lead_routing",
    },
  },
  faqs: [{ question: "What is an SMSF?", answer: "A self-managed super fund." }],
  leadQueue: { kind: "smsf", advisorType: "smsf_accountant" },
  relatedHubs: ["super", "grants"],
  articleFilters: { category: "smsf" },
  primaryKeywords: ["smsf australia"],
  schemaTypes: ["FinancialService", "FAQPage"],
};

const NO_FAQ_CONFIG: HubConfig = {
  ...MINIMAL_CONFIG,
  slug: "grants",
  faqs: [],
  complianceKey: "grants",
};

describe("HubPage", () => {
  it("renders the hub-page container", () => {
    render(<HubPage config={MINIMAL_CONFIG} />);
    expect(screen.getByTestId("hub-page")).toBeInTheDocument();
  });

  it("renders the HubHero from config", () => {
    render(<HubPage config={MINIMAL_CONFIG} />);
    expect(screen.getByTestId("hub-hero")).toBeInTheDocument();
  });

  it("renders the hero headline from config", () => {
    render(<HubPage config={MINIMAL_CONFIG} />);
    expect(screen.getByText("Run your own super fund")).toBeInTheDocument();
  });

  it("renders breadcrumb JSON-LD script tag", () => {
    render(<HubPage config={MINIMAL_CONFIG} />);
    expect(
      screen.getByTestId("hub-page-breadcrumb-ld")
    ).toBeInTheDocument();
  });

  it("renders FAQPage JSON-LD when faqs are present", () => {
    render(<HubPage config={MINIMAL_CONFIG} />);
    expect(screen.getByTestId("hub-page-faq-ld")).toBeInTheDocument();
  });

  it("does not render FAQPage JSON-LD when faqs array is empty", () => {
    render(<HubPage config={NO_FAQ_CONFIG} />);
    expect(
      screen.queryByTestId("hub-page-faq-ld")
    ).not.toBeInTheDocument();
  });

  it("renders the compliance block", () => {
    render(<HubPage config={MINIMAL_CONFIG} />);
    expect(screen.getByTestId("hub-page-compliance")).toBeInTheDocument();
    expect(screen.getByTestId("hub-page-compliance")).toHaveTextContent(
      "general in nature"
    );
  });

  it("compliance block for smsf key includes super warning text", () => {
    render(<HubPage config={{ ...MINIMAL_CONFIG, complianceKey: "smsf" }} />);
    const block = screen.getByTestId("hub-page-compliance");
    expect(block).toHaveTextContent("insurance cover");
  });

  it("compliance block for crypto key includes crypto warning", () => {
    render(
      <HubPage config={{ ...MINIMAL_CONFIG, complianceKey: "crypto" }} />
    );
    const block = screen.getByTestId("hub-page-compliance");
    expect(block).toHaveTextContent("Cryptocurrency is highly speculative");
  });

  it("renders service grid slot when provided", () => {
    render(
      <HubPage
        config={MINIMAL_CONFIG}
        serviceGrid={<div data-testid="my-service-grid">grid</div>}
      />
    );
    expect(screen.getByTestId("hub-page-service-grid")).toBeInTheDocument();
    expect(screen.getByTestId("my-service-grid")).toBeInTheDocument();
  });

  it("does not render service grid wrapper when slot is absent", () => {
    render(<HubPage config={MINIMAL_CONFIG} />);
    expect(
      screen.queryByTestId("hub-page-service-grid")
    ).not.toBeInTheDocument();
  });

  it("renders directory slot when provided", () => {
    render(
      <HubPage
        config={MINIMAL_CONFIG}
        directory={<div data-testid="my-directory">dir</div>}
      />
    );
    expect(screen.getByTestId("hub-page-directory")).toBeInTheDocument();
  });

  it("renders deep-dives slot when provided", () => {
    render(
      <HubPage
        config={MINIMAL_CONFIG}
        deepDives={<div data-testid="deep">dives</div>}
      />
    );
    expect(screen.getByTestId("hub-page-deep-dives")).toBeInTheDocument();
  });

  it("renders faq slot when provided", () => {
    render(
      <HubPage
        config={MINIMAL_CONFIG}
        faq={<div data-testid="my-faq">faq</div>}
      />
    );
    expect(screen.getByTestId("hub-page-faq")).toBeInTheDocument();
  });

  it("renders advisorCta slot when provided", () => {
    render(
      <HubPage
        config={MINIMAL_CONFIG}
        advisorCta={<div data-testid="cta">cta</div>}
      />
    );
    expect(screen.getByTestId("hub-page-advisor-cta")).toBeInTheDocument();
  });

  it("renders crossHubLinks slot when provided", () => {
    render(
      <HubPage
        config={MINIMAL_CONFIG}
        crossHubLinks={<div data-testid="cross">links</div>}
      />
    );
    expect(screen.getByTestId("hub-page-cross-hub-links")).toBeInTheDocument();
  });

  it("renders children in the catch-all slot", () => {
    render(
      <HubPage config={MINIMAL_CONFIG}>
        <div data-testid="custom-section">custom</div>
      </HubPage>
    );
    expect(screen.getByTestId("custom-section")).toBeInTheDocument();
  });

  it("derives breadcrumb trail from config slug", () => {
    const { container } = render(<HubPage config={MINIMAL_CONFIG} />);
    const ldScript = container.querySelector(
      '[data-testid="hub-page-breadcrumb-ld"]'
    );
    const ld = JSON.parse(ldScript?.innerHTML ?? "{}");
    expect(ld["@type"]).toBe("BreadcrumbList");
    const names = ld.itemListElement.map(
      (item: { name: string }) => item.name
    );
    expect(names).toContain("Home");
    expect(names).toContain("Smsf");
  });

  it("includes parent slug crumb when parentSlug is set", () => {
    const config = { ...MINIMAL_CONFIG, slug: "setup", parentSlug: "smsf" };
    const { container } = render(<HubPage config={config} />);
    const ldScript = container.querySelector(
      '[data-testid="hub-page-breadcrumb-ld"]'
    );
    const ld = JSON.parse(ldScript?.innerHTML ?? "{}");
    const names = ld.itemListElement.map(
      (item: { name: string }) => item.name
    );
    expect(names).toContain("Smsf");
    expect(names).toContain("Setup");
  });
});
