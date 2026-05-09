/**
 * @vitest-environment jsdom
 *
 * Smoke tests for /smsf/page.tsx — W-13 proof-of-template validation.
 * Verifies the HubPage HOC correctly orchestrates the SMSF hub:
 * hero, service grid, articles section, deep-dives, and compliance block.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "../components/setup";
import SmsfHubPage from "@/app/smsf/page";

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

// ── Helpers ───────────────────────────────────────────────────────────────────

type Article = {
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  published_at: string | null;
};

function setupArticlesMock(articles: Article[] = []) {
  const limit = vi.fn().mockResolvedValue({ data: articles });
  const order = vi.fn().mockReturnValue({ limit });
  const or = vi.fn().mockReturnValue({ order });
  const eq = vi.fn().mockReturnValue({ or });
  const select = vi.fn().mockReturnValue({ eq });
  mockFrom.mockReturnValue({ select });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("SmsfHubPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupArticlesMock();
  });

  // ── HubPage HOC structure ─────────────────────────────────────────────────

  it("renders the hub-page container from HubPage HOC", async () => {
    render(await SmsfHubPage());
    expect(screen.getByTestId("hub-page")).toBeInTheDocument();
  });

  it("renders the HubHero with SMSF headline", async () => {
    render(await SmsfHubPage());
    expect(screen.getByTestId("hub-hero")).toBeInTheDocument();
    expect(
      screen.getByText("SMSF Investment & Services Hub")
    ).toBeInTheDocument();
  });

  it("renders the HubHero subhead text", async () => {
    render(await SmsfHubPage());
    expect(screen.getByText(/600,000\+ Australians/)).toBeInTheDocument();
  });

  it("renders breadcrumb JSON-LD from HubPage", async () => {
    render(await SmsfHubPage());
    const ldScript = screen.getByTestId("hub-page-breadcrumb-ld");
    expect(ldScript).toBeInTheDocument();
    const ld = JSON.parse(ldScript.innerHTML);
    expect(ld["@type"]).toBe("BreadcrumbList");
    const names = ld.itemListElement.map((item: { name: string }) => item.name);
    expect(names).toContain("Home");
    expect(names).toContain("Smsf");
  });

  it("renders FAQPage JSON-LD because SMSF_HUB_CONFIG has faqs", async () => {
    render(await SmsfHubPage());
    expect(screen.getByTestId("hub-page-faq-ld")).toBeInTheDocument();
  });

  it("renders compliance block with SMSF insurance cover warning", async () => {
    render(await SmsfHubPage());
    const block = screen.getByTestId("hub-page-compliance");
    expect(block).toBeInTheDocument();
    expect(block).toHaveTextContent("insurance cover");
  });

  // ── Service grid slot ─────────────────────────────────────────────────────

  it("renders the service grid slot wrapper", async () => {
    render(await SmsfHubPage());
    expect(screen.getByTestId("hub-page-service-grid")).toBeInTheDocument();
  });

  it("renders all four SMSF service category titles", async () => {
    render(await SmsfHubPage());
    expect(screen.getByText("Setup & Administration")).toBeInTheDocument();
    expect(screen.getByText("Annual Auditing")).toBeInTheDocument();
    expect(screen.getByText("Property in SMSF")).toBeInTheDocument();
    expect(screen.getByText("Investment Strategy")).toBeInTheDocument();
  });

  // ── Cross-link section (children slot) ───────────────────────────────────

  it("renders the SMSF Investment Guide cross-link section", async () => {
    render(await SmsfHubPage());
    expect(screen.getByText("SMSF Investment Guide")).toBeInTheDocument();
  });

  it("cross-link points to /invest/smsf", async () => {
    render(await SmsfHubPage());
    expect(
      screen.getByRole("link", { name: /read the guide/i })
    ).toHaveAttribute("href", "/invest/smsf");
  });

  // ── Articles section ─────────────────────────────────────────────────────

  it("does not render articles heading when Supabase returns empty array", async () => {
    setupArticlesMock([]);
    render(await SmsfHubPage());
    expect(
      screen.queryByText("Featured SMSF articles")
    ).not.toBeInTheDocument();
  });

  it("renders articles section when articles are returned", async () => {
    setupArticlesMock([
      {
        slug: "smsf-audit-guide",
        title: "SMSF Audit Guide 2026",
        excerpt: "What to expect from your annual audit.",
        category: "smsf",
        published_at: "2026-03-01",
      },
      {
        slug: "smsf-lrba-explained",
        title: "LRBA Explained",
        excerpt: null,
        category: "smsf",
        published_at: "2026-02-15",
      },
    ]);
    render(await SmsfHubPage());
    expect(screen.getByText("Featured SMSF articles")).toBeInTheDocument();
    expect(screen.getByText("SMSF Audit Guide 2026")).toBeInTheDocument();
    expect(screen.getByText("LRBA Explained")).toBeInTheDocument();
  });

  it("article cards link to /article/<slug>", async () => {
    setupArticlesMock([
      {
        slug: "smsf-audit-guide",
        title: "SMSF Audit Guide 2026",
        excerpt: null,
        category: "smsf",
        published_at: "2026-03-01",
      },
    ]);
    render(await SmsfHubPage());
    expect(
      screen.getByRole("link", { name: /smsf audit guide 2026/i })
    ).toHaveAttribute("href", "/article/smsf-audit-guide");
  });

  it("renders article excerpt when present", async () => {
    setupArticlesMock([
      {
        slug: "smsf-pension-phase",
        title: "SMSF Pension Phase",
        excerpt: "Transition to pension phase at 60.",
        category: "smsf",
        published_at: "2026-01-01",
      },
    ]);
    render(await SmsfHubPage());
    expect(
      screen.getByText("Transition to pension phase at 60.")
    ).toBeInTheDocument();
  });

  // ── Deep-dives section ───────────────────────────────────────────────────

  it("renders the deep-dives section from SMSF_HUB_CONFIG", async () => {
    render(await SmsfHubPage());
    expect(screen.getByText("SMSF deep-dives")).toBeInTheDocument();
  });

  it("renders the first deep-dive card from config", async () => {
    render(await SmsfHubPage());
    expect(screen.getByText("How to Set Up an SMSF")).toBeInTheDocument();
  });

  // ── Error resilience ─────────────────────────────────────────────────────

  it("renders page gracefully when Supabase throws an error", async () => {
    const limit = vi.fn().mockRejectedValue(new Error("DB unavailable"));
    const order = vi.fn().mockReturnValue({ limit });
    const or = vi.fn().mockReturnValue({ order });
    const eq = vi.fn().mockReturnValue({ or });
    const select = vi.fn().mockReturnValue({ eq });
    mockFrom.mockReturnValue({ select });

    render(await SmsfHubPage());
    // Page renders without crashing; fetchSmsfArticles catch returns []
    expect(screen.getByTestId("hub-page")).toBeInTheDocument();
    expect(
      screen.queryByText("Featured SMSF articles")
    ).not.toBeInTheDocument();
  });
});
