import { describe, it, expect, vi } from "vitest";
import { render, screen } from "./setup";

vi.mock("@/components/BrokerLogo", () => ({
  default: ({ broker }: { broker: { name: string } }) => (
    <span data-testid="broker-logo">{broker.name}</span>
  ),
}));

import ArticleSidebar from "@/components/ArticleSidebar";
import type { Broker } from "@/lib/types";

function makeBroker(over: Partial<Broker>): Broker {
  return {
    slug: "acme",
    name: "Acme Broker",
    rating: 4.5,
    affiliate_url: "https://acme.example/aff",
    ...over,
  } as Broker;
}

describe("ArticleSidebar", () => {
  it("renders 'Top Pick' badge and broker name", () => {
    render(
      <ArticleSidebar broker={makeBroker({})} pagePath="/article/foo" />,
    );
    expect(screen.getByText("Top Pick")).toBeInTheDocument();
    // "Acme Broker" appears in both the logo stub and the brand
    // heading — assert it shows in at least one.
    expect(screen.getAllByText("Acme Broker").length).toBeGreaterThan(0);
  });

  it("renders the broker logo via the BrokerLogo component", () => {
    render(
      <ArticleSidebar broker={makeBroker({})} pagePath="/article/foo" />,
    );
    expect(screen.getByTestId("broker-logo")).toBeInTheDocument();
  });

  it("renders the broker tagline when supplied", () => {
    render(
      <ArticleSidebar
        broker={makeBroker({ tagline: "Best for beginners" })}
        pagePath="/article/foo"
      />,
    );
    expect(screen.getByText("Best for beginners")).toBeInTheDocument();
  });

  it("omits the tagline section when not supplied", () => {
    render(
      <ArticleSidebar broker={makeBroker({})} pagePath="/article/foo" />,
    );
    expect(screen.queryByText("Best for beginners")).not.toBeInTheDocument();
  });

  it("renders FX Fee row only when fx_rate is set", () => {
    render(
      <ArticleSidebar
        broker={makeBroker({ fx_rate: 0.5 })}
        pagePath="/article/foo"
      />,
    );
    expect(screen.getByText("FX Fee")).toBeInTheDocument();
    expect(screen.getByText("0.50%")).toBeInTheDocument();
  });

  it("omits FX Fee row when fx_rate is null", () => {
    render(
      <ArticleSidebar
        broker={makeBroker({ fx_rate: undefined })}
        pagePath="/article/foo"
      />,
    );
    expect(screen.queryByText("FX Fee")).not.toBeInTheDocument();
  });

  it("renders the US Trades row only when us_fee is set", () => {
    render(
      <ArticleSidebar
        broker={makeBroker({ us_fee: "US$5" })}
        pagePath="/article/foo"
      />,
    );
    expect(screen.getByText("US Trades")).toBeInTheDocument();
    expect(screen.getByText("US$5")).toBeInTheDocument();
  });

  it("renders CHESS=Yes when chess_sponsored is true", () => {
    render(
      <ArticleSidebar
        broker={makeBroker({ chess_sponsored: true })}
        pagePath="/article/foo"
      />,
    );
    expect(screen.getByText("CHESS")).toBeInTheDocument();
    expect(screen.getByText("Yes")).toBeInTheDocument();
  });

  it("renders CHESS=No when chess_sponsored is false", () => {
    render(
      <ArticleSidebar
        broker={makeBroker({ chess_sponsored: false })}
        pagePath="/article/foo"
      />,
    );
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("renders the Open Account affiliate CTA with target=_blank", () => {
    render(
      <ArticleSidebar broker={makeBroker({})} pagePath="/article/foo" />,
    );
    const cta = screen.getByRole("link", { name: /Open Account/ });
    expect(cta).toHaveAttribute("target", "_blank");
    expect(cta.getAttribute("rel")).toMatch(/nofollow|sponsored|noopener/);
  });

  it("renders the 'Read Full Review' link to /broker/<slug>", () => {
    render(
      <ArticleSidebar
        broker={makeBroker({ slug: "acme" })}
        pagePath="/article/foo"
      />,
    );
    expect(
      screen.getByRole("link", { name: "Read Full Review" }),
    ).toHaveAttribute("href", "/broker/acme");
  });

  it("renders the advisor-prompt callout linking to /find-advisor", () => {
    render(
      <ArticleSidebar broker={makeBroker({})} pagePath="/article/foo" />,
    );
    expect(
      screen.getByRole("link", { name: /Need professional advice/ }),
    ).toHaveAttribute("href", "/find-advisor");
  });

  it("renders the 'Learn more' compliance link in the disclaimer", () => {
    render(
      <ArticleSidebar broker={makeBroker({})} pagePath="/article/foo" />,
    );
    expect(
      screen.getByRole("link", { name: "Learn more" }),
    ).toHaveAttribute("href", "/how-we-earn");
  });

  describe("rating star renderer", () => {
    it("renders 5 star elements regardless of rating", () => {
      const { container } = render(
        <ArticleSidebar
          broker={makeBroker({ rating: 3.7 })}
          pagePath="/article/foo"
        />,
      );
      // Filled (★), half (½), and empty (★ in slate) all live inside the
      // rating <span>. Count the leaf spans inside it.
      const ratingSpan = container.querySelector(".text-sm");
      const leafSpans = ratingSpan?.querySelectorAll("span") ?? [];
      expect(leafSpans.length).toBe(5);
    });

    it("defaults rating to 0 when broker.rating is null/undefined", () => {
      const { container } = render(
        <ArticleSidebar
          broker={makeBroker({ rating: undefined })}
          pagePath="/article/foo"
        />,
      );
      // 0 → all 5 should be the empty slate-300 colour.
      const ratingSpan = container.querySelector(".text-sm");
      const filled =
        ratingSpan?.querySelectorAll(".text-amber") ?? [];
      expect(filled.length).toBe(0);
    });
  });
});
