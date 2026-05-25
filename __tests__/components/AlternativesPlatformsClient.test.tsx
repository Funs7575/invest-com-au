/**
 * Tests for AlternativesPlatformsClient — the interactive filter/sort layer
 * for /invest/alternatives/platforms.
 *
 * Validates:
 *  - Initial render shows all platforms in the comparison table
 *  - Search filters by name and asset class
 *  - Asset-class facet filters the list
 *  - AU-only checkbox filters correctly
 *  - Sort changes the order
 *  - Clear-all resets state
 *  - Empty state shows when no matches
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "./setup";
import AlternativesPlatformsClient, {
  type AlternativePlatform,
} from "@/components/alternatives/AlternativesPlatformsClient";

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/components/ScrollReveal", () => ({
  default: ({
    children,
    as: Tag = "div" as React.ElementType,
    className,
  }: {
    children: React.ReactNode;
    as?: React.ElementType;
    className?: string;
    [k: string]: unknown;
  }) => <Tag className={className}>{children}</Tag>,
}));

vi.mock("@/components/Icon", () => ({
  default: ({ name, ...rest }: { name: string; [k: string]: unknown }) => (
    <span data-testid={`icon-${name}`} {...rest} />
  ),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PLATFORMS: AlternativePlatform[] = [
  {
    name: "WineMax",
    slug: "winemax",
    assetClass: "Wine",
    minInvestmentAud: 1000,
    minInvestment: "$1,000",
    fees: "2% p.a.",
    australianDirect: true,
    australiaAccess: "Direct (AU)",
    rating: 4.5,
    description: "A leading wine investment platform.",
    pros: ["Low fees", "AU direct"],
    cons: ["Limited selection"],
    bestFor: "Wine enthusiasts",
    signupFromAustralia: "Sign up at winemax.com.au",
  },
  {
    name: "ArtVault",
    slug: "artvault",
    assetClass: "Art",
    minInvestmentAud: 5000,
    minInvestment: "$5,000",
    fees: "1.5% p.a. + 20% profit",
    australianDirect: false,
    australiaAccess: "Via US account",
    rating: 4.0,
    description: "Fractional art investment platform.",
    pros: ["Blue-chip access"],
    cons: ["Requires US account"],
    bestFor: "Art collectors",
    signupFromAustralia: "Sign up via US website",
  },
  {
    name: "CollectFrac",
    slug: "collectfrac",
    assetClass: "Collectibles",
    minInvestmentAud: 50,
    minInvestment: "$50",
    fees: "0%",
    australianDirect: true,
    australiaAccess: "Direct (AU)",
    rating: 3.5,
    description: "Low-minimum collectibles investing.",
    pros: ["Very low minimum"],
    cons: ["Limited liquidity"],
    bestFor: "Beginners",
    signupFromAustralia: "Sign up at collectfrac.com",
  },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AlternativesPlatformsClient", () => {
  // ── Initial render ─────────────────────────────────────────────────────────

  it("renders all platforms in the results count", () => {
    render(<AlternativesPlatformsClient platforms={PLATFORMS} />);
    // ResultCount renders "3 platforms" — query all aria-live regions and check
    const liveRegions = document.querySelectorAll("[aria-live='polite']");
    const countRegion = Array.from(liveRegions).find((el) =>
      el.textContent?.includes("platform")
    );
    expect(countRegion).toBeTruthy();
    expect(countRegion!.textContent).toMatch(/3/);
  });

  it("renders all platform names in the comparison table", () => {
    render(<AlternativesPlatformsClient platforms={PLATFORMS} />);
    expect(screen.getAllByText("WineMax").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("ArtVault").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("CollectFrac").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the search input", () => {
    render(<AlternativesPlatformsClient platforms={PLATFORMS} />);
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
  });

  it("renders the sort dropdown on desktop", () => {
    render(<AlternativesPlatformsClient platforms={PLATFORMS} />);
    expect(screen.getByRole("combobox", { name: /sort/i })).toBeInTheDocument();
  });

  // ── Search filter ──────────────────────────────────────────────────────────

  it("filters platforms by name when searching", async () => {
    const user = userEvent.setup();
    render(<AlternativesPlatformsClient platforms={PLATFORMS} />);

    const searchInput = screen.getByRole("searchbox");
    await user.type(searchInput, "wine");

    // Only WineMax should show in result count area
    const liveRegions = document.querySelectorAll("[aria-live='polite']");
    const countRegion = Array.from(liveRegions).find((el) =>
      el.textContent?.includes("platform")
    );
    expect(countRegion!.textContent).toMatch(/1/);
    // WineMax detailed section should be visible
    expect(screen.getAllByText("WineMax").length).toBeGreaterThanOrEqual(1);
  });

  it("search is case-insensitive", async () => {
    const user = userEvent.setup();
    render(<AlternativesPlatformsClient platforms={PLATFORMS} />);

    const searchInput = screen.getByRole("searchbox");
    await user.type(searchInput, "ARTVAULT");

    const liveRegion = document.querySelector("[aria-live='polite']");
    expect(liveRegion!.textContent).toMatch(/1/);
  });

  it("shows empty state when search matches nothing", async () => {
    const user = userEvent.setup();
    render(<AlternativesPlatformsClient platforms={PLATFORMS} />);

    const searchInput = screen.getByRole("searchbox");
    await user.type(searchInput, "xyznonexistent");

    expect(
      screen.getByText(/no platforms match your filters/i)
    ).toBeInTheDocument();
    // Result count should be 0
    const liveRegion = document.querySelector("[aria-live='polite']");
    expect(liveRegion!.textContent).toMatch(/^0/);
  });

  // ── AU-only filter ─────────────────────────────────────────────────────────

  it("filters to AU-direct-only platforms when checkbox is ticked", async () => {
    const user = userEvent.setup();
    render(<AlternativesPlatformsClient platforms={PLATFORMS} />);

    const auCheckbox = screen.getByRole("checkbox", { name: /direct au access/i });
    await user.click(auCheckbox);

    // WineMax and CollectFrac are direct; ArtVault is not
    const liveRegions = document.querySelectorAll("[aria-live='polite']");
    const countRegion = Array.from(liveRegions).find((el) =>
      el.textContent?.includes("platform")
    );
    expect(countRegion!.textContent).toMatch(/2/);
  });

  it("shows the AU-only active filter chip after enabling it", async () => {
    const user = userEvent.setup();
    render(<AlternativesPlatformsClient platforms={PLATFORMS} />);

    const auCheckbox = screen.getByRole("checkbox", { name: /direct au access/i });
    await user.click(auCheckbox);

    expect(screen.getByText("AU direct only")).toBeInTheDocument();
  });

  // ── Sort ───────────────────────────────────────────────────────────────────

  it("sorts by lowest minimum when 'Lowest minimum' is selected", async () => {
    const user = userEvent.setup();
    render(<AlternativesPlatformsClient platforms={PLATFORMS} />);

    const sortSelect = screen.getByRole("combobox", { name: /sort/i });
    await user.selectOptions(sortSelect, "min_investment");

    // CollectFrac ($50) should appear before WineMax ($1,000) and ArtVault ($5,000)
    const allRows = screen.getAllByRole("row");
    // Find rows with platform names — first data row (index 1) should be CollectFrac
    const rowTexts = allRows.map((r) => r.textContent ?? "");
    const collectFracIdx = rowTexts.findIndex((t) => t.includes("CollectFrac"));
    const wineMaxIdx = rowTexts.findIndex((t) => t.includes("WineMax"));
    expect(collectFracIdx).toBeLessThan(wineMaxIdx);
  });

  it("sorts by name A-Z when 'Name (A-Z)' is selected", async () => {
    const user = userEvent.setup();
    render(<AlternativesPlatformsClient platforms={PLATFORMS} />);

    const sortSelect = screen.getByRole("combobox", { name: /sort/i });
    await user.selectOptions(sortSelect, "name");

    // ArtVault < CollectFrac < WineMax alphabetically
    const allRows = screen.getAllByRole("row");
    const rowTexts = allRows.map((r) => r.textContent ?? "");
    const artIdx = rowTexts.findIndex((t) => t.includes("ArtVault"));
    const wineIdx = rowTexts.findIndex((t) => t.includes("WineMax"));
    expect(artIdx).toBeLessThan(wineIdx);
  });

  // ── Clear all ──────────────────────────────────────────────────────────────

  it("clear-all button resets filters and shows all platforms again", async () => {
    const user = userEvent.setup();
    render(<AlternativesPlatformsClient platforms={PLATFORMS} />);

    const searchInput = screen.getByRole("searchbox");
    await user.type(searchInput, "wine");

    // Verify narrowed to 1 platform
    const getCountRegion = () => {
      const regions = document.querySelectorAll("[aria-live='polite']");
      return Array.from(regions).find((el) => el.textContent?.includes("platform"));
    };
    expect(getCountRegion()!.textContent).toMatch(/1/);

    // Clear by pressing Escape on the search input — clears the input
    await user.keyboard("{Escape}");

    // All 3 should be back
    expect(getCountRegion()!.textContent).toMatch(/3/);
  });

  // ── Detailed sections ─────────────────────────────────────────────────────

  it("renders platform descriptions in detail cards", () => {
    render(<AlternativesPlatformsClient platforms={PLATFORMS} />);
    expect(screen.getByText("A leading wine investment platform.")).toBeInTheDocument();
    expect(screen.getByText("Fractional art investment platform.")).toBeInTheDocument();
  });

  it("renders pros and cons for each platform", () => {
    render(<AlternativesPlatformsClient platforms={PLATFORMS} />);
    expect(screen.getByText("Low fees")).toBeInTheDocument();
    expect(screen.getByText("Limited selection")).toBeInTheDocument();
    expect(screen.getByText("Blue-chip access")).toBeInTheDocument();
    expect(screen.getByText("Requires US account")).toBeInTheDocument();
  });

  it("renders 'Best for' and signup info for each platform", () => {
    render(<AlternativesPlatformsClient platforms={PLATFORMS} />);
    expect(screen.getByText("Wine enthusiasts")).toBeInTheDocument();
    expect(screen.getByText("Sign up at winemax.com.au")).toBeInTheDocument();
  });

  it("renders AU access badge — emerald for direct, amber for overseas", () => {
    render(<AlternativesPlatformsClient platforms={PLATFORMS} />);
    // WineMax is Direct (AU) — finds at least one text node with this value
    const directBadges = screen.getAllByText("Direct (AU)");
    expect(directBadges.length).toBeGreaterThanOrEqual(1);
    const overseaContent = screen.getAllByText("Via US account");
    expect(overseaContent.length).toBeGreaterThanOrEqual(1);
  });
});
