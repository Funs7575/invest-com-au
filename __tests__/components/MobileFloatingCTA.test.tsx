import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, act } from "@testing-library/react";
import { render, screen } from "./setup";
import type { Broker } from "@/lib/types";

vi.mock("@/lib/tracking", () => ({
  getAffiliateLink: (b: Broker) => `https://aff.example.com/${b.slug}`,
  getBenefitCta: () => "Open Account",
  trackClick: vi.fn(),
  AFFILIATE_REL: "noopener noreferrer sponsored",
  renderStars: () => "★★★★★",
}));

vi.mock("@/components/BrokerLogo", () => ({
  default: () => <div data-testid="broker-logo" />,
}));

import MobileFloatingCTA from "@/components/MobileFloatingCTA";

function makeBroker(over: Partial<Broker>): Broker {
  return {
    slug: "vanguard",
    name: "Vanguard",
    rating: 4.5,
    ...over,
  } as unknown as Broker;
}

describe("MobileFloatingCTA — visibility", () => {
  beforeEach(() => {
    window.scrollY = 0;
  });

  it("renders nothing on initial scroll position (< 800px)", () => {
    const { container } = render(
      <MobileFloatingCTA broker={makeBroker({})} pagePath="/broker/vanguard" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders after scrolling past 800px", () => {
    const { container } = render(
      <MobileFloatingCTA broker={makeBroker({})} pagePath="/broker/vanguard" />,
    );
    act(() => {
      window.scrollY = 900;
      fireEvent.scroll(window);
    });
    expect(container.firstElementChild).not.toBeNull();
  });
});

describe("MobileFloatingCTA — content", () => {
  beforeEach(() => {
    window.scrollY = 1000;
  });

  it("renders broker name + rating + FX rate when supplied", () => {
    render(
      <MobileFloatingCTA
        broker={makeBroker({ name: "Vanguard", rating: 4.7, fx_rate: 0.4 })}
        pagePath="/broker/vanguard"
      />,
    );
    act(() => fireEvent.scroll(window));
    expect(screen.getByText("Vanguard")).toBeInTheDocument();
    expect(screen.getByText(/4\.7\/5/)).toBeInTheDocument();
    expect(screen.getByText(/0\.4% FX/)).toBeInTheDocument();
  });

  it("omits FX percentage when fx_rate is null", () => {
    render(
      <MobileFloatingCTA
        broker={makeBroker({ fx_rate: undefined })}
        pagePath="/broker/vanguard"
      />,
    );
    act(() => fireEvent.scroll(window));
    expect(screen.queryByText(/% FX/)).not.toBeInTheDocument();
  });
});
