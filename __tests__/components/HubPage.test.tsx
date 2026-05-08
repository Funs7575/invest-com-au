/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HubPage from "@/components/HubPage";
import type { HubConfig } from "@/lib/verticals";

// Mock HubHero and HubServiceGrid — both import <Icon> which chains to
// @/lib/logger and causes jsdom failures without a mock (same pattern as
// EligibilityQuiz, Calculator, etc.).
vi.mock("@/components/HubHero", () => ({
  default: ({
    breadcrumbs,
  }: {
    hero: unknown;
    breadcrumbs: Array<{ name: string; href?: string }>;
  }) => (
    <div
      data-testid="mock-hub-hero"
      data-breadcrumb-count={breadcrumbs.length}
    />
  ),
}));

vi.mock("@/components/HubServiceGrid", () => ({
  default: ({
    items,
    heading,
    columns,
  }: {
    items: unknown[];
    heading: string;
    columns?: number;
  }) => (
    <div
      data-testid="mock-hub-service-grid"
      data-item-count={items.length}
      data-heading={heading}
      data-columns={columns ?? 2}
    />
  ),
}));

// Minimal HubConfig for most tests (no optional slots populated)
const BASE_CONFIG: HubConfig = {
  slug: "test-hub",
  title: "Test Hub",
  metaDescription: "A test hub for unit tests.",
  audiences: ["trustee"],
  complianceKey: "factual_information",
  hero: {
    headline: "Test Headline",
    subhead: "Test subhead copy.",
    primaryCta: { label: "Get started", href: "/test", lever: "lead_routing" },
  },
  faqs: [
    { question: "What is a test?", answer: "A test verifies behaviour." },
    { question: "Why test?", answer: "To prevent regressions." },
  ],
  leadQueue: { kind: "general", topic: "testing" },
  relatedHubs: ["smsf", "grants"],
  articleFilters: {},
  primaryKeywords: ["test hub"],
  schemaTypes: ["WebPage"],
};

function renderHub(overrides: Partial<HubConfig> = {}) {
  const config = { ...BASE_CONFIG, ...overrides };
  return render(<HubPage config={config} />);
}

describe("HubPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the hub-page container", () => {
    renderHub();
    expect(screen.getByTestId("hub-page")).toBeInTheDocument();
  });

  it("renders HubHero", () => {
    renderHub();
    expect(screen.getByTestId("mock-hub-hero")).toBeInTheDocument();
  });

  it("passes correct breadcrumb count to HubHero for top-level hub (no parentSlug)", () => {
    renderHub();
    // breadcrumbs = [Home, Test Hub] → 2
    expect(screen.getByTestId("mock-hub-hero")).toHaveAttribute(
      "data-breadcrumb-count",
      "2"
    );
  });

  it("passes correct breadcrumb count to HubHero when parentSlug is set", () => {
    renderHub({ parentSlug: "super" });
    // breadcrumbs = [Home, Super, Test Hub] → 3
    expect(screen.getByTestId("mock-hub-hero")).toHaveAttribute(
      "data-breadcrumb-count",
      "3"
    );
  });

  it("renders HubServiceGrid when serviceGrid is configured", () => {
    renderHub({
      serviceGrid: [
        {
          title: "Setup",
          description: "Setup description.",
          href: "/setup",
          icon: "settings",
          cta: "Get set up",
        },
        {
          title: "Audit",
          description: "Audit description.",
          href: "/audit",
          icon: "shield-check",
        },
      ],
    });
    expect(screen.getByTestId("mock-hub-service-grid")).toBeInTheDocument();
  });

  it("omits HubServiceGrid when serviceGrid is absent", () => {
    renderHub({ serviceGrid: undefined });
    expect(
      screen.queryByTestId("mock-hub-service-grid")
    ).not.toBeInTheDocument();
  });

  it("omits HubServiceGrid when serviceGrid is empty", () => {
    renderHub({ serviceGrid: [] });
    expect(
      screen.queryByTestId("mock-hub-service-grid")
    ).not.toBeInTheDocument();
  });

  it("passes 3 columns to HubServiceGrid when more than 4 items", () => {
    renderHub({
      serviceGrid: [
        { title: "A", description: "d", href: "/a" },
        { title: "B", description: "d", href: "/b" },
        { title: "C", description: "d", href: "/c" },
        { title: "D", description: "d", href: "/d" },
        { title: "E", description: "d", href: "/e" },
      ],
    });
    expect(screen.getByTestId("mock-hub-service-grid")).toHaveAttribute(
      "data-columns",
      "3"
    );
  });

  it("passes 2 columns to HubServiceGrid when 4 or fewer items", () => {
    renderHub({
      serviceGrid: [
        { title: "A", description: "d", href: "/a" },
        { title: "B", description: "d", href: "/b" },
      ],
    });
    expect(screen.getByTestId("mock-hub-service-grid")).toHaveAttribute(
      "data-columns",
      "2"
    );
  });

  it("renders children in the content slot", () => {
    render(
      <HubPage config={BASE_CONFIG}>
        <div data-testid="custom-slot">Custom content</div>
      </HubPage>
    );
    expect(screen.getByTestId("custom-slot")).toBeInTheDocument();
  });

  it("renders FAQ section when faqs are configured", () => {
    renderHub();
    expect(screen.getByTestId("hub-faq-section")).toBeInTheDocument();
    const items = screen.getAllByTestId("hub-faq-item");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("What is a test?");
    expect(items[1]).toHaveTextContent("Why test?");
  });

  it("omits FAQ section when faqs array is empty", () => {
    renderHub({ faqs: [] });
    expect(screen.queryByTestId("hub-faq-section")).not.toBeInTheDocument();
  });

  it("renders compliance block always", () => {
    renderHub();
    expect(screen.getByTestId("hub-compliance")).toBeInTheDocument();
  });

  it("renders key-specific compliance addendum for smsf", () => {
    renderHub({ complianceKey: "smsf" });
    expect(screen.getByTestId("hub-compliance-addendum")).toHaveTextContent(
      "Self-Managed Super Funds"
    );
  });

  it("renders key-specific compliance addendum for crypto", () => {
    renderHub({ complianceKey: "crypto" });
    expect(screen.getByTestId("hub-compliance-addendum")).toHaveTextContent(
      "Cryptocurrency is highly speculative"
    );
  });

  it("omits compliance addendum for factual_information key", () => {
    renderHub({ complianceKey: "factual_information" });
    expect(
      screen.queryByTestId("hub-compliance-addendum")
    ).not.toBeInTheDocument();
  });

  it("renders breadcrumb JSON-LD script", () => {
    renderHub();
    const script = document.querySelector(
      'script[data-testid="hub-breadcrumb-jsonld"]'
    );
    expect(script).not.toBeNull();
    expect(script?.innerHTML).toContain("BreadcrumbList");
  });

  it("renders FAQPage JSON-LD when faqs exist", () => {
    renderHub();
    const script = document.querySelector(
      'script[data-testid="hub-faqpage-jsonld"]'
    );
    expect(script).not.toBeNull();
    expect(script?.innerHTML).toContain("FAQPage");
  });

  it("omits FAQPage JSON-LD when no faqs", () => {
    renderHub({ faqs: [] });
    const script = document.querySelector(
      'script[data-testid="hub-faqpage-jsonld"]'
    );
    expect(script).toBeNull();
  });
});
