import { describe, it, expect } from "vitest";
import { render, screen, within } from "./setup";
import HubFAQ from "@/components/HubFAQ";
import type { FaqItem } from "@/components/HubFAQ";

const baseItems: FaqItem[] = [
  {
    q: "Can foreigners invest in Australia?",
    a: "Yes. Non-residents can invest in Australian shares, crypto, savings accounts, and some property.",
  },
  {
    q: "Do non-residents pay tax in Australia?",
    a: "Non-residents pay Australian tax only on income sourced in Australia.",
  },
  {
    q: "What is the withholding tax rate for foreign investors?",
    a: "Withholding tax rates are: unfranked dividends 30% (or lower under a DTA).",
  },
];

describe("HubFAQ", () => {
  describe("returns null when empty", () => {
    it("renders nothing when items is an empty array", () => {
      const { container } = render(
        <HubFAQ items={[]} heading="Frequently asked questions" />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe("section structure", () => {
    it("renders the section with data-testid=hub-faq", () => {
      render(<HubFAQ items={baseItems} heading="FAQs" />);
      expect(screen.getByTestId("hub-faq")).toBeInTheDocument();
    });

    it("applies the default slate background when no className override", () => {
      render(<HubFAQ items={baseItems} heading="FAQs" />);
      const section = screen.getByTestId("hub-faq");
      expect(section.className).toContain("bg-slate-50");
    });

    it("applies a custom className override", () => {
      render(
        <HubFAQ
          items={baseItems}
          heading="FAQs"
          className="py-12 bg-white"
        />
      );
      const section = screen.getByTestId("hub-faq");
      expect(section.className).toContain("bg-white");
      expect(section.className).not.toContain("bg-slate-50");
    });
  });

  describe("heading and eyebrow", () => {
    it("renders the heading as an h2", () => {
      render(
        <HubFAQ items={baseItems} heading="Frequently asked questions" />
      );
      const h2 = screen.getByRole("heading", { level: 2 });
      expect(h2).toHaveTextContent("Frequently asked questions");
    });

    it("renders the default 'FAQ' eyebrow when no eyebrow prop is given", () => {
      render(<HubFAQ items={baseItems} heading="FAQs" />);
      expect(screen.getByText("FAQ")).toBeInTheDocument();
    });

    it("renders a custom eyebrow when provided", () => {
      render(
        <HubFAQ
          items={baseItems}
          heading="FAQs"
          eyebrow="Common questions"
        />
      );
      expect(screen.getByText("Common questions")).toBeInTheDocument();
    });
  });

  describe("accordion items", () => {
    it("renders one <details> element per item", () => {
      render(<HubFAQ items={baseItems} heading="FAQs" />);
      expect(
        screen.getAllByTestId("hub-faq-item")
      ).toHaveLength(3);
    });

    it("renders each question in a summary element", () => {
      render(<HubFAQ items={baseItems} heading="FAQs" />);
      const questions = screen.getAllByTestId("hub-faq-question");
      const texts = questions.map((el) => el.textContent);
      expect(texts.some((t) => t?.includes("Can foreigners invest"))).toBe(true);
      expect(texts.some((t) => t?.includes("Do non-residents pay tax"))).toBe(true);
    });

    it("renders each answer in the disclosure panel", () => {
      render(<HubFAQ items={baseItems} heading="FAQs" />);
      expect(
        screen.getByText(/Non-residents can invest in Australian shares/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/income sourced in Australia/)
      ).toBeInTheDocument();
    });

    it("each item is a <details> element", () => {
      render(<HubFAQ items={baseItems} heading="FAQs" />);
      const items = screen.getAllByTestId("hub-faq-item");
      for (const item of items) {
        expect(item.tagName.toLowerCase()).toBe("details");
      }
    });

    it("each question is rendered inside a <summary> element", () => {
      render(<HubFAQ items={baseItems} heading="FAQs" />);
      const questions = screen.getAllByTestId("hub-faq-question");
      for (const q of questions) {
        expect(q.tagName.toLowerCase()).toBe("summary");
      }
    });
  });

  describe("item isolation", () => {
    it("each item's answer is scoped to its own panel", () => {
      render(<HubFAQ items={baseItems} heading="FAQs" />);
      const items = screen.getAllByTestId("hub-faq-item");
      const firstItem = within(items[0]!);
      expect(
        firstItem.getByText(/Non-residents can invest in Australian shares/)
      ).toBeInTheDocument();
      expect(
        firstItem.queryByText(/income sourced in Australia/)
      ).not.toBeInTheDocument();
    });
  });

  describe("JSON-LD schema", () => {
    it("emits a <script type='application/ld+json'> when items are provided", () => {
      const { container } = render(
        <HubFAQ items={baseItems} heading="FAQs" />
      );
      const scripts = container.querySelectorAll(
        "script[type='application/ld+json']"
      );
      expect(scripts.length).toBeGreaterThan(0);
    });

    it("the JSON-LD contains @type FAQPage", () => {
      const { container } = render(
        <HubFAQ items={baseItems} heading="FAQs" />
      );
      const script = container.querySelector(
        "script[type='application/ld+json']"
      );
      const parsed = JSON.parse(script?.textContent ?? "{}");
      expect(parsed["@type"]).toBe("FAQPage");
    });

    it("the JSON-LD mainEntity length matches items length", () => {
      const { container } = render(
        <HubFAQ items={baseItems} heading="FAQs" />
      );
      const script = container.querySelector(
        "script[type='application/ld+json']"
      );
      const parsed = JSON.parse(script?.textContent ?? "{}");
      expect(parsed.mainEntity).toHaveLength(3);
    });

    it("each mainEntity entry has the correct question text", () => {
      const { container } = render(
        <HubFAQ items={baseItems} heading="FAQs" />
      );
      const script = container.querySelector(
        "script[type='application/ld+json']"
      );
      const parsed = JSON.parse(script?.textContent ?? "{}");
      const names: string[] = parsed.mainEntity.map(
        (e: { name: string }) => e.name
      );
      expect(names).toContain("Can foreigners invest in Australia?");
    });

    it("does NOT emit a script when items is empty", () => {
      const { container } = render(
        <HubFAQ items={[]} heading="FAQs" />
      );
      const scripts = container.querySelectorAll(
        "script[type='application/ld+json']"
      );
      expect(scripts.length).toBe(0);
    });
  });

  describe("foreign-investment page parity", () => {
    it("renders all 3 base items faithfully with correct text", () => {
      render(
        <HubFAQ
          items={baseItems}
          heading="Frequently asked questions"
          eyebrow="Common questions"
        />
      );
      expect(
        screen.getByRole("heading", { level: 2 })
      ).toHaveTextContent("Frequently asked questions");
      expect(screen.getAllByTestId("hub-faq-item")).toHaveLength(3);
    });

    it("renders a single-item FAQ correctly", () => {
      render(
        <HubFAQ
          items={[{ q: "What is SMSF?", a: "A Self-Managed Super Fund." }]}
          heading="SMSF FAQs"
        />
      );
      expect(screen.getAllByTestId("hub-faq-item")).toHaveLength(1);
      expect(screen.getByText("What is SMSF?")).toBeInTheDocument();
      expect(
        screen.getByText("A Self-Managed Super Fund.")
      ).toBeInTheDocument();
    });
  });
});
