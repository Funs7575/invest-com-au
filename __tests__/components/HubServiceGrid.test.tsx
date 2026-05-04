import { describe, it, expect } from "vitest";
import { render, screen, within } from "./setup";
import HubServiceGrid from "@/components/HubServiceGrid";
import type { HubServiceItem } from "@/components/HubServiceGrid";

const baseItems: HubServiceItem[] = [
  {
    title: "Setup & Administration",
    icon: "building",
    description: "SMSF establishment and trust deed.",
    href: "/advisors/smsf-specialists",
    cta: "Find SMSF Specialists",
  },
  {
    title: "Annual Auditing",
    icon: "shield-check",
    description: "Every SMSF must be audited annually.",
    href: "/smsf/auditors",
    cta: "Find SMSF Auditors",
  },
];

describe("HubServiceGrid", () => {
  describe("section structure", () => {
    it("renders the section with data-testid=hub-service-grid", () => {
      render(<HubServiceGrid heading="Four services" items={baseItems} />);
      expect(screen.getByTestId("hub-service-grid")).toBeInTheDocument();
    });

    it("renders the heading as an h2", () => {
      render(<HubServiceGrid heading="Four services" items={baseItems} />);
      const h2 = screen.getByRole("heading", { level: 2 });
      expect(h2).toHaveTextContent("Four services");
    });

    it("renders one card per item", () => {
      render(<HubServiceGrid heading="Services" items={baseItems} />);
      expect(screen.getAllByTestId("hub-service-grid-item")).toHaveLength(2);
    });

    it("renders nothing when items is empty (no cards)", () => {
      render(<HubServiceGrid heading="Services" items={[]} />);
      expect(screen.queryAllByTestId("hub-service-grid-item")).toHaveLength(0);
    });
  });

  describe("card content", () => {
    it("renders each item title as an h3", () => {
      render(<HubServiceGrid heading="Services" items={baseItems} />);
      const headings = screen.getAllByRole("heading", { level: 3 });
      const titles = headings.map((h) => h.textContent);
      expect(titles).toContain("Setup & Administration");
      expect(titles).toContain("Annual Auditing");
    });

    it("renders each item description", () => {
      render(<HubServiceGrid heading="Services" items={baseItems} />);
      expect(screen.getByText("SMSF establishment and trust deed.")).toBeInTheDocument();
      expect(screen.getByText("Every SMSF must be audited annually.")).toBeInTheDocument();
    });

    it("renders each item CTA text", () => {
      render(<HubServiceGrid heading="Services" items={baseItems} />);
      expect(screen.getByText("Find SMSF Specialists")).toBeInTheDocument();
      expect(screen.getByText("Find SMSF Auditors")).toBeInTheDocument();
    });

    it("links each card to the configured href", () => {
      render(<HubServiceGrid heading="Services" items={baseItems} />);
      const cards = screen.getAllByTestId("hub-service-grid-item");
      expect(cards[0]).toHaveAttribute("href", "/advisors/smsf-specialists");
      expect(cards[1]).toHaveAttribute("href", "/smsf/auditors");
    });

    it("each card is a link element", () => {
      render(<HubServiceGrid heading="Services" items={baseItems} />);
      const cards = screen.getAllByTestId("hub-service-grid-item");
      for (const card of cards) {
        expect(card.tagName.toLowerCase()).toBe("a");
      }
    });
  });

  describe("grid columns", () => {
    it("defaults to 2-column grid (md:grid-cols-2)", () => {
      render(<HubServiceGrid heading="Services" items={baseItems} />);
      const grid = screen.getByTestId("hub-service-grid").querySelector(".grid");
      expect(grid?.className).toContain("md:grid-cols-2");
      expect(grid?.className).not.toContain("lg:grid-cols-3");
    });

    it("renders 3-column grid when columns=3 is set", () => {
      render(<HubServiceGrid heading="Services" items={baseItems} columns={3} />);
      const grid = screen.getByTestId("hub-service-grid").querySelector(".grid");
      expect(grid?.className).toContain("lg:grid-cols-3");
    });

    it("2-col grid does not include lg:grid-cols-3", () => {
      render(<HubServiceGrid heading="Services" items={baseItems} columns={2} />);
      const grid = screen.getByTestId("hub-service-grid").querySelector(".grid");
      expect(grid?.className).not.toContain("lg:grid-cols-3");
    });
  });

  describe("card isolation", () => {
    it("each card contains its own title, description, and cta", () => {
      render(<HubServiceGrid heading="Services" items={baseItems} />);
      const cards = screen.getAllByTestId("hub-service-grid-item");
      const firstCard = cards[0]!;
      expect(within(firstCard).getByRole("heading", { level: 3 })).toHaveTextContent(
        "Setup & Administration",
      );
      expect(
        within(firstCard).getByText("SMSF establishment and trust deed."),
      ).toBeInTheDocument();
      expect(within(firstCard).getByText("Find SMSF Specialists")).toBeInTheDocument();
    });
  });

  describe("theming", () => {
    it("applies the default bg-white section style when no className override", () => {
      render(<HubServiceGrid heading="Services" items={baseItems} />);
      const section = screen.getByTestId("hub-service-grid");
      expect(section.className).toContain("bg-white");
    });

    it("allows overriding the section className", () => {
      render(
        <HubServiceGrid
          heading="Services"
          items={baseItems}
          className="py-16 bg-slate-50"
        />,
      );
      const section = screen.getByTestId("hub-service-grid");
      expect(section.className).toContain("bg-slate-50");
      expect(section.className).not.toContain("bg-white");
    });
  });

  describe("/smsf page parity", () => {
    it("renders the smsf four-card shape end-to-end", () => {
      const smsfItems: HubServiceItem[] = [
        {
          title: "Setup & Administration",
          icon: "building",
          description:
            "SMSF establishment, trust deed, ongoing administration, and annual lodgement.",
          href: "/advisors/smsf-specialists",
          cta: "Find SMSF Specialists",
        },
        {
          title: "Annual Auditing",
          icon: "shield-check",
          description:
            "Every SMSF must be audited annually by an ASIC-approved auditor.",
          href: "/smsf/auditors",
          cta: "Find SMSF Auditors",
        },
        {
          title: "Property in SMSF",
          icon: "home",
          description: "LRBA borrowing structures and in-specie transfers.",
          href: "/advisors/smsf-specialists?focus=property",
          cta: "Find SMSF Property Experts",
        },
        {
          title: "Investment Strategy",
          icon: "trending-up",
          description:
            "Written investment strategy review and asset allocation.",
          href: "/advisors/smsf-specialists",
          cta: "Find Strategy Advisers",
        },
      ];
      render(
        <HubServiceGrid heading="Four SMSF service categories" items={smsfItems} />,
      );
      expect(screen.getAllByTestId("hub-service-grid-item")).toHaveLength(4);
      expect(screen.getByText("Four SMSF service categories")).toBeInTheDocument();
      expect(screen.getByText("Find SMSF Auditors")).toBeInTheDocument();
      expect(screen.getByText("Find SMSF Property Experts")).toBeInTheDocument();
    });
  });
});
