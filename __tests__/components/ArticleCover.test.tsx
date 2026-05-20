import { describe, it, expect, vi } from "vitest";
import { render, screen } from "./setup";

// blurDataURL is only used by next/image — the mock in setup.tsx
// strips the prop, so we can leave the real helper alone. Mock it
// to keep tests independent from any future helper churn.
vi.mock("@/lib/image-blur", () => ({
  blurDataURL: () => "data:image/png;base64,fakeblur",
}));

import ArticleCover from "@/components/ArticleCover";

describe("ArticleCover", () => {
  describe("with a real cover image", () => {
    it("renders the image with the title as alt text", () => {
      render(
        <ArticleCover
          title="The Best ETFs of 2026"
          coverImageUrl="/img/etf-hero.jpg"
        />,
      );
      const img = screen.getByAltText("The Best ETFs of 2026");
      expect(img).toHaveAttribute("src", "/img/etf-hero.jpg");
    });

    it("does NOT render the gradient overlay label when an image is present", () => {
      render(
        <ArticleCover
          title="The Best ETFs of 2026"
          coverImageUrl="/img/etf-hero.jpg"
          category="etfs"
        />,
      );
      // Category label "ETFs" should not appear over the real cover.
      expect(screen.queryByText("ETFs")).not.toBeInTheDocument();
    });

    it("uses the provided sizes override when supplied", () => {
      render(
        <ArticleCover
          title="x"
          coverImageUrl="/img/x.jpg"
          sizes="(max-width: 1024px) 50vw, 33vw"
        />,
      );
      const img = screen.getByAltText("x");
      expect(img).toHaveAttribute("sizes", "(max-width: 1024px) 50vw, 33vw");
    });

    it("falls back to default sizes when none is supplied", () => {
      render(<ArticleCover title="x" coverImageUrl="/img/x.jpg" />);
      const img = screen.getByAltText("x");
      expect(img).toHaveAttribute(
        "sizes",
        "(max-width: 768px) 100vw, 800px",
      );
    });
  });

  describe("placeholder gradient fallback (no cover image)", () => {
    it("renders the category label when a known category is supplied", () => {
      render(<ArticleCover title="Tax tips" category="tax" />);
      expect(screen.getByText("Tax")).toBeInTheDocument();
      expect(screen.getByText("Tax tips")).toBeInTheDocument();
    });

    it("renders the title only when no category is supplied", () => {
      render(<ArticleCover title="Just a title" />);
      expect(screen.getByText("Just a title")).toBeInTheDocument();
      // No category label should appear.
      expect(screen.queryByText("Tax")).not.toBeInTheDocument();
    });

    it("renders no category label for an unknown category", () => {
      render(
        <ArticleCover title="Unknown Cat" category="not-a-real-cat" />,
      );
      expect(screen.getByText("Unknown Cat")).toBeInTheDocument();
    });

    it("hides the gradient overlay container from assistive tech (aria-hidden)", () => {
      const { container } = render(
        <ArticleCover title="x" category="tax" />,
      );
      const overlay = container.querySelector("[aria-hidden='true']");
      expect(overlay).not.toBeNull();
    });
  });

  describe("variants", () => {
    it("default variant (card) uses the 16/9 aspect ratio", () => {
      const { container } = render(
        <ArticleCover title="x" />,
      );
      expect(container.firstElementChild?.className).toContain(
        "aspect-[16/9]",
      );
    });

    it("detail variant uses the 2/1 (md: 5/2) aspect ratio", () => {
      const { container } = render(
        <ArticleCover title="x" variant="detail" />,
      );
      const cls = container.firstElementChild?.className ?? "";
      expect(cls).toContain("aspect-[2/1]");
      expect(cls).toContain("md:aspect-[5/2]");
    });

    it("detail variant uses the larger overlay font sizes", () => {
      const { container } = render(
        <ArticleCover title="Detail title" variant="detail" />,
      );
      // The overlay <p> for the title should carry the detail size.
      const titleP = Array.from(container.querySelectorAll("p")).find((p) =>
        p.textContent?.includes("Detail title"),
      );
      expect(titleP?.className).toContain("text-3xl");
      expect(titleP?.className).toContain("md:text-5xl");
    });
  });

  describe("gradient selection", () => {
    it("uses the etfs gradient for the 'etfs' category", () => {
      const { container } = render(
        <ArticleCover title="x" category="etfs" />,
      );
      expect(container.firstElementChild?.className).toContain("indigo-100");
    });

    it("uses the default gradient when category is missing", () => {
      const { container } = render(<ArticleCover title="x" />);
      const cls = container.firstElementChild?.className ?? "";
      expect(cls).toContain("amber-50");
      expect(cls).toContain("emerald-50");
    });

    it("uses the default gradient for an unknown category", () => {
      const { container } = render(
        <ArticleCover title="x" category="unknown-x" />,
      );
      expect(container.firstElementChild?.className).toContain("amber-50");
    });
  });
});
