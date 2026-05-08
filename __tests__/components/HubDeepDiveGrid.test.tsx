import { describe, it, expect } from "vitest";
import { render, screen, within } from "./setup";
import HubDeepDiveGrid from "@/components/HubDeepDiveGrid";
import type { HubDeepDiveItem } from "@/components/HubDeepDiveGrid";

const baseItems: HubDeepDiveItem[] = [
  {
    title: "How to Set Up an SMSF",
    desc: "7-step setup, $800–$3,500 cost breakdown.",
    href: "/smsf/setup",
  },
  {
    title: "Crypto in Your SMSF",
    desc: "ATO rules and the sole-purpose test.",
    href: "/smsf/crypto",
  },
];

describe("HubDeepDiveGrid", () => {
  describe("section structure", () => {
    it("renders the section with data-testid=hub-deep-dive-grid", () => {
      render(<HubDeepDiveGrid heading="SMSF deep-dives" items={baseItems} />);
      expect(screen.getByTestId("hub-deep-dive-grid")).toBeInTheDocument();
    });

    it("renders the heading as an h2", () => {
      render(<HubDeepDiveGrid heading="SMSF deep-dives" items={baseItems} />);
      const h2 = screen.getByRole("heading", { level: 2 });
      expect(h2).toHaveTextContent("SMSF deep-dives");
    });

    it("renders one card per item", () => {
      render(<HubDeepDiveGrid heading="Deep-dives" items={baseItems} />);
      expect(screen.getAllByTestId("hub-deep-dive-grid-item")).toHaveLength(2);
    });

    it("renders an empty grid when items is empty", () => {
      render(<HubDeepDiveGrid heading="Deep-dives" items={[]} />);
      expect(screen.queryAllByTestId("hub-deep-dive-grid-item")).toHaveLength(0);
      expect(screen.getByTestId("hub-deep-dive-grid")).toBeInTheDocument();
    });
  });

  describe("subheading", () => {
    it("renders subheading when provided", () => {
      render(
        <HubDeepDiveGrid
          heading="Deep-dives"
          items={baseItems}
          subheading="Practical guides for your SMSF."
        />,
      );
      expect(
        screen.getByText("Practical guides for your SMSF."),
      ).toBeInTheDocument();
    });

    it("omits subheading paragraph when not provided", () => {
      render(<HubDeepDiveGrid heading="Deep-dives" items={baseItems} />);
      const section = screen.getByTestId("hub-deep-dive-grid");
      expect(section.querySelector(":scope > div > p")).toBeNull();
    });
  });

  describe("card content", () => {
    it("renders each item title as an h3", () => {
      render(<HubDeepDiveGrid heading="Deep-dives" items={baseItems} />);
      const headings = screen.getAllByRole("heading", { level: 3 });
      const titles = headings.map((h) => h.textContent);
      expect(titles).toContain("How to Set Up an SMSF");
      expect(titles).toContain("Crypto in Your SMSF");
    });

    it("renders each item desc", () => {
      render(<HubDeepDiveGrid heading="Deep-dives" items={baseItems} />);
      expect(
        screen.getByText("7-step setup, $800–$3,500 cost breakdown."),
      ).toBeInTheDocument();
      expect(
        screen.getByText("ATO rules and the sole-purpose test."),
      ).toBeInTheDocument();
    });

    it("links each card to the configured href", () => {
      render(<HubDeepDiveGrid heading="Deep-dives" items={baseItems} />);
      const cards = screen.getAllByTestId("hub-deep-dive-grid-item");
      expect(cards[0]).toHaveAttribute("href", "/smsf/setup");
      expect(cards[1]).toHaveAttribute("href", "/smsf/crypto");
    });

    it("each card is an anchor element", () => {
      render(<HubDeepDiveGrid heading="Deep-dives" items={baseItems} />);
      for (const card of screen.getAllByTestId("hub-deep-dive-grid-item")) {
        expect(card.tagName.toLowerCase()).toBe("a");
      }
    });
  });

  describe("CTA", () => {
    it("renders cta text in each card when cta is provided", () => {
      render(
        <HubDeepDiveGrid heading="Deep-dives" items={baseItems} cta="Read guide" />,
      );
      const ctas = screen.getAllByText("Read guide");
      expect(ctas).toHaveLength(2);
    });

    it("omits cta span when cta prop is not provided", () => {
      render(<HubDeepDiveGrid heading="Deep-dives" items={baseItems} />);
      expect(screen.queryByText("Read guide")).not.toBeInTheDocument();
    });
  });

  describe("grid columns", () => {
    it("defaults to 3-column grid (lg:grid-cols-3)", () => {
      render(<HubDeepDiveGrid heading="Deep-dives" items={baseItems} />);
      const grid = screen.getByTestId("hub-deep-dive-grid").querySelector(".grid");
      expect(grid?.className).toContain("lg:grid-cols-3");
      expect(grid?.className).not.toContain("lg:grid-cols-4");
    });

    it("renders 4-column grid when columns=4", () => {
      render(<HubDeepDiveGrid heading="Deep-dives" items={baseItems} columns={4} />);
      const grid = screen.getByTestId("hub-deep-dive-grid").querySelector(".grid");
      expect(grid?.className).toContain("lg:grid-cols-4");
      expect(grid?.className).not.toContain("lg:grid-cols-3");
    });

    it("renders 2-column grid when columns=2", () => {
      render(<HubDeepDiveGrid heading="Deep-dives" items={baseItems} columns={2} />);
      const grid = screen.getByTestId("hub-deep-dive-grid").querySelector(".grid");
      expect(grid?.className).toContain("md:grid-cols-2");
      expect(grid?.className).not.toContain("lg:grid-cols-3");
    });
  });

  describe("theming", () => {
    it("applies the default section style when no className override", () => {
      render(<HubDeepDiveGrid heading="Deep-dives" items={baseItems} />);
      const section = screen.getByTestId("hub-deep-dive-grid");
      expect(section.className).toContain("bg-white");
      expect(section.className).toContain("border-t");
    });

    it("allows overriding the section className", () => {
      render(
        <HubDeepDiveGrid
          heading="Entry points"
          items={baseItems}
          className="py-12 bg-white"
        />,
      );
      const section = screen.getByTestId("hub-deep-dive-grid");
      expect(section.className).toBe("py-12 bg-white");
    });
  });

  describe("card isolation", () => {
    it("each card contains its own title and desc", () => {
      render(
        <HubDeepDiveGrid heading="Deep-dives" items={baseItems} cta="Read guide" />,
      );
      const cards = screen.getAllByTestId("hub-deep-dive-grid-item");
      const firstCard = cards[0]!;
      expect(within(firstCard).getByRole("heading", { level: 3 })).toHaveTextContent(
        "How to Set Up an SMSF",
      );
      expect(
        within(firstCard).getByText("7-step setup, $800–$3,500 cost breakdown."),
      ).toBeInTheDocument();
      expect(within(firstCard).getByText("Read guide")).toBeInTheDocument();
    });
  });

  describe("/smsf page parity", () => {
    it("renders the smsf 6-card deep-dive shape end-to-end", () => {
      const smsfItems: HubDeepDiveItem[] = [
        { title: "How to Set Up an SMSF", desc: "7-step setup.", href: "/smsf/setup" },
        { title: "Crypto in Your SMSF", desc: "ATO rules.", href: "/smsf/crypto" },
        { title: "SMSF Property Investment", desc: "LRBA borrowing.", href: "/smsf/property" },
        { title: "SMSF Investment Strategy", desc: "5 mandatory elements.", href: "/smsf/investment-strategy" },
        { title: "SMSF Compliance Checklist", desc: "12 obligations.", href: "/smsf/checklist" },
        { title: "SMSF Cost Calculator", desc: "Project costs.", href: "/smsf-calculator" },
      ];
      render(
        <HubDeepDiveGrid
          heading="SMSF deep-dives"
          subheading="Practical guides for the most common SMSF questions."
          items={smsfItems}
          cta="Read guide"
        />,
      );
      expect(screen.getAllByTestId("hub-deep-dive-grid-item")).toHaveLength(6);
      expect(screen.getByText("SMSF deep-dives")).toBeInTheDocument();
      expect(
        screen.getByText("Practical guides for the most common SMSF questions."),
      ).toBeInTheDocument();
      expect(screen.getAllByText("Read guide")).toHaveLength(6);
    });
  });

  describe("/dividends page parity", () => {
    it("renders the dividends 4-column no-cta shape end-to-end", () => {
      const dividendItems: HubDeepDiveItem[] = [
        { title: "ASX High-Yield Stocks", desc: "WDS, major banks.", href: "/article/high-dividend-asx-stocks-2026" },
        { title: "Dividend ETFs", desc: "VHY, A200, HVST.", href: "/article/best-dividend-etfs-australia" },
        { title: "Franking Credits Explained", desc: "How the offset works.", href: "/dividends/franking-credits" },
        { title: "Franking Calculator", desc: "See the after-tax outcome.", href: "/dividends/calculator" },
      ];
      render(
        <HubDeepDiveGrid
          heading="Four entry points"
          subheading="Pick the path that matches your portfolio stage."
          items={dividendItems}
          columns={4}
          className="py-12 bg-white"
        />,
      );
      expect(screen.getAllByTestId("hub-deep-dive-grid-item")).toHaveLength(4);
      expect(screen.getByText("Four entry points")).toBeInTheDocument();
      expect(screen.queryByText("Read guide")).not.toBeInTheDocument();
      const grid = screen.getByTestId("hub-deep-dive-grid").querySelector(".grid");
      expect(grid?.className).toContain("lg:grid-cols-4");
    });
  });
});
