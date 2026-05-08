import { describe, it, expect } from "vitest";
import { render, screen, within } from "./setup";
import DirectoryGrid, {
  DEFAULT_FEE_BANDS,
  type DirectoryItem,
  type FilterConfig,
} from "@/components/DirectoryGrid";

const makeItem = (overrides: Partial<DirectoryItem> & Pick<DirectoryItem, "id" | "name">): DirectoryItem => ({
  slug: `item-${overrides.id}`,
  ctaHref: `/advisor/item-${overrides.id}`,
  ...overrides,
});

const ITEMS: DirectoryItem[] = [
  makeItem({ id: 1, name: "Alice", locationState: "NSW", feeCents: 60000 }),
  makeItem({ id: 2, name: "Bob", locationState: "VIC", feeCents: 120000 }),
  makeItem({ id: 3, name: "Carol", locationState: "NSW", feeCents: 180000 }),
];

const STATE_FILTER: FilterConfig = { type: "state" };
const FEE_FILTER: FilterConfig = { type: "fee-band", bands: DEFAULT_FEE_BANDS };

describe("DirectoryGrid", () => {
  describe("basic rendering", () => {
    it("renders all items when no filters configured", () => {
      render(<DirectoryGrid items={ITEMS} />);
      const cards = screen.getAllByTestId("directory-card");
      expect(cards).toHaveLength(3);
    });

    it("renders item names", () => {
      render(<DirectoryGrid items={ITEMS} />);
      expect(screen.getByText("Alice")).toBeInTheDocument();
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("Carol")).toBeInTheDocument();
    });

    it("omits filter bar when no filters provided", () => {
      render(<DirectoryGrid items={ITEMS} />);
      expect(screen.queryByTestId("directory-filter")).not.toBeInTheDocument();
    });

    it("shows filter bar when filters provided", () => {
      render(<DirectoryGrid items={ITEMS} filters={[STATE_FILTER]} />);
      expect(screen.getByTestId("directory-filter")).toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows default empty message when items is empty", () => {
      render(<DirectoryGrid items={[]} />);
      expect(screen.getByTestId("directory-grid-empty")).toBeInTheDocument();
    });

    it("renders custom emptyState when provided", () => {
      render(
        <DirectoryGrid
          items={[]}
          emptyState={<p>No professionals found</p>}
        />,
      );
      expect(screen.getByText("No professionals found")).toBeInTheDocument();
    });
  });

  describe("sponsored items", () => {
    it("renders sponsored items before regular items", () => {
      const sponsored: DirectoryItem = makeItem({ id: 99, name: "Zara (Sponsored)", isSponsored: true });
      const mixed = [ITEMS[0]!, ITEMS[1]!, sponsored];
      render(<DirectoryGrid items={mixed} />);
      const cards = screen.getAllByTestId("directory-card");
      // sponsored card should be first
      expect(within(cards[0]!).getByTestId("directory-card-name")).toHaveTextContent("Zara (Sponsored)");
    });

    it("shows Sponsored badge on sponsored cards", () => {
      const sponsored = makeItem({ id: 99, name: "Sponsored Pro", isSponsored: true });
      render(<DirectoryGrid items={[sponsored]} />);
      expect(screen.getByText("Sponsored")).toBeInTheDocument();
    });

    it("sponsored items are not filtered out by state filter", async () => {
      const sponsored = makeItem({ id: 99, name: "Pinned Pro", isSponsored: true, locationState: "QLD" });
      const regular = makeItem({ id: 1, name: "NSW Pro", locationState: "NSW" });
      render(<DirectoryGrid items={[sponsored, regular]} filters={[STATE_FILTER]} />);

      // change state filter to NSW — sponsored QLD item should remain
      const stateSelect = screen.getByTestId("directory-filter-state") as HTMLSelectElement;
      stateSelect.value = "NSW";
      stateSelect.dispatchEvent(new Event("change", { bubbles: true }));

      // Sponsored item is always shown regardless of state filter
      expect(screen.getByText("Pinned Pro")).toBeInTheDocument();
    });
  });

  describe("count display", () => {
    it("shows correct count with default noun", () => {
      render(<DirectoryGrid items={ITEMS} filters={[STATE_FILTER]} />);
      expect(screen.getByTestId("directory-filter-count")).toHaveTextContent("3 results");
    });

    it("uses singular noun for count of 1", () => {
      render(<DirectoryGrid items={[ITEMS[0]!]} filters={[STATE_FILTER]} noun="auditor" />);
      expect(screen.getByTestId("directory-filter-count")).toHaveTextContent("1 auditor");
    });

    it("uses plural noun for count > 1", () => {
      render(<DirectoryGrid items={ITEMS} filters={[STATE_FILTER]} noun="auditor" />);
      expect(screen.getByTestId("directory-filter-count")).toHaveTextContent("3 auditors");
    });
  });

  describe("DEFAULT_FEE_BANDS export", () => {
    it("exports 5 fee bands", () => {
      expect(DEFAULT_FEE_BANDS).toHaveLength(5);
    });

    it("first band covers all fees (Any fee)", () => {
      const first = DEFAULT_FEE_BANDS[0]!;
      expect(first.minCents).toBe(0);
      expect(first.maxCents).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe("testid and accessibility", () => {
    it("renders data-testid=directory-grid on wrapper", () => {
      render(<DirectoryGrid items={ITEMS} />);
      expect(screen.getByTestId("directory-grid")).toBeInTheDocument();
    });

    it("renders data-testid=directory-grid-list when items present", () => {
      render(<DirectoryGrid items={ITEMS} />);
      expect(screen.getByTestId("directory-grid-list")).toBeInTheDocument();
    });

    it("renders data-testid=directory-grid-empty when empty", () => {
      render(<DirectoryGrid items={[]} />);
      expect(screen.getByTestId("directory-grid-empty")).toBeInTheDocument();
    });
  });
});
