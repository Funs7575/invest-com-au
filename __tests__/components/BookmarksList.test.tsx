import { describe, it, expect, vi } from "vitest";
import { render, screen } from "./setup";

vi.mock("@/components/Icon", () => ({
  default: ({ name }: { name: string }) => (
    <span data-testid={`icon-${name}`} />
  ),
}));

// Must be imported after vi.mock calls
import BookmarksList from "@/app/account/bookmarks/BookmarksList";

const SAMPLE_ITEMS = [
  {
    id: 1,
    bookmark_type: "article",
    ref: "how-to-invest",
    label: "How to Invest",
    note: null,
    created_at: "2026-01-10T00:00:00Z",
  },
  {
    id: 2,
    bookmark_type: "broker",
    ref: "stake",
    label: "Stake",
    note: null,
    created_at: "2026-01-11T00:00:00Z",
  },
];

describe("BookmarksList", () => {
  describe("empty state", () => {
    it("shows the EmptyState heading when there are no bookmarks", () => {
      render(<BookmarksList initialItems={[]} />);
      expect(
        screen.getByText("Your reading list is empty"),
      ).toBeInTheDocument();
    });

    it("renders the 'Browse brokers' CTA link pointing to /compare", () => {
      render(<BookmarksList initialItems={[]} />);
      const link = screen.getByRole("link", { name: /Browse brokers/i });
      expect(link).toHaveAttribute("href", "/compare");
    });

    it("renders the 'Explore guides' secondary CTA pointing to /learn", () => {
      render(<BookmarksList initialItems={[]} />);
      const link = screen.getByRole("link", { name: /Explore guides/i });
      expect(link).toHaveAttribute("href", "/learn");
    });

    it("does not render any list items in the empty state", () => {
      render(<BookmarksList initialItems={[]} />);
      expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    });
  });

  describe("listing bookmarks", () => {
    it("groups saved listings under 'Listings' and links via the slug resolver", () => {
      render(
        <BookmarksList
          initialItems={[
            {
              id: 7,
              bookmark_type: "listing",
              ref: "riverina-aggregation-412ha",
              label: "Riverina Aggregation",
              note: null,
              created_at: "2026-06-01T00:00:00Z",
            },
          ]}
        />,
      );
      expect(screen.getByText("Listings")).toBeInTheDocument();
      const link = screen.getByRole("link", { name: "Riverina Aggregation" });
      expect(link).toHaveAttribute(
        "href",
        "/invest/listings/riverina-aggregation-412ha",
      );
    });
  });

  describe("with items", () => {
    it("renders item labels as links", () => {
      render(<BookmarksList initialItems={SAMPLE_ITEMS} />);
      expect(
        screen.getByRole("link", { name: "How to Invest" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Stake" }),
      ).toBeInTheDocument();
    });

    it("groups items under section headings", () => {
      render(<BookmarksList initialItems={SAMPLE_ITEMS} />);
      expect(screen.getByText("Articles")).toBeInTheDocument();
      expect(screen.getByText("Brokers")).toBeInTheDocument();
    });

    it("does not render the empty state when items are present", () => {
      render(<BookmarksList initialItems={SAMPLE_ITEMS} />);
      expect(
        screen.queryByText("Your reading list is empty"),
      ).not.toBeInTheDocument();
    });
  });
});
