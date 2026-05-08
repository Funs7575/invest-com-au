import { describe, it, expect } from "vitest";
import { render, screen, within } from "./setup";
import HubArticleStrip from "@/components/HubArticleStrip";
import type { HubArticleItem } from "@/components/HubArticleStrip";

const baseArticles: HubArticleItem[] = [
  {
    slug: "smsf-setup-guide",
    title: "How to Set Up an SMSF",
    excerpt: "A step-by-step guide to SMSF establishment.",
  },
  {
    slug: "smsf-investment-strategy",
    title: "SMSF Investment Strategy",
    excerpt: null,
  },
];

describe("HubArticleStrip", () => {
  describe("section structure", () => {
    it("renders the section with data-testid=hub-article-strip", () => {
      render(<HubArticleStrip heading="Featured articles" articles={baseArticles} />);
      expect(screen.getByTestId("hub-article-strip")).toBeInTheDocument();
    });

    it("renders the heading as an h2", () => {
      render(<HubArticleStrip heading="Featured SMSF articles" articles={baseArticles} />);
      const h2 = screen.getByRole("heading", { level: 2 });
      expect(h2).toHaveTextContent("Featured SMSF articles");
    });

    it("renders one card per article", () => {
      render(<HubArticleStrip heading="Articles" articles={baseArticles} />);
      expect(screen.getAllByTestId("hub-article-strip-item")).toHaveLength(2);
    });

    it("returns null when articles is empty", () => {
      render(<HubArticleStrip heading="Articles" articles={[]} />);
      expect(screen.queryByTestId("hub-article-strip")).not.toBeInTheDocument();
    });
  });

  describe("card content", () => {
    it("renders each article title as an h3", () => {
      render(<HubArticleStrip heading="Articles" articles={baseArticles} />);
      const headings = screen.getAllByRole("heading", { level: 3 });
      const titles = headings.map((h) => h.textContent);
      expect(titles).toContain("How to Set Up an SMSF");
      expect(titles).toContain("SMSF Investment Strategy");
    });

    it("renders excerpt when present", () => {
      render(<HubArticleStrip heading="Articles" articles={baseArticles} />);
      expect(
        screen.getByText("A step-by-step guide to SMSF establishment."),
      ).toBeInTheDocument();
    });

    it("omits excerpt paragraph when excerpt is null", () => {
      render(<HubArticleStrip heading="Articles" articles={baseArticles} />);
      const cards = screen.getAllByTestId("hub-article-strip-item");
      const secondCard = cards[1]!;
      expect(secondCard.querySelectorAll("p")).toHaveLength(1);
    });

    it("links each card to /article/<slug>", () => {
      render(<HubArticleStrip heading="Articles" articles={baseArticles} />);
      const cards = screen.getAllByTestId("hub-article-strip-item");
      expect(cards[0]).toHaveAttribute("href", "/article/smsf-setup-guide");
      expect(cards[1]).toHaveAttribute("href", "/article/smsf-investment-strategy");
    });

    it("each card is an anchor element", () => {
      render(<HubArticleStrip heading="Articles" articles={baseArticles} />);
      const cards = screen.getAllByTestId("hub-article-strip-item");
      for (const card of cards) {
        expect(card.tagName.toLowerCase()).toBe("a");
      }
    });

    it("each card has a Read article CTA", () => {
      render(<HubArticleStrip heading="Articles" articles={baseArticles} />);
      const ctas = screen.getAllByText("Read article");
      expect(ctas).toHaveLength(2);
    });
  });

  describe("grid columns", () => {
    it("defaults to 3-column grid (lg:grid-cols-3)", () => {
      render(<HubArticleStrip heading="Articles" articles={baseArticles} />);
      const grid = screen.getByTestId("hub-article-strip").querySelector(".grid");
      expect(grid?.className).toContain("lg:grid-cols-3");
      expect(grid?.className).not.toContain("lg:grid-cols-4");
    });

    it("renders 4-column grid when columns=4", () => {
      render(<HubArticleStrip heading="Articles" articles={baseArticles} columns={4} />);
      const grid = screen.getByTestId("hub-article-strip").querySelector(".grid");
      expect(grid?.className).toContain("lg:grid-cols-4");
      expect(grid?.className).not.toContain("lg:grid-cols-3");
    });
  });

  describe("theming", () => {
    it("applies default bg-white section style when no className override", () => {
      render(<HubArticleStrip heading="Articles" articles={baseArticles} />);
      const section = screen.getByTestId("hub-article-strip");
      expect(section.className).toContain("bg-white");
    });

    it("allows overriding the section className", () => {
      render(
        <HubArticleStrip
          heading="Read deeper"
          articles={baseArticles}
          className="py-12 bg-slate-50 border-y border-slate-200"
        />,
      );
      const section = screen.getByTestId("hub-article-strip");
      expect(section.className).toContain("bg-slate-50");
      expect(section.className).not.toContain("bg-white");
    });

    it("3-col cards use bg-slate-50 card background", () => {
      render(<HubArticleStrip heading="Articles" articles={baseArticles} />);
      const card = screen.getAllByTestId("hub-article-strip-item")[0]!;
      expect(card.className).toContain("bg-slate-50");
    });

    it("4-col cards use bg-white card background", () => {
      render(
        <HubArticleStrip heading="Articles" articles={baseArticles} columns={4} />,
      );
      const card = screen.getAllByTestId("hub-article-strip-item")[0]!;
      expect(card.className).toContain("bg-white");
    });
  });

  describe("card isolation", () => {
    it("each card contains its own title, CTA, and optional excerpt", () => {
      render(<HubArticleStrip heading="Articles" articles={baseArticles} />);
      const cards = screen.getAllByTestId("hub-article-strip-item");
      const firstCard = cards[0]!;
      expect(within(firstCard).getByRole("heading", { level: 3 })).toHaveTextContent(
        "How to Set Up an SMSF",
      );
      expect(
        within(firstCard).getByText("A step-by-step guide to SMSF establishment."),
      ).toBeInTheDocument();
      expect(within(firstCard).getByText("Read article")).toBeInTheDocument();
    });
  });

  describe("/smsf page parity", () => {
    it("renders the SMSF article strip shape end-to-end", () => {
      const smsfArticles: HubArticleItem[] = [
        { slug: "smsf-setup", title: "How to Set Up an SMSF", excerpt: "Setup guide." },
        { slug: "smsf-crypto", title: "Crypto in Your SMSF", excerpt: "ATO rules." },
        { slug: "smsf-property", title: "SMSF Property Investment", excerpt: "LRBA details." },
      ];
      render(
        <HubArticleStrip heading="Featured SMSF articles" articles={smsfArticles} />,
      );
      expect(screen.getAllByTestId("hub-article-strip-item")).toHaveLength(3);
      expect(screen.getByText("Featured SMSF articles")).toBeInTheDocument();
      expect(screen.getByText("Crypto in Your SMSF")).toBeInTheDocument();
    });
  });

  describe("/grants page parity", () => {
    it("renders the grants 4-column article strip shape end-to-end", () => {
      const grantArticles: HubArticleItem[] = [
        { slug: "rd-tax-incentive-australia-guide", title: "R&D Tax Incentive Guide", excerpt: null },
        { slug: "emdg-grant-australia-guide", title: "EMDG Grant Guide", excerpt: "Export marketing." },
        { slug: "industry-growth-program-guide", title: "Industry Growth Program", excerpt: null },
        { slug: "australian-government-grants-complete-guide", title: "Government Grants Guide", excerpt: "Complete guide." },
      ];
      render(
        <HubArticleStrip
          heading="Read deeper"
          articles={grantArticles}
          columns={4}
          className="py-12 bg-slate-50 border-y border-slate-200"
        />,
      );
      expect(screen.getAllByTestId("hub-article-strip-item")).toHaveLength(4);
      expect(screen.getByText("Read deeper")).toBeInTheDocument();
      const grid = screen.getByTestId("hub-article-strip").querySelector(".grid");
      expect(grid?.className).toContain("lg:grid-cols-4");
    });
  });
});
